const hospitalService = require('../services/hospitalService');
const Analytics = require('../models/Analytics');

// @desc    Find nearby hospitals
// @route   POST /api/hospitals/nearby
// @access  Public
exports.findNearbyHospitals = async (req, res, next) => {
  try {
    const { latitude, longitude, radius = 5000 } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide latitude and longitude'
      });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates'
      });
    }

    const hospitals = await hospitalService.findNearbyHospitals(
      parseFloat(latitude),
      parseFloat(longitude),
      parseInt(radius)
    );

    // Update analytics
    await Analytics.incrementMetric('hospitalSearches');

    res.json({
      success: true,
      data: {
        count: hospitals.length,
        hospitals
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Geocode address to coordinates
// @route   POST /api/hospitals/geocode
// @access  Public
exports.geocodeAddress = async (req, res, next) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an address'
      });
    }

    const result = await hospitalService.geocodeAddress(address);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search hospitals by address
// @route   POST /api/hospitals/search
// @access  Public
exports.searchByAddress = async (req, res, next) => {
  try {
    const { address, radius = 5000 } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an address'
      });
    }

    // First geocode the address
    const location = await hospitalService.geocodeAddress(address);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Address not found. Please try a different address.'
      });
    }

    // Then find hospitals near those coordinates
    const hospitals = await hospitalService.findNearbyHospitals(
      location.latitude,
      location.longitude,
      parseInt(radius)
    );

    // Update analytics
    await Analytics.incrementMetric('hospitalSearches');

    res.json({
      success: true,
      data: {
        location: {
          address: location.displayName,
          latitude: location.latitude,
          longitude: location.longitude
        },
        count: hospitals.length,
        hospitals
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
