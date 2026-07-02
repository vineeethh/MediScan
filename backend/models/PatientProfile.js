const mongoose = require('mongoose');

const PatientProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Basic Information
  age: {
    type: Number,
    required: true,
    min: 0,
    max: 150
  },
  gender: {
    type: String,
    required: true,
    enum: ['male', 'female', 'other', 'prefer-not-to-say']
  },
  height: {
    value: { type: Number, required: true },
    unit: { type: String, enum: ['cm', 'inches'], default: 'cm' }
  },
  weight: {
    value: { type: Number, required: true },
    unit: { type: String, enum: ['kg', 'lbs'], default: 'kg' }
  },
  
  // Medical History
  chronicConditions: [{
    condition: String,
    diagnosedDate: Date,
    status: { type: String, enum: ['active', 'managed', 'resolved'], default: 'active' }
  }],
  
  familyHistory: [{
    condition: String,
    relation: String,
    notes: String
  }],
  
  surgicalHistory: [{
    procedure: String,
    date: Date,
    complications: String
  }],
  
  allergies: [{
    allergen: String,
    reaction: String,
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'moderate' }
  }],
  
  // Current Medications
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    purpose: String
  }],
  
  // Lifestyle Factors
  smokingIntensity: {
    type: String,
    enum: ['never', 'former', 'light', 'moderate', 'heavy'],
    default: 'never'
  },
  smokingDetails: {
    cigarettesPerDay: Number,
    yearsSmoked: Number,
    quitDate: Date
  },
  
  alcoholIntake: {
    type: String,
    enum: ['never', 'occasionally', 'moderate', 'heavy'],
    default: 'never'
  },
  alcoholDetails: {
    drinksPerWeek: Number,
    type: String // beer, wine, spirits
  },
  
  dietaryHabits: {
    type: { type: String, enum: ['vegetarian', 'vegan', 'non-vegetarian', 'other'] },
    restrictions: [String],
    waterIntake: { type: Number, default: 0 }, // glasses per day
    notes: String
  },
  
  physicalActivity: {
    level: { 
      type: String, 
      enum: ['sedentary', 'light', 'moderate', 'active', 'very-active'],
      default: 'sedentary'
    },
    exerciseMinutesPerWeek: Number,
    activityTypes: [String]
  },
  
  sleepPattern: {
    averageHoursPerNight: { type: Number, min: 0, max: 24 },
    quality: { type: String, enum: ['poor', 'fair', 'good', 'excellent'] },
    issues: [String] // insomnia, snoring, etc.
  },
  
  stressLevels: {
    current: { type: Number, min: 1, max: 10 }, // 1-10 scale
    sources: [String],
    copingMethods: [String]
  },
  
  // Profile Status
  isComplete: {
    type: Boolean,
    default: false
  },
  completedSections: {
    basicInfo: { type: Boolean, default: false },
    medicalHistory: { type: Boolean, default: false },
    lifestyle: { type: Boolean, default: false }
  },
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate BMI
PatientProfileSchema.virtual('bmi').get(function() {
  if (!this.height || !this.weight) return null;
  
  let heightInMeters = this.height.value;
  let weightInKg = this.weight.value;
  
  // Convert to metric if needed
  if (this.height.unit === 'inches') {
    heightInMeters = this.height.value * 0.0254;
  } else {
    heightInMeters = this.height.value / 100;
  }
  
  if (this.weight.unit === 'lbs') {
    weightInKg = this.weight.value * 0.453592;
  }
  
  const bmi = weightInKg / (heightInMeters * heightInMeters);
  return Math.round(bmi * 10) / 10;
});

// Get BMI category
PatientProfileSchema.methods.getBMICategory = function() {
  const bmi = this.bmi;
  if (!bmi) return 'Unknown';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

// Get risk factors
PatientProfileSchema.methods.getRiskFactors = function() {
  const risks = [];
  
  if (this.age > 65) risks.push('Advanced age');
  if (this.smokingIntensity !== 'never' && this.smokingIntensity !== 'former') {
    risks.push('Current smoker');
  }
  if (this.alcoholIntake === 'heavy') risks.push('Heavy alcohol use');
  if (this.physicalActivity.level === 'sedentary') risks.push('Sedentary lifestyle');
  if (this.bmi && this.bmi >= 30) risks.push('Obesity');
  if (this.sleepPattern.averageHoursPerNight < 6) risks.push('Sleep deprivation');
  if (this.stressLevels.current >= 8) risks.push('High stress levels');
  if (this.chronicConditions.length > 0) {
    risks.push(`Chronic conditions: ${this.chronicConditions.map(c => c.condition).join(', ')}`);
  }
  
  return risks;
};

// Update profile completeness
PatientProfileSchema.pre('save', function(next) {
  this.completedSections.basicInfo = !!(this.age && this.gender && this.height && this.weight);
  this.completedSections.medicalHistory = !!(
    this.chronicConditions.length > 0 || 
    this.familyHistory.length > 0 ||
    this.surgicalHistory.length > 0
  );
  this.completedSections.lifestyle = !!(
    this.smokingIntensity &&
    this.alcoholIntake &&
    this.physicalActivity.level &&
    this.sleepPattern.averageHoursPerNight
  );
  
  this.isComplete = Object.values(this.completedSections).every(v => v === true);
  this.lastUpdated = Date.now();
  
  next();
});

module.exports = mongoose.model('PatientProfile', PatientProfileSchema);
