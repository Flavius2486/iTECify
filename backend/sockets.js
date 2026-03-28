import { WebSocketServer } from 'ws';
import { setupWSConnection, docs } from 'y-websocket/bin/utils';
import db from './database/db.js'; 
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export default function setupSockets(server) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (conn, req) => {
        const url = new URL(req.url, 'http://localhost');
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const route = pathSegments[0]; // /collab sau /execute
        const room_id = pathSegments[1]; // Acum folosim ROOM_ID în loc de chat_id

        if (route === 'collab') {
            // ==========================================
            // 1. WEBSOCKET COLABORARE Multi-Cursor (CRDT)
            // ==========================================
            setupWSConnection(conn, req, { docName: room_id });

            const doc = docs.get(room_id);
            if (doc) {
                doc.on('update', (update, origin) => {
                    // Sistemul DEBOUNCE pentru protecția Bazei de Date (salvează la 3 secunde după oprirea tastării)
                    if (doc.saveTimer) clearTimeout(doc.saveTimer);
                    doc.saveTimer = setTimeout(() => {
                        saveToDatabase(room_id, doc);
                    }, 3000); 
                });
            }

            conn.on('close', () => {
                 if (doc) {
                     if (doc.saveTimer) clearTimeout(doc.saveTimer);
                     saveToDatabase(room_id, doc);
                 }
            });
        } 
        else if (route === 'execute') {
            // ==========================================
            // 2. WEBSOCKET PENTRU EXECUȚIE (Sandboxing DOCKER)
            // ==========================================
            conn.on('message', async (message) => {
                const payload = JSON.parse(message);
                if (payload.action === 'run') {
                    await handleDockerExecution(conn, room_id, payload.language);
                }
            });
        }
    });
}

// ------------------------------------------------------------------
// SISTEMUL DE BAZĂ DE DATE (UPDATAT PENTRU NOUA STRUCTURĂ: rooms / code_file)
// ------------------------------------------------------------------
async function saveToDatabase(room_id, doc) {
    const currentCode = doc.getText('collab-code').toString();
    const fileName = 'main.js'; 

    try {
        // Căutăm codul curent legat de acea cameră in DOAR in noul tabel `code_file`
        const [existing] = await db.query('SELECT id FROM code_file WHERE room_id = ?', [room_id]);

        if (existing && existing.length > 0) {
            // Dacă sala are deja fișier atașat, doar îl suprascriem (UPDATE content)
            await db.query(
                'UPDATE code_file SET content = ?, name = ? WHERE room_id = ?', 
                [currentCode, fileName, room_id]
            );
        } else {
            // Creare Inițială: Fiindcă baza cere FOREIGN KEY pentru created_by, luăm proprietarul camerei
            const [roomData] = await db.query('SELECT created_by FROM room WHERE id = ?', [room_id]);
            
            if (roomData && roomData.length > 0) {
                await db.query(
                    `INSERT INTO code_file (room_id, content, name, language, created_by) 
                     VALUES (?, ?, ?, 'nodejs', ?)`,
                    [room_id, currentCode, fileName, roomData[0].created_by]
                );
            }
        }
    } catch (err) {
        console.error('CRDT Database Persistence error:', err);
    }
}

// ------------------------------------------------------------------
// SISTEMUL DE SANDBOXING & SECURITATE
// ------------------------------------------------------------------
async function handleDockerExecution(ws, room_id, language) {
    try {
        // 1. Luăm codul din noua tabelă (pe bază de room_id)
        const [rows] = await db.query('SELECT content FROM code_file WHERE room_id = ?', [room_id]);
        if (rows.length === 0) {
            ws.send(JSON.stringify({ type: 'error', data: 'Nu s-a găsit cod pentru această cameră.' }));
            return;
        }
        
        const code = rows[0].content;

        // 2. Scanare statică foarte simplificată de securitate
        if (code.includes('require("child_process")') || code.includes('os.system')) {
            ws.send(JSON.stringify({ type: 'error', data: '🔒 Securitate: Execuția de comenzi os sistem este interzisă!' }));
            return;
        }

        ws.send(JSON.stringify({ type: 'info', data: 'Vulnerabilități verificate. Pregătesc containerul Docker...\n' }));

        // 3. Creăm mediul efemer temporar pe disk
        const tempDir = path.resolve('./temp_exec');
        await fs.mkdir(tempDir, { recursive: true });
        
        const fileHash = crypto.randomUUID();
        const extensions = { 'nodejs': 'js', 'python': 'py', 'rust': 'rs' };
        const ext = extensions[language] || 'txt';
        const filePath = path.join(tempDir, `${fileHash}.${ext}`);
        
        await fs.writeFile(filePath, code);

        // 4. Conectăm imaginea DOCKER on-the-fly pe baza limbajului ales
        let dockerImage = language === 'nodejs' ? 'node:18-alpine' : 'python:3.10-alpine';
        let runCmd = language === 'nodejs' ? 'node' : 'python';

        const dockerArgs = [
            'run', '--rm', 
            '-m', '128m', 
            '--network', 'none',
            '-v', `${tempDir}:/usr/src/app`, 
            dockerImage, 
            runCmd, `/usr/src/app/${fileHash}.${ext}`
        ];

        const dockerProcess = spawn('docker', dockerArgs);

        // 5. Trimitem ieșirea la terminal (Stream) către Frontend via WebSocket
        dockerProcess.stdout.on('data', (data) => ws.send(JSON.stringify({ type: 'stdout', data: data.toString() })));
        dockerProcess.stderr.on('data', (data) => ws.send(JSON.stringify({ type: 'stderr', data: data.toString() })));

        dockerProcess.on('close', async (codeStatus) => {
            ws.send(JSON.stringify({ type: 'info', data: `\nContainer terminat cu status: ${codeStatus}.` }));
            // Ștergem fișierul temporar ca să nu poluăm mediul
            try { await fs.unlink(filePath); } catch (e) {}
        });

    } catch (err) {
        console.error('Docker Execution error:', err);
        ws.send(JSON.stringify({ type: 'error', data: 'Eroare fatală la construirea imaginii Docker.' }));
    }
}