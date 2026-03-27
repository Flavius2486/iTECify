require('dotenv').config();
const express = require('express');
const auth = require('./routes/auth');
const register = require('./routes/register');
const conversationsRouter = require('./routes/conversations');

const app = express();
app.use(express.json());

// Rute publice
app.post('/api/auth/login', auth.login);
app.post('/api/register', register.register);

// Rute protejate
app.use('/api/conversations', conversationsRouter);

app.get('/', (req, res) => {
    res.send('Server is running 🚀');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});