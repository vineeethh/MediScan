const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const chatController = require('../controllers/chatController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorMiddleware');

// Validation rules
const messageValidation = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 })
    .withMessage('Message cannot exceed 1000 characters'),
  validate
];

const analyzeValidation = [
  body('symptoms')
    .trim()
    .notEmpty()
    .withMessage('Symptoms are required'),
  validate
];

const ratingValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  validate
];

// Public routes (with optional auth)
router.post('/stream', optionalAuth, chatController.streamMessage); // SSE streaming endpoint
router.post('/message', optionalAuth, messageValidation, chatController.sendMessage);
router.post('/analyze', analyzeValidation, chatController.analyzeSymptoms);
router.get('/conversation/:sessionId', optionalAuth, chatController.getConversation);
router.post('/conversation/:sessionId/rate', ratingValidation, chatController.rateConversation);

// Protected routes (require authentication)
router.get('/history', protect, chatController.getConversationHistory);
router.delete('/conversation/:sessionId', protect, chatController.deleteConversation);

module.exports = router;
