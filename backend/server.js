import 'dotenv/config';
import http from 'http';
import express from 'express';
import { login } from './routes/auth.js';
import { register } from './routes/register.js';
import roomsRouter from './routes/rooms.js';
import setupSockets from './sockets.js';

const app = express();
app.use(express.json());

// Rute publice
app.post('/api/login', login);
app.post('/api/register', register);

// Rute protejate
app.use('/api/rooms', roomsRouter);                         // camere

app.get('/', (req, res) => {
    res.send('Server is running 🚀');
});

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

setupSockets(server);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});