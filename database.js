import { join, dirname } from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, 'db.json');

// Create database schema
const schema = {
    users: [],
    sessions: [],
    matches: [],
    buddyRequests: []
};

const adapter = new JSONFile(file);
const db = new Low(adapter);

// Initialize database
async function initializeDatabase() {
    await db.read();
    db.data ||= schema;
    Object.keys(schema).forEach(key => {
        db.data[key] ||= [];
    });
    await db.write();
}

// User management functions
async function createUser(fullName, email, password) {
    await db.read();
    
    const existingUser = db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
        throw new Error('Email already registered');
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
    
    return {
        sessionId,
        user: {
            id: newUser.id,
            fullName: newUser.fullName,
            email: newUser.email
        }
    };
}

async function authenticateUser(email, password) {
    await db.read();
    
    const user = db.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
        throw new Error('Invalid credentials');
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        throw new Error('Invalid credentials');
    }
    
    const sessionId = await createSession(user.id);
    
    return {
        sessionId,
        user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email
        }
    };
}

// Session management
async function createSession(userId) {
    await db.read();
    
    db.data.sessions = db.data.sessions.filter(s => s.userId !== userId);
    
    const sessionId = Date.now().toString();
    const session = {
        id: sessionId,
        userId,
        createdAt: new Date().toISOString()
    };
    
    db.data.sessions.push(session);
    await db.write();
    
    return sessionId;
}

async function validateSession(sessionId) {
    await db.read();
    
    const session = db.data.sessions.find(s => s.id === sessionId);
    if (!session) return null;
    
    const user = db.data.users.find(u => u.id === session.userId);
    return user || null;
}

async function removeSession(sessionId) {
    await db.read();
    db.data.sessions = db.data.sessions.filter(s => s.id !== sessionId);
    await db.write();
}

// Buddy matching functions
async function saveBuddyRequest(request) {
    await db.read();
    db.data.buddyRequests.push(request);
    await db.write();
    return request;
}

async function findPotentialMatches(request) {
    await db.read();
    return db.data.buddyRequests.filter(r => 
        r.userId !== request.userId &&
        r.status === 'active' &&
        r.date === request.date &&
        r.interests.some(i => request.interests.includes(i))
    );
}

async function createMatch(request1, request2) {
    const match = {
        id: generateMatchId(),
        users: [request1.userId, request2.userId],
        date: request1.date,
        interests: [...new Set([...request1.interests, ...request2.interests])],
        createdAt: new Date().toISOString()
    };
    
    await db.read();
    db.data.matches.push(match);
    
    // Update request statuses
    db.data.buddyRequests = db.data.buddyRequests.map(r => {
        if (r.id === request1.id || r.id === request2.id) {
            return { ...r, status: 'matched' };
        }
        return r;
    });
    
    await db.write();
    return match;
}

function generateMatchId() {
    return 'match_' + Math.random().toString(36).substr(2, 9);
}

export {
    db,
    initializeDatabase,
    createUser,
    authenticateUser,
    validateSession,
    removeSession,
    createSession,
    saveBuddyRequest,
    findPotentialMatches,
    createMatch
};
