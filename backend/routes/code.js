import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

async function isParticipant(chatId, userId) {
    const [rows] = await db.execute(
        `SELECT 1
         FROM chat ch
         INNER JOIN \`text\` t ON ch.text_id = t.id
         WHERE ch.id = ? AND (t.sender_id = ? OR t.receiver_id = ?)`,
        [chatId, userId, userId]
    );
    return rows.length > 0;
}

// CREATE
router.post('/', authMiddleware, async (req, res) => {
    const { chatId, code, name } = req.body;
    const userId = req.user.id;

    if (!chatId || !code) {
        return res.status(400).json({ message: 'chatId and code are required' });
    }

    try {
        const [chatExists] = await db.execute('SELECT id FROM chat WHERE id = ?', [chatId]);
        if (chatExists.length === 0) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        const allowed = await isParticipant(chatId, userId);
        if (!allowed) {
            return res.status(403).json({ message: 'Not authorized to add code to this chat' });
        }

        const [existing] = await db.execute('SELECT code_id FROM chat WHERE id = ?', [chatId]);
        if (existing[0].code_id) {
            return res.status(409).json({ message: 'This chat already has a code snippet. Use PUT to update it.' });
        }

        const codeId = uuidv4();
        await db.execute(
            'INSERT INTO `code` (id, chat_id, code, name) VALUES (?, ?, ?, ?)',
            [codeId, chatId, code, name || 'plaintext']
        );
        await db.execute('UPDATE `chat` SET code_id = ? WHERE id = ?', [codeId, chatId]);

        res.status(201).json({ codeId });
    } catch (err) {
        console.error('Error creating code snippet:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// UPDATE
router.put('/:codeId', authMiddleware, async (req, res) => {
    const { codeId } = req.params;
    const { code, name } = req.body;
    const userId = req.user.id;

    if (!code) {
        return res.status(400).json({ message: 'code is required' });
    }

    try {
        const [codeRows] = await db.execute('SELECT chat_id FROM `code` WHERE id = ?', [codeId]);
        if (codeRows.length === 0) {
            return res.status(404).json({ message: 'Code snippet not found' });
        }
        const chatId = codeRows[0].chat_id;

        const allowed = await isParticipant(chatId, userId);
        if (!allowed) {
            return res.status(403).json({ message: 'Not authorized to update this code' });
        }

        await db.execute(
            'UPDATE `code` SET code = ?, name = ? WHERE id = ?',
            [code, name || 'plaintext', codeId]
        );

        res.json({ message: 'Code updated successfully' });
    } catch (err) {
        console.error('Error updating code snippet:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE
router.delete('/:codeId', authMiddleware, async (req, res) => {
    const { codeId } = req.params;
    const userId = req.user.id;

    try {
        const [codeRows] = await db.execute('SELECT chat_id FROM `code` WHERE id = ?', [codeId]);
        if (codeRows.length === 0) {
            return res.status(404).json({ message: 'Code snippet not found' });
        }
        const chatId = codeRows[0].chat_id;

        const allowed = await isParticipant(chatId, userId);
        if (!allowed) {
            return res.status(403).json({ message: 'Not authorized to delete this code' });
        }

        await db.beginTransaction();

        await db.execute('DELETE FROM `code` WHERE id = ?', [codeId]);
        await db.execute('UPDATE `chat` SET code_id = NULL WHERE id = ?', [chatId]);

        await db.commit();

        res.json({ message: 'Code deleted successfully' });
    } catch (err) {
        await db.rollback();
        console.error('Error deleting code snippet:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;