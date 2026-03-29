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

// GET /api/rooms/:roomId/code – listează fișierele de cod din cameră
router.get('/', authMiddleware, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.id;

    try {
        if (!(await isRoomMember(roomId, userId))) {
            return res.status(403).json({ message: 'Not authorized in this room' });
        }

        const { data, error } = await supabase
            .from('code_file')
            .select('id, name, content, language, created_by, created_at, updated_at')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true });
        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error('Error fetching code files:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/rooms/:roomId/code – creare fișier de cod
router.post('/', authMiddleware, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { name, content, language } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'name is required' });
    }

    try {
        if (!(await isRoomMember(roomId, userId))) {
            return res.status(403).json({ message: 'Not authorized in this room' });
        }

        const fileId = uuidv4();
        const { error } = await supabase.from('code_file').insert({
            id: fileId,
            room_id: roomId,
            name,
            content: content ?? '',
            language: language || 'plaintext',
            created_by: userId,
        });
        if (error) throw error;

        res.status(201).json({ fileId });
    } catch (err) {
        console.error('Error creating code file:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /api/rooms/:roomId/code/:fileId – actualizare fișier de cod
router.put('/:fileId', authMiddleware, async (req, res) => {
    const { roomId, fileId } = req.params;
    const userId = req.user.id;
    const { name, content, language } = req.body;

    if (content === undefined) {
        return res.status(400).json({ message: 'content is required' });
    }

    try {
        if (!(await isRoomMember(roomId, userId))) {
            return res.status(403).json({ message: 'Not authorized in this room' });
        }

        const { data: existing, error: fetchErr } = await supabase
            .from('code_file')
            .select('id')
            .eq('id', fileId)
            .eq('room_id', roomId)
            .limit(1);
        if (fetchErr) throw fetchErr;
        if (!existing || existing.length === 0) {
            return res.status(404).json({ message: 'Code file not found' });
        }

        const updates = { content };
        if (name) updates.name = name;
        if (language) updates.language = language;

        const { error } = await supabase.from('code_file').update(updates).eq('id', fileId);
        if (error) throw error;

        res.json({ message: 'Code file updated successfully' });
    } catch (err) {
        console.error('Error updating code file:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// DELETE /api/rooms/:roomId/code/:fileId – ștergere fișier de cod
router.delete('/:fileId', authMiddleware, async (req, res) => {
    const { roomId, fileId } = req.params;
    const userId = req.user.id;

    try {
        if (!(await isRoomMember(roomId, userId))) {
            return res.status(403).json({ message: 'Not authorized in this room' });
        }

        const { data: existing, error: fetchErr } = await supabase
            .from('code_file')
            .select('id')
            .eq('id', fileId)
            .eq('room_id', roomId)
            .limit(1);
        if (fetchErr) throw fetchErr;
        if (!existing || existing.length === 0) {
            return res.status(404).json({ message: 'Code file not found' });
        }

        const { error } = await supabase.from('code_file').delete().eq('id', fileId);
        if (error) throw error;

        res.json({ message: 'Code file deleted successfully' });
    } catch (err) {
        console.error('Error deleting code file:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;
