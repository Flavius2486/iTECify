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

async function getFileIfBelongsToRoom(fileId, roomId) {
    const [rows] = await db.execute(
        'SELECT * FROM code_file WHERE id = ? AND room_id = ?',
        [fileId, roomId]
    );
    return rows.length ? rows[0] : null;
}

// GET /api/rooms/:roomId/code – lista fișiere (fără conținut)
router.get('/', authMiddleware, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.id;

    try {
        if (!(await isParticipant(roomId, userId))) {
            return res.status(403).json({ message: 'Not a participant' });
        }

        const [files] = await db.execute(
            `SELECT id, name, language, created_by, created_at, updated_at
             FROM code_file
             WHERE room_id = ?
             ORDER BY created_at DESC`,
            [roomId]
        );
        res.json(files);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/rooms/:roomId/code/:fileId – preia un fișier (inclusiv conținut)
router.get('/:fileId', authMiddleware, async (req, res) => {
    const { roomId, fileId } = req.params;
    const userId = req.user.id;

    try {
        if (!(await isParticipant(roomId, userId))) {
            return res.status(403).json({ message: 'Not a participant' });
        }

        const file = await getFileIfBelongsToRoom(fileId, roomId);
        if (!file) return res.status(404).json({ message: 'File not found' });
        res.json(file);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/rooms/:roomId/code – creează un fișier nou
router.post('/', authMiddleware, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { name, content, language } = req.body;

    if (!name || !content) {
        return res.status(400).json({ message: 'Name and content are required' });
    }

    try {
        if (!(await isParticipant(roomId, userId))) {
            return res.status(403).json({ message: 'Not a participant' });
        }

        const fileId = uuidv4();
        await db.execute(
            `INSERT INTO code_file (id, room_id, name, content, language, created_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [fileId, roomId, name, content, language || null, userId]
        );

        const [newFile] = await db.execute(
            `SELECT id, name, language, created_by, created_at, updated_at
             FROM code_file WHERE id = ?`,
            [fileId]
        );
        res.status(201).json(newFile[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /api/rooms/:roomId/code/:fileId – actualizează un fișier
router.put('/:fileId', authMiddleware, async (req, res) => {
    const { roomId, fileId } = req.params;
    const userId = req.user.id;
    const { name, content, language } = req.body;

    if (!name && !content && !language) {
        return res.status(400).json({ message: 'At least one field to update is required' });
    }

    try {
        if (!(await isParticipant(roomId, userId))) {
            return res.status(403).json({ message: 'Not a participant' });
        }

        const file = await getFileIfBelongsToRoom(fileId, roomId);
        if (!file) return res.status(404).json({ message: 'File not found' });

        const updates = [];
        const values = [];
        if (name !== undefined) {
            updates.push('name = ?');
            values.push(name);
        }
        if (content !== undefined) {
            updates.push('content = ?');
            values.push(content);
        }
        if (language !== undefined) {
            updates.push('language = ?');
            values.push(language);
        }
        values.push(fileId);
        await db.execute(`UPDATE code_file SET ${updates.join(', ')} WHERE id = ?`, values);

        const [updated] = await db.execute(
            `SELECT id, name, language, created_by, created_at, updated_at
             FROM code_file WHERE id = ?`,
            [fileId]
        );
        res.json(updated[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE /api/rooms/:roomId/code/:fileId – șterge un fișier
router.delete('/:fileId', authMiddleware, async (req, res) => {
    const { roomId, fileId } = req.params;
    const userId = req.user.id;

    try {
        if (!(await isParticipant(roomId, userId))) {
            return res.status(403).json({ message: 'Not a participant' });
        }

        const file = await getFileIfBelongsToRoom(fileId, roomId);
        if (!file) return res.status(404).json({ message: 'File not found' });

        await db.execute('DELETE FROM code_file WHERE id = ?', [fileId]);
        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;