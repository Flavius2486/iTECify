import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../database/supabase.js';

export const register = async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ message: 'Missing fields' });
    }

    try {
        const { data: existingUsers, error: existingErr } = await supabase
            .from('user')
            .select('id')
            .or(`email.eq.${email},username.eq.${username}`)
            .limit(1);

        if (existingErr) throw existingErr;
        if (existingUsers && existingUsers.length > 0) {
            return res.status(409).json({ message: 'Email or username already exists' });
        }

        const passwordHash = await argon2.hash(password);
        const userId = uuidv4();

        const { error: insertErr } = await supabase.from('user').insert([
            {
                id: userId,
                email,
                username,
                password: passwordHash,
                type: 'human',
            },
        ]);
        if (insertErr) throw insertErr;

        const token = jwt.sign(
            { id: userId, email, username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ token, user: { id: userId, email, username } });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Error creating user' });
    }
};
