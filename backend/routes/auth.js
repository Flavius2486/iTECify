const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const supabase = require('../db');

exports.login = async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Missing fields' });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, username, password_hash')
            .or(`email.eq.${identifier},username.eq.${identifier}`)
            .single();

        if (error || !user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const ok = await argon2.verify(user.password_hash, password);
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
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
};