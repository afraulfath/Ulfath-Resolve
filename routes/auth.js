
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Name, email and password are required.'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must contain at least 8 characters.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [existing] = await pool.execute(
            'SELECT user_id FROM users WHERE email = ?',
            [normalizedEmail]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const [result] = await pool.execute(
            `INSERT INTO users (name, email, password, phone)
             VALUES (?, ?, ?, ?)`,
            [
                name.trim(),
                normalizedEmail,
                hashedPassword,
                phone?.trim() || null
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful!',
            userId: result.insertId
        });
    } catch (error) {
        console.error('Registration error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Unable to register right now.'
        });
    }
});

// Log in an existing user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        const [users] = await pool.execute(
            `SELECT user_id, name, email, password, role
             FROM users WHERE email = ?`,
            [email.trim().toLowerCase()]
        );

        if (
            users.length === 0 ||
            !(await bcrypt.compare(password, users[0].password))
        ) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const user = users[0];

        req.session.user = {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.json({
            success: true,
            message: 'Login successful.',
            user: req.session.user
        });
    } catch (error) {
        console.error('Login error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Unable to log in right now.'
        });
    }
});

// Return the current logged-in user's details
router.get('/me', (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Please log in.'
        });
    }

    res.json({
        success: true,
        user: req.session.user
    });
});

// Log out
router.post('/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            return res.status(500).json({
                success: false,
                message: 'Unable to log out.'
            });
        }

        res.clearCookie('connect.sid');

        res.json({
            success: true,
            message: 'Logged out successfully.'
        });
    });
});

module.exports = router;
