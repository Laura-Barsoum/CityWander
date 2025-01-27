document.addEventListener("DOMContentLoaded", function() {
  const loginContainer = document.getElementById('login-container');
  const userInfo = document.getElementById('user-info');
  const usernameDisplay = document.getElementById('username');

  // Check if user is logged in
  const userName = localStorage.getItem('userName');
  if (userName) {
    loginContainer.style.display = 'none';  // Hide login container if user is logged in
    userInfo.style.display = 'inline-block';  // Show user info if user is logged in
    usernameDisplay.textContent = userName;  // Display the username
  } else {
    loginContainer.style.display = 'inline-block';  // Show login container if no user is logged in
    userInfo.style.display = 'none';  // Hide user info if no user is logged in
  }
});
AOS.init();

// Logout function
function logout() {
  localStorage.removeItem('userName');  // Remove the username from localStorage
  location.reload();  // Reload the page to recheck login status
}
