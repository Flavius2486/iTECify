import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';

export const register = async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ message: 'Missing fields' });
    }

    try {
        const passwordHash = await argon2.hash(password);
        const userId = uuidv4();

        const query = `
            INSERT INTO \`user\` (id, email, username, password, type)
            VALUES (?, ?, ?, ?, 'human')
        `;
        await db.execute(query, [userId, email, username, passwordHash]);

        const user = { id: userId, email, username };

        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ token, user });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Email or username already exists' });
        }
        console.error('Register error:', err);
        res.status(500).json({ message: 'Error creating user' });
    }
};