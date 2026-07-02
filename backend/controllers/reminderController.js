const Reminder = require('../models/Reminder');

// @desc    Get all reminders for the logged-in user
// @route   GET /api/reminders
// @access  Private
exports.getReminders = async (req, res, next) => {
  try {
    const reminders = await Reminder.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: reminders });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new reminder
// @route   POST /api/reminders
// @access  Private
exports.createReminder = async (req, res, next) => {
  try {
    const { medicineName, dosage, frequency, times, startDate, endDate, instructions, color } = req.body;

    if (!medicineName) {
      return res.status(400).json({ success: false, message: 'Medicine name is required' });
    }
    if (!times || times.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one reminder time is required' });
    }

    const reminder = await Reminder.create({
      userId: req.user._id,
      medicineName: medicineName.trim(),
      dosage: dosage?.trim() || '',
      frequency: frequency || 'once_daily',
      times,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : null,
      instructions: instructions?.trim() || '',
      color: color || '#3b82f6'
    });

    res.status(201).json({ success: true, data: reminder });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a reminder
// @route   PUT /api/reminders/:id
// @access  Private
exports.updateReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    if (reminder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const allowed = ['medicineName', 'dosage', 'frequency', 'times', 'startDate', 'endDate', 'instructions', 'color', 'isActive'];
    allowed.forEach(field => { if (req.body[field] !== undefined) reminder[field] = req.body[field]; });
    await reminder.save();

    res.json({ success: true, data: reminder });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle reminder active/inactive
// @route   PATCH /api/reminders/:id/toggle
// @access  Private
exports.toggleReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    if (reminder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    reminder.isActive = !reminder.isActive;
    await reminder.save();
    res.json({ success: true, data: reminder, message: `Reminder ${reminder.isActive ? 'activated' : 'paused'}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a reminder
// @route   DELETE /api/reminders/:id
// @access  Private
exports.deleteReminder = async (req, res, next) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
    if (reminder.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    await reminder.deleteOne();
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (error) {
    next(error);
  }
};
