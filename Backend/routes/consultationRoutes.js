const express = require('express');
<<<<<<< Updated upstream
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
=======
const multer  = require('multer');
const router  = express.Router();
const ctrl    = require('../controllers/consultationController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },   // 100 MB per batch
});

// Create a new consultation
router.post('/',                      ctrl.createConsultation);

// Send audio batch for transcription
router.post('/:id/audio-batch',       upload.single('audio'), ctrl.audioBatch);

// Finalise: extract + summarise + PDF + email
router.post('/:id/finalise',          ctrl.finalise);

// Get consultation details
router.get('/:id',                    ctrl.getConsultation);

// List consultations (filter by patient_id / doctor_id)
router.get('/',                       ctrl.listConsultations);

// Download doctor PDF
router.get('/:id/pdf/doctor',        ctrl.downloadDoctorPDF);
>>>>>>> Stashed changes

module.exports = router;
