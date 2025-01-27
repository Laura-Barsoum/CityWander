// register.js
const API_URL = 'http://localhost:5001/api';

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    
    if (!registerForm) {
        console.error('Register form not found in the DOM');
        return;
    }

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        try {
            // Get and sanitize form values
            const fullName = document.getElementById('full-name')?.value.trim() ?? '';
            const email = document.getElementById('email')?.value.trim() ?? '';
            const password = document.getElementById('password')?.value ?? '';

            // Basic validation
            if (!fullName || !email || !password) {
                throw new Error('All fields are required');
            }

            // Email validation
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)) {
                throw new Error('Please enter a valid email address');
            }

            // Password validation
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            // Make the API request
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fullName,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `Registration failed: ${response.statusText}`);
            }

            // Store user data and session
            localStorage.setItem('sessionId', data.sessionId);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Show success message and redirect
            alert('Registration successful! Redirecting to homepage...');
            window.location.href = 'index.html';

        } catch (error) {
            console.error('Registration error:', error);
            alert(error.message || 'An error occurred during registration. Please try again.');
        }
    });
});
