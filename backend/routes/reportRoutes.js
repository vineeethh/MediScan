const express = require('express');
const router = express.Router();
const multer = require('multer');
const reportController = require('../controllers/reportController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

// Store file in memory (no disk writes) — max 10MB PDF
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

router.post('/analyze', optionalAuth, upload.single('report'), reportController.analyzeReport);
router.post('/analyze-with-context', optionalAuth, upload.single('report'), reportController.analyzeReportWithContext);
router.get('/history', protect, reportController.getReportHistory);
router.get('/:id', protect, reportController.getReport);

module.exports = router;
