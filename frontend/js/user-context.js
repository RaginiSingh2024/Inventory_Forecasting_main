// User Context Management
// This module manages the current user's context and provides user-specific data access

class UserContext {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.initialized = false;
    }

    // Initialize user context
    async init() {
        return new Promise((resolve, reject) => {
            if (!window.auth) {
                reject(new Error('Firebase Auth not available'));
                return;
            }

            // Listen for auth state changes
            window.auth.onAuthStateChanged(async (user) => {
                try {
                    if (user) {
                        this.currentUser = user;
                        await this.loadUserProfile();
                        console.log('User context initialized for:', user.email);
                    } else {
                        this.currentUser = null;
                        this.userProfile = null;
                        console.log('User context cleared - no authenticated user');
                    }
                    this.initialized = true;
                    resolve(user);
                } catch (error) {
                    console.error('Error initializing user context:', error);
                    reject(error);
                }
            });
        });
    }

    // Load user profile from Firestore
    async loadUserProfile() {
        if (!this.currentUser || !window.db) {
            return null;
        }

        try {
            const doc = await window.db.collection('users').doc(this.currentUser.uid).get();
            if (doc.exists) {
                this.userProfile = doc.data();
                console.log('User profile loaded:', this.userProfile);
            } else {
                // Create user profile if it doesn't exist
                this.userProfile = {
                    fullName: this.currentUser.displayName || 'User',
                    email: this.currentUser.email,
                    createdAt: new Date(),
                    role: 'user'
                };
                await window.db.collection('users').doc(this.currentUser.uid).set(this.userProfile);
                console.log('User profile created:', this.userProfile);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
            this.userProfile = null;
        }
    }

    // Get current user ID
    getCurrentUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }

    // Get current user email
    getCurrentUserEmail() {
        return this.currentUser ? this.currentUser.email : null;
    }

    // Get current user profile
    getCurrentUserProfile() {
        return this.userProfile;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Wait for initialization
    async waitForInit() {
        if (this.initialized) {
            return this.currentUser;
        }

        return new Promise((resolve) => {
            const checkInit = () => {
                if (this.initialized) {
                    resolve(this.currentUser);
                } else {
                    setTimeout(checkInit, 100);
                }
            };
            checkInit();
        });
    }

    // Get user-specific collection reference
    getUserCollection(collectionName) {
        const userId = this.getCurrentUserId();
        if (!userId || !window.db) {
            throw new Error('User not authenticated or database not available');
        }
        
        // Return a reference to user-specific subcollection
        return window.db.collection('users').doc(userId).collection(collectionName);
    }

    // Get user-specific document reference
    getUserDocument(collectionName, docId) {
        const userId = this.getCurrentUserId();
        if (!userId || !window.db) {
            throw new Error('User not authenticated or database not available');
        }
        
        return window.db.collection('users').doc(userId).collection(collectionName).doc(docId);
    }

    // Sign out user
    async signOut() {
        try {
            await window.auth.signOut();
            this.currentUser = null;
            this.userProfile = null;
            console.log('User signed out successfully');
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        }
    }
}

// Create global user context instance
window.userContext = new UserContext();

// Initialize user context when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Wait for Firebase to be available
        const waitForFirebase = () => {
            return new Promise((resolve) => {
                const checkFirebase = () => {
                    if (window.auth && window.db) {
                        resolve();
                    } else {
                        setTimeout(checkFirebase, 100);
                    }
                };
                checkFirebase();
            });
        };

        await waitForFirebase();
        await window.userContext.init();
        console.log('User context initialized successfully');
    } catch (error) {
        console.error('Failed to initialize user context:', error);
    }
});
