// Firebase Configuration Module
// Fetches Firebase config from backend API and initializes Firebase

let firebaseApp = null;
let firebaseAuth = null;
let firebaseConfigData = null;

// Backend API URL
const API_URL = 'http://localhost:3001/api';

/**
 * Initialize Firebase with config from backend
 * @returns {Promise<Object>} Firebase app and auth instances
 */
async function initializeFirebase() {
    if (firebaseApp && firebaseAuth) {
        return { app: firebaseApp, auth: firebaseAuth };
    }

    try {
        // Fetch Firebase config from backend
        const response = await fetch(`${API_URL}/config/firebase`);
        const data = await response.json();

        if (!data.success || !data.configured) {
            console.error('Firebase not configured:', data.message);
            throw new Error(data.message || 'Firebase is not configured');
        }

        firebaseConfigData = data.config;

        // Import Firebase modules
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

        // Initialize Firebase
        firebaseApp = initializeApp(firebaseConfigData);
        firebaseAuth = getAuth(firebaseApp);

        console.log('✅ Firebase initialized successfully');
        return { app: firebaseApp, auth: firebaseAuth };
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        throw error;
    }
}

/**
 * Get Firebase auth instance
 * @returns {Promise<Object>} Firebase auth instance
 */
async function getFirebaseAuth() {
    if (!firebaseAuth) {
        const { auth } = await initializeFirebase();
        return auth;
    }
    return firebaseAuth;
}

/**
 * Check if Firebase is configured
 * @returns {Promise<boolean>}
 */
async function isFirebaseConfigured() {
    try {
        const response = await fetch(`${API_URL}/config/firebase`);
        const data = await response.json();
        return data.configured === true;
    } catch (error) {
        console.error('Error checking Firebase configuration:', error);
        return false;
    }
}

// Export functions
export { 
    initializeFirebase, 
    getFirebaseAuth, 
    isFirebaseConfigured 
};
