const express = require('express');
const router = express.Router();
const {
  searchPatient,
  getPatientById,
  getPatientProfile
} = require('../controllers/patientController');

// Optional: Add authentication middleware
// const { authenticateToken } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/patients/search?phone=123456789
 * @desc    Search for a patient by phone number
 * @access  Private (Doctor only)
 */
router.get('/search', searchPatient);

/**
 * @route   GET /api/patients/:patientId
 * @desc    Get patient details by ID
 * @access  Private (Doctor/Patient)
 */
router.get('/:patientId', getPatientById);

/**
 * @route   GET /api/patients/:patientId/profile
 * @desc    Get comprehensive patient profile
 * @access  Private (Doctor only)
 */
router.get('/:patientId/profile', getPatientProfile);

module.exports = router;
