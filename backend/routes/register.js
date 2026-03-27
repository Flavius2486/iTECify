const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const supabase = require('../db');

exports.register = async (req, res) => {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
        return res.status(400).json({ message: 'Missing fields' });
    }

    try {
        const passwordHash = await argon2.hash(password);

        const { data: user, error } = await supabase
            .from('users')
            .insert([{ email, username, password_hash: passwordHash }])
            .select('id, email, username')
            .single();

        if (error) {
            if (error.code === '23505') { // duplicate key
                return res.status(409).json({ message: 'Email or username already exists' });
            }
            throw error;
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ token, user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error creating user' });
    }
};