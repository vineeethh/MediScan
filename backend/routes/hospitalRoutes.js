const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const hospitalController = require('../controllers/hospitalController');
const { validate } = require('../middleware/errorMiddleware');

// Validation rules
const nearbyValidation = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('radius')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Radius must be between 100 and 50000 meters'),
  validate
];

const geocodeValidation = [
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  validate
];

const searchValidation = [
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required'),
  body('radius')
    .optional()
    .isInt({ min: 100, max: 50000 })
    .withMessage('Radius must be between 100 and 50000 meters'),
  validate
];

// Public routes
router.post('/nearby', nearbyValidation, hospitalController.findNearbyHospitals);
router.post('/geocode', geocodeValidation, hospitalController.geocodeAddress);
router.post('/search', searchValidation, hospitalController.searchByAddress);

module.exports = router;
