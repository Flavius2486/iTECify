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

function broadcastToRoom(room_id, payload, exclude = null) {
    const clients = roomClients.get(room_id);
    if (!clients) return;
    const msg = JSON.stringify(payload);
    for (const client of clients) {
        if (client !== exclude && client.readyState === 1 /* OPEN */) {
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
                        }, 3000);
                    });
                }
            });
        }
        else if (route === 'collab' && !file_id) {
            // ==========================================
            // 2. CANAL ROOM – sincronizare listă fișiere
            // Conectare: ws://host/collab/:roomId
            // Evenimente primite:  { action: 'file_created', file: {...} }
            //                      { action: 'file_deleted', fileId: '...' }
            // Evenimente trimise:  același format către toți ceilalți din cameră
            // ==========================================
            if (!roomClients.has(room_id)) roomClients.set(room_id, new Set());
            roomClients.get(room_id).add(conn);

            conn.on('message', (message) => {
                try {
                    const payload = JSON.parse(message);
                    // Rebroadcast la toți ceilalți din cameră
                    if (payload.action === 'file_created' || payload.action === 'file_deleted') {
                        broadcastToRoom(room_id, payload, conn);
                    }
                } catch (_) {}
            });

            conn.on('close', () => {
                roomClients.get(room_id)?.delete(conn);
                if (roomClients.get(room_id)?.size === 0) roomClients.delete(room_id);
            });
        }
        else if (route === 'execute') {
            // ==========================================
            // 3. EXECUȚIE COD (Sandboxing Docker)
            // Conectare: ws://host/execute/:roomId
            // Mesaj: { action: 'run', language: 'nodejs'|'python', fileId: '...' }
            // ==========================================
            conn.on('message', async (message) => {
                try {
                    const payload = JSON.parse(message);
                    if (payload.action === 'run') {
                        await handleDockerExecution(conn, payload.fileId || room_id, payload.language);
                    }
                } catch (_) {
                    conn.send(JSON.stringify({ type: 'error', data: 'Invalid message format.' }));
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
// SANDBOXING DOCKER
// ------------------------------------------------------------------
async function handleDockerExecution(ws, file_id, language) {
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

        if (code.includes('require("child_process")') || code.includes('os.system')) {
            ws.send(JSON.stringify({ type: 'error', data: '🔒 Securitate: Execuția de comenzi sistem este interzisă!' }));
            return;
        }

        ws.send(JSON.stringify({ type: 'info', data: 'Vulnerabilități verificate. Pregătesc containerul Docker...\n' }));

        const tempDir = path.resolve('./temp_exec');
        await fs.mkdir(tempDir, { recursive: true });

        const fileHash = crypto.randomUUID();
        const extensions = { nodejs: 'js', python: 'py', rust: 'rs' };
        const ext = extensions[language] || 'txt';
        const filePath = path.join(tempDir, `${fileHash}.${ext}`);

        await fs.writeFile(filePath, code);

        const dockerImage = language === 'nodejs' ? 'node:18-alpine' : 'python:3.10-alpine';
        const runCmd = language === 'nodejs' ? 'node' : 'python';

        const dockerArgs = [
            'run', '--rm',
            '-m', '128m',
            '--network', 'none',
            '-v', `${tempDir}:/usr/src/app`,
            dockerImage,
            runCmd, `/usr/src/app/${fileHash}.${ext}`,
        ];

        const dockerProcess = spawn('docker', dockerArgs);

        dockerProcess.stdout.on('data', (data) => ws.send(JSON.stringify({ type: 'stdout', data: data.toString() })));
        dockerProcess.stderr.on('data', (data) => ws.send(JSON.stringify({ type: 'stderr', data: data.toString() })));

        dockerProcess.on('close', async (exitCode) => {
            ws.send(JSON.stringify({ type: 'info', data: `\nContainer terminat cu status: ${exitCode}.` }));
            try { await fs.unlink(filePath); } catch (_) {}
        });

    } catch (err) {
        console.error('Docker Execution error:', err);
        ws.send(JSON.stringify({ type: 'error', data: 'Eroare fatală la execuția Docker.' }));
    }
}
