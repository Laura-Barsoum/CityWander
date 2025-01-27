// State management
let currentUser = null;
let socket = null;
let currentMatchId = null;

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
});

function checkAuthStatus() {
    const sessionId = localStorage.getItem('sessionId');
    const userStr = localStorage.getItem('user');
    
    if (sessionId && userStr) {
        currentUser = JSON.parse(userStr);
        updateUI(currentUser);
        initializeSocket();
    } else {
        updateUI(null);
    }
}

function updateUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const userInfo = document.getElementById('user-info');
    const username = document.getElementById('username');
    
    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (username) username.textContent = `Welcome, ${user.fullName}`;
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
    }
}

function setupEventListeners() {
    const travelBuddyForm = document.getElementById('travelBuddyForm');
    if (travelBuddyForm) {
        travelBuddyForm.addEventListener('submit', handleBuddyFormSubmit);
    }

    setupChatHandlers();
}

function setupChatHandlers() {
    const sendButton = document.getElementById('send-button');
    const chatInput = document.getElementById('chat-input');
    
    if (sendButton && chatInput) {
        sendButton.addEventListener('click', () => {
            sendMessage(chatInput);
        });

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage(chatInput);
            }
        });
    }
}

function initializeSocket() {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) return;

    socket = io('http://localhost:5001', {
        auth: { sessionId },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000
    });

    socket.on('connect', () => {
        console.log('Connected to socket server');
    });

    socket.on('receive_message', (data) => {
        appendMessage(data.sender, data.message);
    });

    socket.on('match_found', (data) => {
        handleMatchResponse({ match: data });
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
    });
}
async function handleBuddyFormSubmit(e) {
    e.preventDefault();
    
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
        document.getElementById('results').innerHTML = `
            <div class="login-prompt">
                <h3>Login Required</h3>
                <p>You must be logged in to find a travel buddy and view matches.</p>
            </div>
        `;
        return;
    }

    const date = document.getElementById('dates').value;
    const interests = Array.from(document.getElementById('interests').selectedOptions)
        .map(option => option.value);

    try {
        const response = await fetch('http://localhost:5001/api/find-buddy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': sessionId
            },
            body: JSON.stringify({ date, interests })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        handleMatchResponse(data);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('results').innerHTML = `
            <div class="error-message">
                Error connecting to the server. Please try again later.
            </div>
        `;
    }
}
function handleMatchResponse(data) {
    const resultsDiv = document.getElementById('results');
    
    if (data.match) {
        currentMatchId = data.match.id;
        resultsDiv.innerHTML = `
            <div class="match-card">
                <h3>Match Found!</h3>
                <p>You've been matched with someone who shares your interests!</p>
                <p>Travel Date: ${new Date(data.match.date).toLocaleDateString()}</p>
                <p>Shared Interests: ${data.match.interests.join(', ')}</p>
                <button onclick="startChat('${data.match.id}')">Start Chat</button>
            </div>
        `;
        document.getElementById('chat-container').style.display = 'block';
    } else {
        resultsDiv.innerHTML = `
            <div class="waiting-card">
                <h3>Request Saved</h3>
                <p>We'll notify you when we find a match for your travel date!</p>
            </div>
        `;
    }
}

function sendMessage(chatInput) {
    const message = chatInput.value.trim();
    if (message && currentMatchId && socket) {
        socket.emit('send_message', {
            message: message,
            matchId: currentMatchId
        });
        
        chatInput.value = '';
        
        const currentUser = JSON.parse(localStorage.getItem('user'));
        appendMessage(currentUser.id, message);
    }
}

function appendMessage(senderId, message) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    const currentUser = JSON.parse(localStorage.getItem('user'));
    
    messageDiv.className = `message ${senderId === currentUser.id ? 'sent' : 'received'}`;
    messageDiv.innerHTML = `
        <span class="sender">${senderId === currentUser.id ? 'You' : 'Travel Buddy'}</span>
        <p>${message}</p>
        <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    `;
    
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function startChat(matchId) {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.style.display = 'block';
        currentMatchId = matchId;
        if (socket) {
            socket.emit('join_match_room', matchId);
        }
    }
}

async function loginUser(email, password) {
    try {
        const response = await fetch('http://localhost:5001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('sessionId', data.sessionId);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            
            const storedPage = sessionStorage.getItem('intendedPage');
            window.location.href = storedPage || 'index.html';
            return { success: true };
        }
        return { success: false, message: data.message };
    } catch (error) {
        return { success: false, message: 'Connection error' };
    }
}

function logout() {
    if (socket) {
        socket.disconnect();
    }
    localStorage.clear();
    currentUser = null;
    window.location.href = 'login.html';
}

// Export necessary functions to global scope
window.loginUser = loginUser;
window.logout = logout;
window.startChat = startChat;
window.sendMessage = sendMessage;
window.appendMessage = appendMessage;