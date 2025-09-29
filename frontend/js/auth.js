// Authentication handling for login page
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('errorMessage');
    const loginBtn = document.querySelector('.login-btn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.querySelector('.btn-loader');

    // Wait for window.auth to be available
    function initAuth() {
        if (window.auth) {
            console.log('Auth service available - setting up auth state listener');
            // Check if user is already logged in
            window.auth.onAuthStateChanged(user => {
                console.log('Login page - Auth state changed:', user ? 'User logged in' : 'User not logged in');
                if (user) {
                    // User is signed in, redirect to dashboard
                    console.log('Redirecting to dashboard...');
                    window.location.href = 'dashboard.html';
                }
            });
        } else {
            // Retry after a short delay
            setTimeout(initAuth, 100);
        }
    }
    
    initAuth();

    // Handle login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        // Show loading state
        showLoading(true);
        hideError();

        try {
            // Check if auth is available
            if (!window.auth) {
                throw new Error('Authentication service not available');
            }
            
            // Sign in with Firebase Auth
            await window.auth.signInWithEmailAndPassword(email, password);
            
            // Success - redirect will happen automatically via onAuthStateChanged
            console.log('Login successful');
            
        } catch (error) {
            console.error('Login error:', error);
            showError(getErrorMessage(error.message));
        } finally {
            showLoading(false);
        }
    });

    // Show/hide loading state
    function showLoading(loading) {
        if (loading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            loginBtn.disabled = true;
        } else {
            btnText.style.display = 'inline-block';
            btnLoader.style.display = 'none';
            loginBtn.disabled = false;
        }
    }

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.classList.add('fade-in');
    }

    // Hide error message
    function hideError() {
        errorMessage.style.display = 'none';
        errorMessage.classList.remove('fade-in');
    }

    // Get user-friendly error message
    function getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/user-not-found':
                return 'No account found with this email address.';
            case 'auth/wrong-password':
                return 'Incorrect password. Please try again.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/user-disabled':
                return 'This account has been disabled.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            case 'Invalid credentials':
                return 'Invalid email or password. Please check your credentials.';
            case 'Authentication service not available':
                return 'Authentication service is loading. Please try again in a moment.';
            default:
                return 'Login failed. Please try again.';
        }
    }

    // Real-time authentication - no demo credentials needed
});
