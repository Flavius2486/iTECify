import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import supabase from '../database/supabase.js';

export const login = async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Missing fields' });
    }

    try {
        const { data: rows, error } = await supabase
            .from('user')
            .select('id, username, email, password')
            .or(`email.eq."${identifier}",username.eq."${identifier}"`)
            .limit(1);

        if (error) throw error;
        if (!rows || rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = rows[0];
        const ok = await argon2.verify(user.password, password);
        if (!ok) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
};
