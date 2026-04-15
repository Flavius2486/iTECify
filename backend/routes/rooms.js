import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../database/supabase.js';
import authMiddleware from '../middleware/auth.js';
import messagesRouter from './messages.js';
import codeRouter from './code.js';
import { broadcastToRoom } from '../sockets.js';

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
        const { data } = await supabase
            .from('room')
            .select('id')
            .eq('join_code', code)
            .limit(1);
        exists = data && data.length > 0;
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

        const { error: roomErr } = await supabase.from('room').insert({
            id: roomId,
            name,
            join_code: joinCode,
            created_by: userId,
            admin_id: userId,
        });
        if (roomErr) throw roomErr;

        const { error: participantErr } = await supabase.from('room_participant').insert({
            room_id: roomId,
            user_id: userId,
        });
        if (participantErr) throw participantErr;

        res.status(201).json({
            id: roomId,
            name,
            joinCode,
            createdBy: userId,
            createdAt: new Date().toISOString(),
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
        const { data: rooms, error: roomErr } = await supabase
            .from('room')
            .select('id, name, created_by')
            .eq('join_code', joinCode.toUpperCase())
            .limit(1);
        if (roomErr) throw roomErr;

        if (!rooms || rooms.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        const room = rooms[0];

        const { data: existing, error: existErr } = await supabase
            .from('room_participant')
            .select('user_id')
            .eq('room_id', room.id)
            .eq('user_id', userId)
            .limit(1);
        if (existErr) throw existErr;

        if (existing && existing.length > 0) {
            return res.json({
                id: room.id,
                name: room.name,
                joinCode: joinCode.toUpperCase(),
                createdBy: room.created_by,
            });
        }

        const { error: joinErr } = await supabase.from('room_participant').insert({
            room_id: room.id,
            user_id: userId,
        });
        if (joinErr) throw joinErr;

        res.json({
            id: room.id,
            name: room.name,
            joinCode: joinCode.toUpperCase(),
            createdBy: room.created_by,
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
        const { data: rooms, error: roomErr } = await supabase
            .from('room')
            .select('created_by')
            .eq('id', roomId)
            .limit(1);
        if (roomErr) throw roomErr;

        if (!rooms || rooms.length === 0) {
            return res.status(404).json({ message: 'Room not found' });
        }

        if (rooms[0].created_by !== userId) {
            return res.status(403).json({ message: 'Only the creator can delete the room' });
        }

        const { error } = await supabase.from('room').delete().eq('id', roomId);
        if (error) throw error;

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
        const { data, error } = await supabase
            .from('room_participant')
            .select('room:room_id (id, name, join_code, created_by, admin_id, created_at, admin:admin_id (username))')
            .eq('user_id', userId);
        if (error) throw error;

        const rooms = data
            .map((row) => row.room)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json(rooms);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/rooms/:roomId/leave – părăsire cameră (cu transfer admin și auto-delete)
router.post('/:roomId/leave', authMiddleware, async (req, res) => {
    const { roomId } = req.params;
    const userId = req.user.id;

    try {
        // Verificăm dacă e admin
        const { data: roomData } = await supabase
            .from('room').select('admin_id, created_by').eq('id', roomId).limit(1);
        const effectiveAdmin = roomData?.[0]?.admin_id || roomData?.[0]?.created_by;
        const isAdmin = effectiveAdmin === userId;

        // Scoatem participantul
        await supabase.from('room_participant').delete()
            .eq('room_id', roomId).eq('user_id', userId);

        // Verificăm participanții rămași
        const { data: remaining } = await supabase
            .from('room_participant').select('user_id, joined_at')
            .eq('room_id', roomId).order('joined_at', { ascending: true });

        if (!remaining || remaining.length === 0) {
            await supabase.from('room').delete().eq('id', roomId);
            return res.json({ message: 'Left and room deleted' });
        }

        if (isAdmin) {
            const newAdminId = remaining[0].user_id;
            await supabase.from('room').update({ admin_id: newAdminId }).eq('id', roomId);
            await supabase.from('code_file')
                .update({ created_by: newAdminId })
                .eq('room_id', roomId).eq('created_by', userId);
            // Broadcast din backend
            broadcastToRoom(roomId, { action: 'user_left', userId });
            broadcastToRoom(roomId, { action: 'admin_changed', newAdminId, oldAdminId: userId });
            return res.json({ message: 'Left room, admin transferred', newAdminId });
        }

        broadcastToRoom(roomId, { action: 'user_left', userId });
        res.json({ message: 'Left room successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /api/rooms/:roomId/kick/:targetId – kick participant (doar admin)
router.post('/:roomId/kick/:targetId', authMiddleware, async (req, res) => {
    const { roomId, targetId } = req.params;
    const userId = req.user.id;

    try {
        const { data: roomData } = await supabase
            .from('room').select('admin_id, created_by').eq('id', roomId).limit(1);
        if (!roomData || roomData.length === 0)
            return res.status(404).json({ message: 'Room not found' });
        const effectiveAdmin = roomData[0].admin_id || roomData[0].created_by;
        if (effectiveAdmin !== userId)
            return res.status(403).json({ message: 'Only admin can kick' });
        if (targetId === userId)
            return res.status(400).json({ message: 'Cannot kick yourself' });

        await supabase.from('room_participant').delete()
            .eq('room_id', roomId).eq('user_id', targetId);

        broadcastToRoom(roomId, { action: 'user_kicked', userId: targetId });
        res.json({ message: 'User kicked' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Sub-routere pentru mesaje și cod
router.use('/:roomId/messages', messagesRouter);
router.use('/:roomId/code', codeRouter);

export default router;
