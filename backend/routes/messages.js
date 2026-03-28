import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router({ mergeParams: true }); // pentru a accesa :roomId

async function isParticipant(roomId, userId) {
    const [rows] = await db.execute(
        'SELECT 1 FROM room_participant WHERE room_id = ? AND user_id = ?',
        [roomId, userId]
    );
    return rows.length > 0;
}

// POST /api/rooms/:roomId/messages – trimite un mesaj în cameră
router.post('/', authMiddleware, async (req, res) => {
    const { roomId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content) {
        return res.status(400).json({ message: 'Message content is required' });
    }

    try {
        if (!(await isParticipant(roomId, userId))) {
            return res.status(403).json({ message: 'Not a participant' });
        }

        const messageId = uuidv4();
        await db.execute(
            'INSERT INTO message (id, room_id, user_id, content) VALUES (?, ?, ?, ?)',
            [messageId, roomId, userId, content]
        );

        const [newMessage] = await db.execute(
            `SELECT m.id, m.content, m.created_at, u.id as user_id, u.username
             FROM message m
             JOIN \`user\` u ON m.user_id = u.id
             WHERE m.id = ?`,
            [messageId]
        );

        res.status(201).json(newMessage[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/rooms/:roomId/messages – preia toate mesajele din cameră
router.get('/', authMiddleware, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.id;

    try {
        if (!(await isParticipant(roomId, userId))) {
            return res.status(403).json({ message: 'Not a participant' });
        }

        const [messages] = await db.execute(
            `SELECT m.id, m.content, m.created_at, u.id as user_id, u.username
             FROM message m
             JOIN \`user\` u ON m.user_id = u.id
             WHERE m.room_id = ?
             ORDER BY m.created_at ASC`,
            [roomId]
        );

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;