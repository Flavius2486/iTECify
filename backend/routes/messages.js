import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/messages/users
 * Returnează toți utilizatorii cu care utilizatorul autentificat a avut conversații (cel puțin un mesaj text).
 */
router.get('/users', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const query = `
            SELECT DISTINCT u.id, u.username, u.email
            FROM \`user\` u
            WHERE u.id IN (
                SELECT t.sender_id FROM \`text\` t WHERE t.receiver_id = ?
                UNION
                SELECT t.receiver_id FROM \`text\` t WHERE t.sender_id = ?
            )
            AND u.id != ?
            ORDER BY u.username
        `;
        const [rows] = await db.execute(query, [userId, userId, userId]);

        res.json(rows);
    } catch (err) {
        console.error('Eroare la preluarea utilizatorilor cu conversații:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * GET /api/messages/:userId
 * Returnează toate mesajele text schimbate între utilizatorul autentificat și :userId.
 * Fiecare mesaj conține și datele utilizatorilor (username) și, dacă există, codul asociat.
 */
router.get('/:userId', authMiddleware, async (req, res) => {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;

    try {
        const query = `
            SELECT
                t.id AS message_id,
                t.sender_id,
                t.receiver_id,
                sender.username AS sender_username,
                receiver.username AS receiver_username,
                t.message,
                t.send_date,
                c.id AS code_id,
                c.code,
                c.name,
                c.created_at AS code_created_at
            FROM chat ch
            INNER JOIN \`text\` t ON ch.text_id = t.id
            LEFT JOIN \`code\` c ON ch.code_id = c.id
            INNER JOIN \`user\` sender ON t.sender_id = sender.id
            INNER JOIN \`user\` receiver ON t.receiver_id = receiver.id
            WHERE (t.sender_id = ? AND t.receiver_id = ?)
               OR (t.sender_id = ? AND t.receiver_id = ?)
              AND NOT (t.sender_id = ? AND t.deleted_by_sender = TRUE)
              AND NOT (t.receiver_id = ? AND t.deleted_by_receiver = TRUE)
            ORDER BY t.send_date ASC
        `;
        const [rows] = await db.execute(query, [
            currentUserId, otherUserId,
            otherUserId, currentUserId,
            currentUserId, currentUserId
        ]);
        res.json(rows);
    } catch (err) {
        console.error('Eroare la preluarea mesajelor:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/**
 * POST /api/messages/:userId
 * Trimite un mesaj text către utilizatorul specificat.
 * Body: { content: string (obligatoriu) }
 */
router.post('/:userId', authMiddleware, async (req, res) => {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Message content is required' });
    }
    if (currentUserId === otherUserId) {
        return res.status(400).json({ message: 'Cannot send message to yourself' });
    }

    try {
        // 1. Creează înregistrarea text
        const textId = uuidv4();
        await db.execute(
            'INSERT INTO `text` (id, sender_id, receiver_id, message) VALUES (?, ?, ?, ?)',
            [textId, currentUserId, otherUserId, content]
        );

        // 2. Creează înregistrarea chat care leagă text-ul (fără cod, deocamdată)
        const chatId = uuidv4();
        await db.execute(
            'INSERT INTO `chat` (id, text_id) VALUES (?, ?)',
            [chatId, textId]
        );

        res.status(201).json({ messageId: textId });
    } catch (err) {
        console.error('Eroare la trimiterea mesajului:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});


/**
 * DELETE /api/messages/chat/:chatId
 * Șterge (marchează) toate mesajele dintr-un chat pentru utilizatorul curent.
 */
router.delete('/chat/:chatId', authMiddleware, async (req, res) => {
    const chatId = req.params.chatId;
    const currentUserId = req.user.id;

    try {
        // Obține toate text-urile asociate acestui chat
        const [textRows] = await db.execute(
            `SELECT t.id, t.sender_id, t.receiver_id
             FROM chat ch
             INNER JOIN \`text\` t ON ch.text_id = t.id
             WHERE ch.id = ?`,
            [chatId]
        );

        if (textRows.length === 0) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        await db.beginTransaction();

        for (const text of textRows) {
            if (text.sender_id === currentUserId) {
                // Current user is the sender
                await db.execute(
                    'UPDATE `text` SET deleted_by_sender = TRUE WHERE id = ?',
                    [text.id]
                );
            } else if (text.receiver_id === currentUserId) {
                // Current user is the receiver
                await db.execute(
                    'UPDATE `text` SET deleted_by_receiver = TRUE WHERE id = ?',
                    [text.id]
                );
            }
        }

        await db.commit();

        res.json({ message: 'Chat deleted for you' });
    } catch (err) {
        await db.rollback();
        console.error('Error deleting chat:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});




export default router;