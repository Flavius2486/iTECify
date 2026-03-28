import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../database/supabase.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

async function isRoomMember(roomId, userId) {
    const { data, error } = await supabase
        .from('room_participant')
        .select('user_id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .limit(1);

    if (error) throw error;
    return data && data.length > 0;
}

// GET /api/rooms/:roomId/messages
router.get('/', authMiddleware, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.id;

    try {
        if (!(await isRoomMember(roomId, userId))) {
            return res.status(403).json({ message: 'Not authorized in this room' });
        }

        const { data: messages, error: msgErr } = await supabase
            .from('message')
            .select('id, user_id, content, created_at, user:user_id (username)')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });
        if (msgErr) throw msgErr;

        res.json(messages);
    } catch (err) {
        console.error('Error fetching messages:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/rooms/:roomId/messages
router.post('/', authMiddleware, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ message: 'Message content is required' });
    }

    try {
        if (!(await isRoomMember(roomId, userId))) {
            return res.status(403).json({ message: 'Not authorized in this room' });
        }

        const messageId = uuidv4();
        const { error } = await supabase.from('message').insert({
            id: messageId,
            room_id: roomId,
            user_id: userId,
            content,
        });
        if (error) throw error;

        res.status(201).json({ messageId });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
