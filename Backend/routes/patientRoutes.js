const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl    = require('../controllers/patientController');

/**
 * GET /api/patients/search?phone=xxx
 * Search patients by phone number. Requires auth.
 */
router.get('/search', requireAuth, ctrl.searchPatients);

/**
 * GET /api/patients/:id
 * Get full patient profile with onboarding data.
 */
router.get('/:id', requireAuth, ctrl.getPatient);

/**
 * GET /api/patients/:id/vitals?history=true&limit=10
 * Get latest vitals (or history with ?history=true).
 */
router.get('/:id/vitals', requireAuth, ctrl.getVitals);

/**
 * POST /api/patients/:id/vitals
 * Record new vitals for a patient (doctor auth required).
 */
router.post('/:id/vitals', requireAuth, ctrl.recordVitals);

/**
 * GET /api/patients/:id/medications
 * Get active medications from consultations.
 */
router.get('/:id/medications', requireAuth, ctrl.getMedications);

/**
 * GET /api/patients/:id/documents
 * Get patient documents.
 */
router.get('/:id/documents', requireAuth, ctrl.getDocuments);

module.exports = router;
