const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const reminderController = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/errorMiddleware');

const reminderValidation = [
  body('medicineName').trim().notEmpty().withMessage('Medicine name is required').isLength({ max: 100 }),
  body('times').isArray({ min: 1 }).withMessage('At least one time is required'),
  validate
];

router.use(protect); // All reminder routes require authentication

router.get('/', reminderController.getReminders);
router.post('/', reminderValidation, reminderController.createReminder);
router.put('/:id', reminderController.updateReminder);
router.patch('/:id/toggle', reminderController.toggleReminder);
router.delete('/:id', reminderController.deleteReminder);

module.exports = router;
