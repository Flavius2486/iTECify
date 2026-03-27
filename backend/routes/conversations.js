const express = require('express');
const router = express.Router();
const supabase = require('../db');
const authMiddleware = require('../middleware/auth');

// GET /api/conversations/users – lista utilizatorilor cu care am conversat
router.get('/users', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        const { data, error } = await supabase.rpc('get_conversation_users', { user_id: userId });

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/conversations/:userId – obține sau creează conversația cu un utilizator
router.get('/:userId', authMiddleware, async (req, res) => {
    const userId = req.user.id;
    const otherUserId = req.params.userId;

    try {
        const { data: existing, error: searchError } = await supabase.rpc('get_private_conversation', {
            user1: userId,
            user2: otherUserId
        });

        if (searchError) throw searchError;

        if (existing && existing.length > 0) {
            return res.json({ conversationId: existing[0].conversation_id });
        }

        // Creează o conversație nouă
        const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert({ type: 'private' })
            .select()
            .single();

        if (createError) throw createError;

        // Adaugă participanții
        const participants = [
            { conversation_id: newConv.id, user_id: userId },
            { conversation_id: newConv.id, user_id: otherUserId }
        ];
        const { error: participantError } = await supabase
            .from('conversation_participants')
            .insert(participants);

        if (participantError) throw participantError;

        res.json({ conversationId: newConv.id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/conversations/:conversationId/messages – trimite un mesaj
router.post('/:conversationId/messages', authMiddleware, async (req, res) => {
    const conversationId = req.params.conversationId;
    const senderId = req.user.id;
    const { content, codeSnippet } = req.body;

    try {
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: senderId,
                content: content || null,
                code_snippet: codeSnippet || null
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/conversations/:conversationId/messages – preia istoricul mesajelor
router.get('/:conversationId/messages', authMiddleware, async (req, res) => {
    const conversationId = req.params.conversationId;

    try {
        const { data, error } = await supabase
            .from('messages')
            .select(`
                *,
                sender:sender_id (id, username, email)
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;