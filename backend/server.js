import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { login } from './routes/auth.js';
import { register } from './routes/register.js';
import roomsRouter from './routes/rooms.js';
import setupSockets from './sockets.js';
import authMiddleware from './middleware/auth.js';
import supabase from './database/supabase.js';

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// Rute publice
app.post('/api/login', login);
app.post('/api/register', register);

// Rute protejate
app.use('/api/rooms', roomsRouter);

// GET /api/users?ids=id1,id2
app.get('/api/users', authMiddleware, async (req, res) => {
    const ids = req.query.ids?.split(',').filter(Boolean);
    if (!ids?.length) return res.json([]);
    const { data, error } = await supabase.from('user').select('id, username').in('id', ids);
    if (error) return res.status(500).json({ message: 'Error fetching users' });
    res.json(data);
});

app.get('/', (req, res) => {
    res.send('Server is running 🚀');
});

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

setupSockets(server);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});