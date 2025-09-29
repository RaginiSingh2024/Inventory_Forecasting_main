// Authentication check for protected pages
document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;

    // Wait for window.auth to be available
    function initAuthCheck() {
        if (window.auth) {
            console.log('Auth check initialized - checking authentication state');
            // Check authentication state
            window.auth.onAuthStateChanged(user => {
                console.log('Auth state changed:', user ? 'User logged in' : 'User not logged in');
                if (user) {
                    currentUser = user;
                    // User is signed in
                    displayUserInfo(user);
                    setupLogout();
                } else {
                    // User is not signed in, redirect to login
                    console.log('Redirecting to login page');
                    window.location.href = 'index.html';
                }
            });
        } else {
            console.log('Waiting for auth service...');
            // Retry after a short delay
            setTimeout(initAuthCheck, 100);
        }
    }
    
    initAuthCheck();

    // Display user information
    function displayUserInfo(user) {
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
        }
    }

    // Setup logout functionality
    function setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function() {
                try {
                    await window.auth.signOut();
                    // Redirect will happen automatically via onAuthStateChanged
                } catch (error) {
                    console.error('Logout error:', error);
                    alert('Error signing out. Please try again.');
                }
            });
        }
    }

    // Make current user available globally
    window.getCurrentUser = function() {
        return currentUser;
    };
});
