import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// Helper: generează un cod de acces unic de 6 caractere
async function generateUniqueJoinCode() {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let code;
    let exists;
    do {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        const [rows] = await db.execute('SELECT id FROM room WHERE join_code = ?', [code]);
        exists = rows.length > 0;
    } while (exists);
    return code;
}

// POST /api/rooms – creare cameră
router.post('/', authMiddleware, async (req, res) => {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name) {
        return res.status(400).json({ message: 'Room name is required' });
    }

    try {
        const joinCode = await generateUniqueJoinCode();
        const roomId = uuidv4();

        await db.execute(
            'INSERT INTO room (id, name, join_code, created_by) VALUES (?, ?, ?, ?)',
            [roomId, name, joinCode, userId]
        );

        await db.execute(
            'INSERT INTO room_participant (room_id, user_id) VALUES (?, ?)',
            [roomId, userId]
        );

        res.status(201).json({
            id: roomId,
            name,
            joinCode,
            createdBy: userId,
            createdAt: new Date().toISOString()
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/rooms/join – intrare în cameră cu codul de acces
router.post('/join', authMiddleware, async (req, res) => {
    const { joinCode } = req.body;
    const userId = req.user.id;

    if (!joinCode) {
        return res.status(400).json({ message: 'Join code is required' });
    }

    try {
        const [rooms] = await db.execute(
            'SELECT id, name, created_by FROM room WHERE join_code = ?',
            [joinCode.toUpperCase()]
        );

        if (rooms.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const room = rooms[0];

        const [existing] = await db.execute(
            'SELECT 1 FROM room_participant WHERE room_id = ? AND user_id = ?',
            [room.id, userId]
        );

        if (existing.length > 0) {
            return res.status(409).json({ message: 'Already a participant in this room' });
        }

        await db.execute(
            'INSERT INTO room_participant (room_id, user_id) VALUES (?, ?)',
            [room.id, userId]
        );

        res.json({
            id: room.id,
            name: room.name,
            joinCode: joinCode.toUpperCase(),
            createdBy: room.created_by
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE /api/rooms/:roomId – ștergere cameră (doar creatorul)
router.delete('/:roomId', authMiddleware, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.id;

    try {
        const [rooms] = await db.execute(
            'SELECT created_by FROM room WHERE id = ?',
            [roomId]
        );

        if (rooms.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (rooms[0].created_by !== userId) {
            return res.status(403).json({ message: 'Only the creator can delete the room' });
        }

        await db.execute('DELETE FROM room WHERE id = ?', [roomId]);

        res.json({ message: 'Room deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/rooms – listează camerele în care este utilizatorul
router.get('/', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const query = `
            SELECT r.id, r.name, r.join_code, r.created_by, r.created_at,
                   (SELECT COUNT(*) FROM room_participant WHERE room_id = r.id) AS participant_count
            FROM room r
            INNER JOIN room_participant rp ON r.id = rp.room_id
            WHERE rp.user_id = ?
            ORDER BY r.created_at DESC
        `;
        const [rows] = await db.execute(query, [userId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;