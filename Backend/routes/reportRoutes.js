const express = require('express');
const router = express.Router();
const {
  uploadReport,
  getPatientReports,
  getPatientHistory,
  deleteReport
} = require('../controllers/reportController');

// Optional: Add authentication middleware
// const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/reports/upload
 * @desc    Upload a patient report (PDF or image)
 * @access  Private (Doctor only)
 */
router.post('/upload', uploadReport);

/**
 * @route   GET /api/reports/patient/:patientId
 * @desc    Get all reports for a specific patient
 * @access  Private (Doctor/Patient)
 */
router.get('/patient/:patientId', getPatientReports);

/**
 * @route   GET /api/reports/history/:patientId
 * @desc    Get comprehensive patient history with all reports and summaries
 * @access  Private (Doctor only)
 */
router.get('/history/:patientId', getPatientHistory);

/**
 * @route   DELETE /api/reports/:reportId
 * @desc    Delete a specific report
 * @access  Private (Doctor only)
 */
router.delete('/:reportId', deleteReport);

module.exports = router;
