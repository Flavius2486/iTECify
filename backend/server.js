import 'dotenv/config';
import express from 'express';
import { login } from './routes/auth.js';
import { register } from './routes/register.js';
import messagesRouter from './routes/messages.js';
import codeRouter from './routes/code.js';

const app = express();
app.use(express.json());

// Public routes
app.post('/api/login', login);
app.post('/api/register', register);

// Protected routes
app.use('/api/messages', messagesRouter);
app.use('/api/code', codeRouter);

app.get('/', (req, res) => {
    res.send('Server is running 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});