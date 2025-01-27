document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    
    // Handle existing user session
    const user = localStorage.getItem('user');
    if (user) {
        updateUIForLoggedInUser(JSON.parse(user));
    }

    // Setup login form handler
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
});

function updateUIForLoggedInUser(user) {
    document.getElementById('login-btn').style.display = 'none';
    const userInfoDiv = document.getElementById('user-info');
    userInfoDiv.style.display = 'block';
    document.getElementById('username').textContent = `Hello, ${user.fullName}`;
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://localhost:5001/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            handleSuccessfulLogin(data);
        } else {
            handleLoginError(data.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        handleLoginError('Network error occurred');
    }
}

function handleSuccessfulLogin(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('sessionId', data.sessionId);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Redirect based on the page user was trying to access
    const intendedPage = sessionStorage.getItem('intendedPage') || 'index.html';
    sessionStorage.removeItem('intendedPage');
    window.location.href = intendedPage;
}

function handleLoginError(message) {
    alert(message || 'Login failed. Please check your credentials.');
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// Export necessary functions
window.logout = logout;
