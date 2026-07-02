const PatientProfile = require('../models/PatientProfile');
const User = require('../models/User');

// Get or create patient profile
exports.getProfile = async (req, res) => {
  try {
    let profile = await PatientProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      // Create new profile with defaults
      profile = new PatientProfile({
        userId: req.user._id,
        age: 0,
        gender: 'prefer-not-to-say',
        height: { value: 0, unit: 'cm' },
        weight: { value: 0, unit: 'kg' }
      });
      await profile.save();
    }
    
    res.json({
      success: true,
      profile: profile,
      bmi: profile.bmi,
      bmiCategory: profile.getBMICategory(),
      riskFactors: profile.getRiskFactors()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

// Update basic information
exports.updateBasicInfo = async (req, res) => {
  try {
    const { age, gender, height, weight } = req.body;
    
    const profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        age,
        gender,
        height,
        weight
      },
      { new: true, upsert: true, runValidators: true }
    );
    
    res.json({
      success: true,
      message: 'Basic information updated',
      profile,
      bmi: profile.bmi,
      bmiCategory: profile.getBMICategory()
    });
  } catch (error) {
    console.error('Update basic info error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating basic information',
      error: error.message
    });
  }
};

// Update medical history
exports.updateMedicalHistory = async (req, res) => {
  try {
    const { chronicConditions, familyHistory, surgicalHistory, allergies, medications } = req.body;
    
    const profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        chronicConditions,
        familyHistory,
        surgicalHistory,
        allergies,
        medications
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Medical history updated',
      profile
    });
  } catch (error) {
    console.error('Update medical history error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating medical history',
      error: error.message
    });
  }
};

// Update lifestyle information
exports.updateLifestyle = async (req, res) => {
  try {
    const { 
      smokingIntensity, 
      smokingDetails,
      alcoholIntake, 
      alcoholDetails,
      dietaryHabits, 
      physicalActivity, 
      sleepPattern, 
      stressLevels 
    } = req.body;
    
    const profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user._id },
      {
        smokingIntensity,
        smokingDetails,
        alcoholIntake,
        alcoholDetails,
        dietaryHabits,
        physicalActivity,
        sleepPattern,
        stressLevels
      },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Lifestyle information updated',
      profile,
      riskFactors: profile.getRiskFactors()
    });
  } catch (error) {
    console.error('Update lifestyle error:', error);
    res.status(400).json({
      success: false,
      message: 'Error updating lifestyle information',
      error: error.message
    });
  }
};

// Get profile summary for AI analysis
exports.getProfileSummary = async (req, res) => {
  try {
    const profile = await PatientProfile.findOne({ userId: req.user._id });
    
    if (!profile || !profile.isComplete) {
      return res.status(400).json({
        success: false,
        message: 'Profile is incomplete. Please complete all sections.',
        isComplete: profile ? profile.isComplete : false
      });
    }
    
    const summary = {
      demographics: {
        age: profile.age,
        gender: profile.gender,
        bmi: profile.bmi,
        bmiCategory: profile.getBMICategory()
      },
      medicalHistory: {
        chronicConditions: profile.chronicConditions.map(c => c.condition),
        familyHistory: profile.familyHistory.map(f => `${f.condition} (${f.relation})`),
        allergies: profile.allergies.map(a => a.allergen),
        currentMedications: profile.medications.map(m => m.name)
      },
      lifestyle: {
        smoking: profile.smokingIntensity,
        alcohol: profile.alcoholIntake,
        exercise: profile.physicalActivity.level,
        sleep: `${profile.sleepPattern.averageHoursPerNight} hours (${profile.sleepPattern.quality})`,
        stress: `${profile.stressLevels.current}/10`
      },
      riskFactors: profile.getRiskFactors()
    };
    
    res.json({
      success: true,
      summary,
      profile
    });
  } catch (error) {
    console.error('Get profile summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting profile summary',
      error: error.message
    });
  }
};

// Check if profile is complete
exports.checkProfileStatus = async (req, res) => {
  try {
    const profile = await PatientProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.json({
        success: true,
        exists: false,
        isComplete: false,
        completedSections: {
          basicInfo: false,
          medicalHistory: false,
          lifestyle: false
        }
      });
    }
    
    res.json({
      success: true,
      exists: true,
      isComplete: profile.isComplete,
      completedSections: profile.completedSections,
      lastUpdated: profile.lastUpdated
    });
  } catch (error) {
    console.error('Check profile status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking profile status',
      error: error.message
    });
  }
};

module.exports = exports;
