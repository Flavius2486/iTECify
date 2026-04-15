import { WebSocketServer } from 'ws';
import { setupWSConnection, docs } from 'y-websocket/bin/utils';
import supabase from './database/supabase.js';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// roomClients: Map<room_id, Set<WebSocket>>
// Ține evidența conexiunilor de tip "room" pentru broadcast lista fișiere
const roomClients = new Map();

export function broadcastToRoom(room_id, payload, exclude = null) {
    const clients = roomClients.get(room_id);
    if (!clients) return;
    const msg = JSON.stringify(payload);
    for (const client of clients) {
        if (client !== exclude && client.readyState === 1) {
            client.send(msg);
        }
    }
}

export default function setupSockets(server) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (conn, req) => {
        const url = new URL(req.url, 'http://localhost');
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const route = pathSegments[0];
        const room_id = pathSegments[1];
        const file_id = pathSegments[2]; // prezent doar la /collab/:roomId/:fileId

        if (route === 'collab' && file_id) {
            // ==========================================
            // 1. EDITARE COLABORATIVĂ per fișier (CRDT)
            // Conectare: ws://host/collab/:roomId/:fileId
            // ==========================================
            const docName = `${room_id}:${file_id}`;
            setupWSConnection(conn, req, { docName });

            conn.on('close', () => {
                const doc = docs.get(docName);
                if (doc) {
                    if (doc.saveTimer) clearTimeout(doc.saveTimer);
                    saveFileToDatabase(file_id, doc);
                }
            });

            // Atașăm listener de update după ce y-websocket a inițializat doc-ul
            // Folosim un mic delay pentru că setupWSConnection e sincron dar doc-ul
            // poate fi populat async
            setImmediate(() => {
                const doc = docs.get(docName);
                if (doc) {
                    doc.on('update', () => {
                        if (doc.saveTimer) clearTimeout(doc.saveTimer);
                        doc.saveTimer = setTimeout(() => {
                            saveFileToDatabase(file_id, doc);
                        }, 1000);
                    });
                }
            });
        }
        else if (route === 'collab' && !file_id) {
            if (!roomClients.has(room_id)) roomClients.set(room_id, new Set());
            roomClients.get(room_id).add(conn);

            const userId = url.searchParams.get('userId');
            const username = url.searchParams.get('username') || userId;
            if (userId) broadcastToRoom(room_id, { action: 'user_online', userId, username }, conn);

            conn.on('message', (message) => {
                try {
                    const payload = JSON.parse(message);
                    if (
                        payload.action === 'file_created' ||
                        payload.action === 'file_deleted' ||
                        payload.action === 'chat_message' ||
                        payload.action === 'ai_lines_update' ||
                        payload.action === 'user_kicked' ||
                        payload.action === 'admin_changed' ||
                        payload.action === 'user_left'
                    ) {
                        broadcastToRoom(room_id, payload, conn);
                    }
                } catch (_) {}
            });

            conn.on('close', () => {
                roomClients.get(room_id)?.delete(conn);
                if (roomClients.get(room_id)?.size === 0) roomClients.delete(room_id);
                if (userId) broadcastToRoom(room_id, { action: 'user_offline', userId });
            });
        }
        else if (route === 'execute') {
            // processRef e un obiect shared — poate fi setat din interiorul handleDockerExecution
            // înainte ca funcția să returneze
            const processRef = { current: null }

            conn.on('message', async (message) => {
                try {
                    const payload = JSON.parse(message);

                    if (payload.action === 'stop') {
                        if (processRef.current) {
                            processRef.current.kill('SIGKILL')
                            processRef.current = null
                            conn.send(JSON.stringify({ type: 'info', data: '\n■ Execuție oprită de utilizator.' }))
                        }
                        return
                    }

                    if (payload.action === 'run') {
                        if (processRef.current) {
                            processRef.current.kill('SIGKILL')
                            processRef.current = null
                        }
                        await handleDockerExecution(conn, payload.fileId || room_id, payload.language, processRef);
                    }
                } catch (err) {
                    console.error('Execute handler error:', err);
                    conn.send(JSON.stringify({ type: 'error', data: `Eroare: ${err.message}` }));
                }
            });
        }
    });
}

// ------------------------------------------------------------------
// PERSISTENȚĂ SUPABASE – salvează conținutul CRDT al unui fișier
// ------------------------------------------------------------------
async function saveFileToDatabase(file_id, doc) {
    const content = doc.getText('collab-code').toString();
    try {
        const { error } = await supabase
            .from('code_file')
            .update({ content })
            .eq('id', file_id);
        if (error) throw error;
    } catch (err) {
        console.error('CRDT save error:', err);
    }
}

// ------------------------------------------------------------------
// SCANARE STATICĂ DE SECURITATE
// ------------------------------------------------------------------
function scanForVulnerabilities(code, language) {
    const rules = {
        // Comune tuturor limbajelor
        common: [
            { pattern: /require\s*\(\s*['"]child_process['"]\s*\)/, msg: 'Acces child_process interzis' },
            { pattern: /process\.exit/, msg: 'process.exit interzis' },
            { pattern: /eval\s*\(/, msg: 'eval() interzis' },
            { pattern: /Function\s*\(/, msg: 'new Function() interzis' },
        ],
        python: [
            { pattern: /os\.system\s*\(/, msg: 'os.system interzis' },
            { pattern: /subprocess/, msg: 'subprocess interzis' },
            { pattern: /__import__\s*\(\s*['"]os['"]/, msg: 'import os dinamic interzis' },
            { pattern: /open\s*\(.*['"]\s*w/, msg: 'scriere pe disk interzisă' },
            { pattern: /exec\s*\(/, msg: 'exec() interzis' },
        ],
        javascript: [
            { pattern: /require\s*\(\s*['"]fs['"]\s*\)/, msg: 'Acces fs interzis' },
            { pattern: /require\s*\(\s*['"]net['"]\s*\)/, msg: 'Acces net interzis' },
            { pattern: /require\s*\(\s*['"]http['"]\s*\)/, msg: 'Acces http interzis' },
            { pattern: /process\.env/, msg: 'Acces process.env interzis' },
        ],
        rust: [
            { pattern: /std::process::Command/, msg: 'Command execution interzis' },
            { pattern: /std::fs::write/, msg: 'Scriere pe disk interzisă' },
        ],
        cpp: [
            { pattern: /system\s*\(/, msg: 'system() interzis' },
            { pattern: /popen\s*\(/, msg: 'popen() interzis' },
            { pattern: /#include\s*<fstream>/, msg: 'fstream interzis' },
        ],
        c: [
            { pattern: /system\s*\(/, msg: 'system() interzis' },
            { pattern: /popen\s*\(/, msg: 'popen() interzis' },
        ],
    }

    const toCheck = [...(rules.common || []), ...(rules[language] || [])]
    for (const rule of toCheck) {
        if (rule.pattern.test(code)) {
            return { safe: false, reason: rule.msg }
        }
    }
    return { safe: true }
}

// ------------------------------------------------------------------
// SCANARE AI – verifică codul cu Groq înainte de execuție
// ------------------------------------------------------------------
async function aiScanCode(code, language) {
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                max_tokens: 100,
                messages: [
                    {
                        role: 'system',
                        content: 'Ești un analizor de securitate pentru cod. Răspunde DOAR cu JSON: {"safe": true/false, "reason": "motiv scurt"}. Nu adăuga nimic altceva.',
                    },
                    {
                        role: 'user',
                        content: `Analizează acest cod ${language} și verifică dacă conține: bucle infinite evidente, cod malițios, sau operații periculoase. Cod:\n\`\`\`${language}\n${code.slice(0, 2000)}\n\`\`\``,
                    },
                ],
            }),
        });

        if (!response.ok) return { safe: true }; // dacă AI nu răspunde, lăsăm să treacă

        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        const match = content.match(/\{[\s\S]*\}/);
        if (!match) return { safe: true };
        return JSON.parse(match[0]);
    } catch {
        return { safe: true }; // fail open — nu blocăm dacă AI e down
    }
}

// ------------------------------------------------------------------
// SANDBOXING DOCKER
// ------------------------------------------------------------------
async function handleDockerExecution(ws, file_id, language, processRef = { current: null }) {
    try {
        const { data: rows, error: fetchErr } = await supabase
            .from('code_file')
            .select('content')
            .eq('id', file_id)
            .limit(1);

        if (fetchErr) throw fetchErr;

        if (!rows || rows.length === 0) {
            ws.send(JSON.stringify({ type: 'error', data: 'Nu s-a găsit codul fișierului.' }));
            return;
        }

        const code = rows[0].content;

        ws.send(JSON.stringify({ type: 'info', data: `Pornesc containerul pentru ${language}...\n` }));

        // Configurare per limbaj
        const LANG_CONFIG = {            javascript: { image: 'node:18-alpine',     ext: 'js',  cmd: (f) => ['node', f] },
            typescript: { image: 'node:18-alpine',     ext: 'ts',  cmd: (f) => ['npx', '--yes', 'tsx', f] },
            python:     { image: 'python:3.11-alpine', ext: 'py',  cmd: (f) => ['python', f] },
            cpp:        { image: 'gcc:13',             ext: 'cpp', cmd: (f) => ['sh', '-c', `g++ -o /tmp/out ${f} && /tmp/out`] },
            c:          { image: 'gcc:13',             ext: 'c',   cmd: (f) => ['sh', '-c', `gcc -o /tmp/out ${f} && /tmp/out`] },
            rust:       { image: 'rust:1.78-alpine',   ext: 'rs',  cmd: (f) => ['sh', '-c', `rustc ${f} -o /tmp/out && /tmp/out`] },
            go:         { image: 'golang:1.22-alpine', ext: 'go',  cmd: (f) => ['go', 'run', f] },
        };

        const lang = LANG_CONFIG[language] || LANG_CONFIG['python'];

        const tempDir = path.resolve('./temp_exec');
        await fs.mkdir(tempDir, { recursive: true });

        const fileHash = crypto.randomUUID();
        const filePath = path.join(tempDir, `${fileHash}.${lang.ext}`);
        const containerFile = `/usr/src/app/${fileHash}.${lang.ext}`;

        await fs.writeFile(filePath, code);

        const dockerArgs = [
            'run', '--rm',
            '--memory', '64m',
            '--memory-swap', '64m',   // dezactivează swap — OOM killer oprește imediat
            '--cpus', '0.5',
            '--pids-limit', '50',     // max 50 procese — previne fork bombs
            '--network', 'none',
            '-v', `${tempDir}:/usr/src/app`,
            lang.image,
            ...lang.cmd(containerFile),
        ];

        // Timeout 10s — suficient pentru cod normal, omoară buclele infinite rapid
        const dockerProcess = spawn('docker', dockerArgs);
        processRef.current = dockerProcess;

        const timeout = setTimeout(() => {
            dockerProcess.kill('SIGKILL')
            ws.send(JSON.stringify({ type: 'error', data: '\n⏱ Timeout: execuția a depășit 10 secunde.' }))
        }, 10000);

        // Limită output 256KB
        let totalOutput = 0;
        const OUTPUT_LIMIT = 256 * 1024;

        dockerProcess.stdout.on('data', (data) => {
            totalOutput += data.length;
            if (totalOutput > OUTPUT_LIMIT) {
                dockerProcess.kill('SIGKILL');
                ws.send(JSON.stringify({ type: 'error', data: '\n🔒 Output limitat: prea mult output generat (posibilă buclă infinită).' }));
                return;
            }
            ws.send(JSON.stringify({ type: 'stdout', data: data.toString() }));
        });
        dockerProcess.stderr.on('data', (data) => ws.send(JSON.stringify({ type: 'stderr', data: data.toString() })));

        dockerProcess.on('close', async (exitCode) => {
            clearTimeout(timeout);
            processRef.current = null;
            ws.send(JSON.stringify({ type: 'info', data: `\n— Container terminat cu status: ${exitCode} —` }));
            try { await fs.unlink(filePath); } catch (_) {}
        });

        return dockerProcess;

    } catch (err) {
        console.error('Docker Execution error:', err);
        ws.send(JSON.stringify({ type: 'error', data: 'Eroare fatală la execuția Docker.' }));
        processRef.current = null;
        return null;
    }
}
