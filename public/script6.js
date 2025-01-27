// Global login check
const isAuthenticated = localStorage.getItem('sessionId') && localStorage.getItem('user');

let currentMatchId = null;
let socket = null;

document.addEventListener('DOMContentLoaded', () => {
    if (isAuthenticated) {
        const userData = JSON.parse(localStorage.getItem('user'));
        const loginBtn = document.getElementById('login-btn');
        const userInfo = document.getElementById('user-info');
        const username = document.getElementById('username');

        if (loginBtn) loginBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'block';
        if (username) username.textContent = `Hello, ${userData.fullName}`;
        
        initializeSocket();
    }
    setupFormHandlers();
    setupChatHandlers();
});

function initializeSocket() {
    const sessionId = localStorage.getItem('sessionId');
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
}

function setupFormHandlers() {
    const travelBuddyForm = document.getElementById('travelBuddyForm');
    if (travelBuddyForm) {
        travelBuddyForm.addEventListener('submit', handleBuddyFormSubmit);
    }
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

async function handleBuddyFormSubmit(e) {
    e.preventDefault();
    
    if (isAuthenticated) {
        const date = document.getElementById('dates').value;
        const interests = Array.from(document.getElementById('interests').selectedOptions)
            .map(option => option.value);

        try {
            const response = await fetch('http://localhost:5001/api/find-buddy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'session-id': localStorage.getItem('sessionId')
                },
                body: JSON.stringify({ date, interests })
            });

            const data = await response.json();
            handleMatchResponse(data);
        } catch (error) {
            document.getElementById('results').innerHTML = `
                <div class="error-message">
                    Error finding a buddy. Please try again.
                </div>
            `;
        }
    } else {
        document.getElementById('results').innerHTML = `
            <div class="login-prompt">
                <h3>Login Required</h3>
                <p>Please <a href="login.html">login</a> to find a travel buddy!</p>
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
        socket.emit('join_match_room', data.match.id);
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
    if (message && currentMatchId) {
        socket.emit('send_message', {
            message: message,
            matchId: currentMatchId
        });
        chatInput.value = '';
    }
}

function appendMessage(sender, message) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    const currentUser = JSON.parse(localStorage.getItem('user'));
    messageDiv.className = `message ${sender === currentUser.id ? 'sent' : 'received'}`;
    messageDiv.innerHTML = `
        <span class="sender">${sender === currentUser.id ? 'You' : 'Travel Buddy'}</span>
        <p>${message}</p>
        <span class="timestamp">${new Date().toLocaleTimeString()}</span>
    `;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

window.startChat = function(matchId) {
    document.getElementById('chat-container').style.display = 'block';
    currentMatchId = matchId;
    socket.emit('join_match_room', matchId);
};
