const express = require('express');
const router = express.Router();
const multer = require('multer');
const appointmentController = require('../controllers/appointmentController');

// Configure multer for file uploads (store in memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB max file size
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['audio/webm', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'video/webm', 'video/mp4'];
        if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(webm|wav|mp3|ogg|mp4)$/)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only audio/video recordings are allowed.'));
        }
    }
});

// =============================================
// APPOINTMENT ROUTES
// =============================================

/**
 * @route   POST /api/appointments
 * @desc    Create appointment with automated pipeline (telehealth)
 * @access  Public/Patient
 */
router.post('/', appointmentController.createAppointmentRequest);

/**
 * @route   POST /api/appointments/request
 * @desc    Create appointment request (by patient) - LEGACY ROUTE
 * @access  Public/Patient
 */
router.post('/request', appointmentController.createAppointmentRequest);

/**
 * @route   POST /api/appointments/:appointmentId/confirm
 * @desc    Confirm appointment and create Google Meet link (by doctor)
 * @access  Doctor
 */
router.post('/:appointmentId/confirm', appointmentController.confirmAppointment);

/**
 * @route   GET /api/appointments/:appointmentId
 * @desc    Get appointment by ID
 * @access  Public/Doctor/Patient
 */
router.get('/:appointmentId', appointmentController.getAppointment);

/**
 * @route   PUT /api/appointments/:appointmentId
 * @desc    Update appointment details
 * @access  Doctor/Patient
 */
router.put('/:appointmentId', appointmentController.updateAppointment);

/**
 * @route   POST /api/appointments/:appointmentId/cancel
 * @desc    Cancel appointment
 * @access  Doctor/Patient
 */
router.post('/:appointmentId/cancel', appointmentController.cancelAppointment);

/**
 * @route   GET /api/appointments/doctor/:doctorId
 * @desc    Get all appointments for a doctor
 * @access  Doctor
 * @query   status, startDate, endDate
 */
router.get('/doctor/:doctorId', appointmentController.getDoctorAppointments);

/**
 * @route   GET /api/appointments/patient/:patientId
 * @desc    Get all appointments for a patient
 * @access  Patient
 * @query   status
 */
router.get('/patient/:patientId', appointmentController.getPatientAppointments);

// =============================================
// RECORDING ROUTES
// =============================================

/**
 * @route   POST /api/appointments/:appointmentId/recording
 * @desc    Upload meeting recording (converts to MP3 and stores in Azure)
 * @access  Doctor
 */
router.post('/:appointmentId/recording', upload.single('recording'), appointmentController.uploadRecording);

/**
 * @route   GET /api/recordings/:blobName/sas-url
 * @desc    Generate new SAS URL for accessing recording
 * @access  Doctor/Patient
 * @query   expiryHours (optional, default: 24)
 */
router.get('/recordings/:blobName/sas-url', appointmentController.generateRecordingSasUrl);

// =============================================
// DOCTOR ROUTES
// =============================================

/**
 * @route   GET /api/appointments/doctors
 * @desc    Get all doctors
 * @access  Public
 * @query   specialization (optional)
 */
router.get('/doctors/all', appointmentController.getAllDoctors);

// =============================================
// GOOGLE OAUTH ROUTES
// =============================================

/**
 * @route   GET /api/appointments/google/auth-url
 * @desc    Get Google OAuth authorization URL
 * @access  Doctor
 */
router.get('/google/auth-url', appointmentController.getGoogleAuthUrl);

/**
 * @route   GET /api/appointments/google/oauth2callback
 * @desc    Google OAuth callback endpoint (GET - redirected from Google)
 * @access  Public
 */
router.get('/google/oauth2callback', appointmentController.googleOAuthCallback);

/**
 * @route   POST /api/appointments/google/callback
 * @desc    Exchange auth code for tokens (POST - from frontend)
 * @access  Public
 */
router.post('/google/callback', appointmentController.exchangeCodeForTokens);

module.exports = router;
