

const path = require('path');

const result = require('dotenv').config({
    path: path.join(__dirname, '.env')
});

console.log('Environment file:', path.join(__dirname, '.env'));
console.log('Dotenv error:', result.error?.message || 'None');
console.log('Session secret loaded:', Boolean(process.env.SESSION_SECRET));

const express = require('express');
const session = require('express-session');
const pool = require('./config/db');

const app = express();


const express = require('express');
const session = require('express-session');
const path = require('path');
const pool = require('./config/db');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(
    session({
        name: 'ulfath.sid',
        secret:
            process.env.SESSION_SECRET ||
            'ulfath_local_dev_secret_change_this_98765',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 1000 * 60 * 60 * 2
        }
    })
);

// Authentication routes
app.use('/api/auth', require('./routes/auth'));

// Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Backend and database health check
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT DATABASE() AS databaseName'
        );

        res.json({
            success: true,
            message: 'Ulfath Resolve backend is running!',
            database: rows[0].databaseName
        });
    } catch (error) {
        console.error('Database error:', error.message);

        res.status(500).json({
            success: false,
            message: 'Database connection failed.'
        });
    }
});

// Check whether a user is logged in
app.get('/api/auth-status', (req, res) => {
    if (req.session.user) {
        return res.json({
            success: true,
            loggedIn: true,
            user: req.session.user
        });
    }

    res.json({
        success: true,
        loggedIn: false
    });
});

// Handle unknown API routes
app.use('/api', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found.'
    });
});

// General error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.message);

    res.status(500).json({
        success: false,
        message: 'Something went wrong on the server.'
    });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Ulfath Resolve running at http://localhost:${PORT}`);
    console.log(
        'Session secret loaded:',
        Boolean(process.env.SESSION_SECRET)
    );
});
