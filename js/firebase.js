/**
 * GyaniGuru Firebase Integration
 * Authentication and User Management
 */

// Firebase Configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase (when SDK is loaded)
let app = null;
let authInstance = null;
let db = null;

// Auth State Observer Callbacks
const authObservers = [];

// Auth Manager
const authManager = {
    currentUser: null,
    initialized: false,
    
    // Initialize Firebase
    init() {
        if (this.initialized) return;
        
        // Check if Firebase SDK is available
        if (typeof firebase === 'undefined') {
            CONFIG.log('Firebase SDK not loaded, using local mode');
            this.loadFromLocalStorage();
            this.initialized = true;
            return;
        }
        
        try {
            // Check if already initialized
            if (!firebase.apps.length) {
                app = firebase.initializeApp(firebaseConfig);
            } else {
                app = firebase.app();
            }
            
            authInstance = firebase.auth();
            db = firebase.firestore();
            
            // Set persistence
            authInstance.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            
            // Listen for auth state changes
            authInstance.onAuthStateChanged((user) => {
                this.currentUser = user;
                this.notifyObservers(user);
                
                if (user) {
                    this.syncUserData(user);
                }
            });
            
            this.initialized = true;
            CONFIG.log('Firebase initialized successfully');
        } catch (error) {
            CONFIG.error('Firebase initialization error:', error);
            this.loadFromLocalStorage();
            this.initialized = true;
        }
    },
    
    // Sign in with Google
    async signInWithGoogle() {
        if (!authInstance) {
            Toast.error('Authentication not available');
            return;
        }
        
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('email');
        provider.addScope('profile');
        
        try {
            const result = await authInstance.signInWithPopup(provider);
            CONFIG.log('Google sign-in successful:', result.user.email);
            Toast.success('Signed in successfully!');
            this.closeModal();
        } catch (error) {
            CONFIG.error('Google sign-in error:', error);
            Toast.error(error.message || 'Failed to sign in with Google');
        }
    },
    
    // Sign in with Email/Password
    async signInWithEmail(email, password) {
        if (!authInstance) {
            // Local mode fallback
            this.createLocalUser(email);
            return;
        }
        
        try {
            // Try to sign in
            const result = await authInstance.signInWithEmailAndPassword(email, password);
            CONFIG.log('Email sign-in successful:', result.user.email);
            Toast.success('Signed in successfully!');
            this.closeModal();
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                // Create new account
                try {
                    const result = await authInstance.createUserWithEmailAndPassword(email, password);
                    CONFIG.log('New account created:', result.user.email);
                    Toast.success('Account created successfully!');
                    this.closeModal();
                } catch (createError) {
                    CONFIG.error('Account creation error:', createError);
                    Toast.error(createError.message || 'Failed to create account');
                }
            } else {
                CONFIG.error('Email sign-in error:', error);
                Toast.error(error.message || 'Failed to sign in');
            }
        }
    },
    
    // Sign out
    async logout() {
        if (authInstance) {
            await authInstance.signOut();
        }
        this.clearLocalUser();
        Toast.success('Signed out successfully');
        window.location.reload();
    },
    
    // Get current user
    getCurrentUser() {
        return this.currentUser || this.getLocalUser();
    },
    
    // Get ID token for API calls
    async getIdToken() {
        if (this.currentUser) {
            return await this.currentUser.getIdToken();
        }
        return null;
    },
    
    // Subscribe to auth changes
    onAuthChange(callback) {
        authObservers.push(callback);
        // Call immediately with current state if initialized
        if (this.initialized) {
            callback(this.currentUser || this.getLocalUser());
        }
    },
    
    notifyObservers(user) {
        authObservers.forEach(callback => {
            try {
                callback(user);
            } catch (e) {
                CONFIG.error('Auth observer error:', e);
            }
        });
    },
    
    // Sync user data with Firestore
    async syncUserData(user) {
        if (!db) return;
        
        const userRef = db.collection('users').doc(user.uid);
        const doc = await userRef.get();
        
        if (!doc.exists) {
            // Create new user document
            await userRef.set({
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL || null,
                plan: 'free',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Update last login
            await userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    },
    
    // Local storage fallback for development/demo
    loadFromLocalStorage() {
        const localUser = this.getLocalUser();
        if (localUser) {
            this.currentUser = localUser;
            this.notifyObservers(localUser);
        }
    },
    
    getLocalUser() {
        const data = localStorage.getItem('gyaniguru_user');
        return data ? JSON.parse(data) : null;
    },
    
    createLocalUser(email) {
        const user = {
            uid: 'local_' + Date.now(),
            email: email,
            displayName: email.split('@')[0],
            photoURL: null,
            plan: 'free',
            isLocal: true
        };
        localStorage.setItem('gyaniguru_user', JSON.stringify(user));
        this.currentUser = user;
        this.notifyObservers(user);
        Toast.success('Signed in successfully! (Local mode)');
        this.closeModal();
    },
    
    clearLocalUser() {
        localStorage.removeItem('gyaniguru_user');
        this.currentUser = null;
    },
    
    // UI Methods
    showLoginModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.remove('hidden');
    },
    
    closeModal() {
        const modal = document.getElementById('auth-modal');
        if (modal) modal.classList.add('hidden');
    }
};

// Usage Tracker
const usageTracker = {
    // Get current usage data
    getUsage() {
        const user = authManager.getCurrentUser();
        const today = new Date().toDateString();
        
        // Check if user has pro plan in Firestore (would need real implementation)
        const plan = user?.plan || localStorage.getItem('gyaniguru_plan') || 'free';
        
        const storageKey = user ? `gyaniguru_usage_${user.uid}` : 'gyaniguru_usage_anonymous';
        let data = JSON.parse(localStorage.getItem(storageKey)) || {};
        
        // Reset if new day
        if (data.date !== today) {
            data = { date: today, used: 0, plan: plan };
            localStorage.setItem(storageKey, JSON.stringify(data));
        }
        
        return { ...data, plan };
    },
    
    // Record usage
    recordUsage() {
        const usage = this.getUsage();
        const user = authManager.getCurrentUser();
        const storageKey = user ? `gyaniguru_usage_${user.uid}` : 'gyaniguru_usage_anonymous';
        
        usage.used++;
        localStorage.setItem(storageKey, JSON.stringify(usage));
        
        return usage;
    },
    
    // Check if user can make request
    canUse() {
        const usage = this.getUsage();
        
        if (usage.plan === 'pro') return true;
        
        const limit = CONFIG.limits.free.dailyRequests;
        return usage.used < limit;
    },
    
    // Get remaining requests
    getRemaining() {
        const usage = this.getUsage();
        if (usage.plan === 'pro') return Infinity;
        return Math.max(0, CONFIG.limits.free.dailyRequests - usage.used);
    },
    
    // Upgrade to pro (placeholder)
    upgradeToPro() {
        localStorage.setItem('gyaniguru_plan', 'pro');
        Toast.success('Upgraded to Pro! (Demo mode)');
    }
};

// Initialize on load - CRITICAL: This must run before other scripts use auth
document.addEventListener('DOMContentLoaded', () => {
    authManager.init();
});

// Global auth object for HTML access - MUST be defined immediately
window.auth = {
    signInWithGoogle: () => authManager.signInWithGoogle(),
    signInWithEmail: (e) => {
        e.preventDefault();
        const email = document.getElementById('email-input')?.value;
        const password = document.getElementById('password-input')?.value;
        if (email && password) {
            authManager.signInWithEmail(email, password);
        }
    },
    logout: () => authManager.logout(),
    showLoginModal: () => authManager.showLoginModal(),
    closeModal: () => authManager.closeModal(),
    onAuthChange: (cb) => authManager.onAuthChange(cb),
    getCurrentUser: () => authManager.getCurrentUser(),
    // Add this to check if auth is ready
    isReady: () => authManager.initialized
};

window.usageTracker = usageTracker;
