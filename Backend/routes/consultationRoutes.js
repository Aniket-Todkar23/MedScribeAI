const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl    = require('../controllers/consultationController');

/**
 * POST /api/consultations
 * Create a new consultation (doctor auth required).
 */
router.post('/', requireAuth, ctrl.createConsultation);

/**
 * GET /api/consultations/patient/:patientId
 * Get consultations for a patient.
 */
router.get('/patient/:patientId', requireAuth, ctrl.getPatientConsultations);

/**
 * GET /api/consultations/doctor/:doctorId
 * Get consultations for a doctor.
 */
router.get('/doctor/:doctorId', requireAuth, ctrl.getDoctorConsultations);

/**
 * GET /api/consultations/:id
 * Get single consultation by ID.
 */
router.get('/:id', requireAuth, ctrl.getConsultation);

/**
 * PUT /api/consultations/:id
 * Update consultation (SOAP, ICD, prescription, status, transcription).
 */
router.put('/:id', requireAuth, ctrl.updateConsultation);

module.exports = router;
