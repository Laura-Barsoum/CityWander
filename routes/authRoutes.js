// authRoutes.js
import express from 'express';
import { createUser, authenticateUser, validateSession, removeSession } from './database.js';

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;
        
        // Validation
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        
        const result = await createUser(fullName, email, password);
        
        res.status(201).json({
            message: 'Registration successful',
            sessionId: result.sessionId,
            user: result.user
        });
    } catch (error) {
        if (error.message === 'Email already registered') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authenticateUser(email, password);
        
        res.json({
            message: 'Login successful',
            sessionId: result.sessionId,
            user: result.user
        });
    } catch (error) {
        res.status(400).json({ message: 'Invalid credentials' });
    }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
    const sessionId = req.headers['session-id'];
    if (sessionId) {
        await removeSession(sessionId);
    }
    res.json({ message: 'Logout successful' });
});

export default router;