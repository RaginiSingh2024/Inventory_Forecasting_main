// Registration handling
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const registerBtn = document.querySelector('.login-btn');
    const btnText = document.querySelector('.btn-text');
    const btnLoader = document.querySelector('.btn-loader');

    // Wait for window.auth to be available
    function initAuth() {
        if (window.auth) {
            console.log('Auth service available for registration');
            // Check if user is already logged in
            window.auth.onAuthStateChanged(user => {
                if (user) {
                    // User is signed in, redirect to dashboard
                    window.location.href = 'dashboard.html';
                }
            });
        } else {
            // Retry after a short delay
            setTimeout(initAuth, 100);
        }
    }
    
    initAuth();

    // Handle registration form submission
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fullName = fullNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Validate inputs
        if (!validateInputs(fullName, email, password, confirmPassword)) {
            return;
        }

        // Show loading state
        showLoading(true);
        hideMessages();

        try {
            // Check if auth is available
            if (!window.auth) {
                throw new Error('Authentication service not available');
            }
            
            console.log('Creating user account for:', email);
            
            // Create user with Firebase Auth
            const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('User account created successfully:', user.uid);
            
            // Update user profile with display name
            await user.updateProfile({
                displayName: fullName
            });
            
            console.log('User profile updated with display name');
            
            // Store additional user data in Firestore
            await window.db.collection('users').doc(user.uid).set({
                fullName: fullName,
                email: email,
                createdAt: new Date(),
                role: 'user'
            });
            
            console.log('User data stored in Firestore');
            
            // Show success message
            showSuccess('Account created successfully! Redirecting to dashboard...');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);
            
        } catch (error) {
            console.error('Registration error:', error);
            showError(getErrorMessage(error.code || error.message));
        } finally {
            showLoading(false);
        }
    });

    // Validate form inputs
    function validateInputs(fullName, email, password, confirmPassword) {
        if (!fullName) {
            showError('Please enter your full name.');
            return false;
        }
        
        if (!email) {
            showError('Please enter your email address.');
            return false;
        }
        
        if (!password) {
            showError('Please enter a password.');
            return false;
        }
        
        if (password.length < 6) {
            showError('Password must be at least 6 characters long.');
            return false;
        }
        
        if (password !== confirmPassword) {
            showError('Passwords do not match.');
            return false;
        }
        
        return true;
    }

    // Show/hide loading state
    function showLoading(loading) {
        if (loading) {
            btnText.style.display = 'none';
            btnLoader.style.display = 'inline-block';
            registerBtn.disabled = true;
        } else {
            btnText.style.display = 'inline-block';
            btnLoader.style.display = 'none';
            registerBtn.disabled = false;
        }
    }

    // Show error message
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        errorMessage.classList.add('fade-in');
        successMessage.style.display = 'none';
    }

    // Show success message
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        successMessage.classList.add('fade-in');
        errorMessage.style.display = 'none';
    }

    // Hide all messages
    function hideMessages() {
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        errorMessage.classList.remove('fade-in');
        successMessage.classList.remove('fade-in');
    }

    // Get user-friendly error message
    function getErrorMessage(errorCode) {
        switch (errorCode) {
            case 'auth/email-already-in-use':
                return 'An account with this email already exists.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/operation-not-allowed':
                return 'Email/password accounts are not enabled.';
            case 'auth/weak-password':
                return 'Password is too weak. Please choose a stronger password.';
            case 'Authentication service not available':
                return 'Authentication service is loading. Please try again in a moment.';
            default:
                return 'Registration failed. Please try again.';
        }
    }
});
