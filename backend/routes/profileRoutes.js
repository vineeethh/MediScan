const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const profileController = require('../controllers/profileController');

// All routes require authentication
router.use(protect);

// Get patient profile
router.get('/', profileController.getProfile);

// Check profile status
router.get('/status', profileController.checkProfileStatus);

// Get profile summary for AI
router.get('/summary', profileController.getProfileSummary);

// Update sections
router.put('/basic', profileController.updateBasicInfo);
router.put('/medical-history', profileController.updateMedicalHistory);
router.put('/lifestyle', profileController.updateLifestyle);

module.exports = router;
