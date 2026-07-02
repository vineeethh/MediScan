const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  medicineName: { type: String, required: true, trim: true, maxlength: 100 },
  dosage: { type: String, trim: true, default: '' },
  frequency: {
    type: String,
    enum: ['once_daily', 'twice_daily', 'thrice_daily', 'every_8_hours', 'weekly', 'as_needed'],
    default: 'once_daily'
  },
  times: [{ type: String }], // ["08:00", "20:00"] in HH:MM format
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: null },
  instructions: { type: String, default: '' }, // "Take after food", "Avoid milk"
  isActive: { type: Boolean, default: true },
  color: { type: String, default: '#3b82f6' } // For UI color-coding
}, { timestamps: true });

module.exports = mongoose.model('Reminder', ReminderSchema);
