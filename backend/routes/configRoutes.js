const express = require('express');
const router = express.Router();

// @desc    Get Firebase configuration for frontend
// @route   GET /api/config/firebase
// @access  Public
router.get('/firebase', (req, res) => {
  try {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };

    // Check if Firebase is configured
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'your_firebase_api_key_here') {
      return res.status(503).json({
        success: false,
        message: 'Firebase is not configured. Please add Firebase credentials to .env file.',
        configured: false
      });
    }

    res.json({
      success: true,
      configured: true,
      config: firebaseConfig
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving Firebase configuration',
      configured: false
    });
  }
});

module.exports = router;
