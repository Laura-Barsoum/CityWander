import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import fs from 'fs';
import { body, validationResult } from 'express-validator';
import { 
    db, 
    initializeDatabase, 
    saveBuddyRequest, 
    findPotentialMatches, 
    createMatch,
    createSession,
    validateSession 
} from './database.js';
import { Server } from 'socket.io';
import http from 'http';

// Initialize dotenv
dotenv.config();

// ES Module fix for __dirname
const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure public directory exists
const publicDir = join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
}

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: "http://127.0.0.1:5500",
        methods: ["GET", "POST"],
        credentials: true,
        transports: ['websocket', 'polling']
    }
});

// Store active connections
const userSockets = new Map();
const activeMatches = new Map();

// Authentication middleware
const authenticateUser = async (req, res, next) => {
    const sessionId = req.headers['session-id'] || req.headers['authorization']?.split(' ')[1];
    
    if (!sessionId) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await validateSession(sessionId);
    if (!user) {
        return res.status(401).json({ message: 'Invalid session' });
    }

    req.user = user;
    next();
};

// Initialize the database
await initializeDatabase();

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Middleware
app.use(cors({
    origin: "http://127.0.0.1:5500",
    credentials: true
}));
app.use(express.json());
app.use(express.static(publicDir));

// API Routes
const apiRouter = express.Router();

// Register endpoint
apiRouter.post('/register', [
    body('fullName').trim().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { fullName, email, password } = req.body;
    await db.read();

    if (db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
        id: Date.now().toString(),
        fullName,
        email: email.toLowerCase(),
        password: hashedPassword,
        createdAt: new Date().toISOString()
    };

    db.data.users.push(newUser);
    await db.write();

    const sessionId = await createSession(newUser.id);

    res.status(201).json({
        message: 'Registration successful',
        sessionId,
        user: {
            id: newUser.id,
            fullName: newUser.fullName,
            email: newUser.email
        }
    });
}));

// Login endpoint
apiRouter.post('/login', asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    await db.read();

    const user = db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const sessionId = await createSession(user.id);

    res.json({
        message: 'Login successful',
        sessionId,
        user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email
        }
    });
}));

// Find buddy endpoint
apiRouter.post('/find-buddy', authenticateUser, [
    body('date').isISO8601(),
    body('interests').isArray()
], asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { date, interests } = req.body;
    const userId = req.user.id;

    const existingRequests = await findPotentialMatches({
        date,
        interests,
        userId
    });

    if (existingRequests.length > 0) {
        const match = await createMatch({
            userId,
            date,
            interests
        }, existingRequests[0]);

        const matchRoom = `match_${match.id}`;
        activeMatches.set(match.id, {
            ...match,
            roomId: matchRoom
        });

        match.users.forEach(uid => {
            const userSocket = userSockets.get(uid);
            if (userSocket) {
                io.to(userSocket).emit('match_found', match);
            }
        });

        res.json({ match });
    } else {
        const request = await saveBuddyRequest({
            userId,
            date,
            interests,
            status: 'active'
        });
        res.json({ message: 'Request saved. Waiting for matches.', request });
    }
}));

// Socket.IO connection handling
io.use(async (socket, next) => {
    const sessionId = socket.handshake.auth.sessionId;
    if (!sessionId) {
        return next(new Error('Authentication required'));
    }

    const user = await validateSession(sessionId);
    if (!user) {
        return next(new Error('Invalid session'));
    }

    socket.user = user;
    socket.userId = user.id;
    next();
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    userSockets.set(socket.userId, socket.id);

    socket.on('join_match_room', (matchId) => {
        const match = activeMatches.get(matchId);
        if (match && match.users.includes(socket.userId)) {
            socket.join(match.roomId);
        }
    });

    socket.on('send_message', (data) => {
        const match = activeMatches.get(data.matchId);
        if (match && match.users.includes(socket.userId)) {
            io.to(match.roomId).emit('receive_message', {
                sender: socket.userId,
                message: data.message,
                timestamp: new Date()
            });
        }
    });

    socket.on('disconnect', () => {
        userSockets.delete(socket.userId);
    });
});

// Mount API routes
app.use('/api', apiRouter);

// Error handling
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Helper function for async route handling
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Socket.IO server ready');
});
