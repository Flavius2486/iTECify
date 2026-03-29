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
            .select('id, user_id, content, created_at')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });
        if (msgErr) throw msgErr;

        // Luăm username-urile pentru toți user_id unici
        const userIds = [...new Set(messages.map(m => m.user_id))];
        const { data: users } = await supabase
            .from('user')
            .select('id, username')
            .in('id', userIds);

        const usernameMap = Object.fromEntries((users || []).map(u => [u.id, u.username]));

        const result = messages.map(m => ({
            ...m,
            username: usernameMap[m.user_id] || null,
        }));

        res.json(result);
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

        // Luăm username-ul pentru broadcast
        const { data: userData } = await supabase
            .from('user')
            .select('username')
            .eq('id', userId)
            .limit(1);

        res.status(201).json({
            messageId,
            username: userData?.[0]?.username || null,
        });
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
