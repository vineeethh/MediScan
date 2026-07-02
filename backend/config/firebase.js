const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized || getApps().length > 0) return true;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('⚠️  Firebase Admin SDK not configured (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY missing). Firebase token verification disabled.');
    return false;
  }

  try {
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        // dotenv stores the key with literal \n — convert to real newlines
        privateKey: privateKey.replace(/\\n/g, '\n')
      })
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized');
    return true;
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    return false;
  }
};

// Verify a Firebase ID token and return the decoded token
const verifyFirebaseToken = async (idToken) => {
  if (!firebaseInitialized && getApps().length === 0) {
    throw new Error('Firebase Admin not initialized');
  }
  return getAuth().verifyIdToken(idToken);
};

module.exports = { initializeFirebase, verifyFirebaseToken };
