<<<<<<< Updated upstream
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl    = require('../controllers/aiController');

/**
 * POST /api/ai/chat
 * Send a message to the AI assistant.
 * Body: { message: string, context?: object }
 */
router.post('/chat', requireAuth, ctrl.chat);

/**
 * POST /api/ai/soap-note
 * Generate SOAP note from transcription.
 * Body: { transcription: string, patient_context?: object }
 */
router.post('/soap-note', requireAuth, ctrl.soapNote);

/**
 * POST /api/ai/icd-codes
 * Generate ICD-10 codes from transcription/diagnosis.
 * Body: { transcription?: string, diagnosis?: string }
 */
router.post('/icd-codes', requireAuth, ctrl.icdCodes);
=======
/**
 * AI Routes — Proxy endpoints to the FastAPI AI backend
 *
 * All routes are prefixed with /api/ai (registered in index.js)
 *
 * POST /api/ai/transcribe         Upload audio → transcript
 * POST /api/ai/extract            Transcript → medical entities
 * POST /api/ai/generate-emr       Entities → full EMR record
 * POST /api/ai/patient-summary    EMR → patient-friendly summary
 * POST /api/ai/pipeline           Full pipeline (audio → EMR + summary) in one call
 * POST /api/ai/icd-lookup         ICD code search
 * POST /api/ai/suggest-diagnoses  AI differential diagnosis
 * GET  /api/ai/health             AI backend health check
 * GET  /api/ai/emr-records        List EMR records (by patient / consultation)
 * GET  /api/ai/emr-records/:emrId Get single EMR record
 */

const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const ai      = require('../controllers/aiController');

// Multer — in-memory storage for audio uploads (max 100 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// ── Pipeline endpoints ──────────────────────────────────────────────────────
router.post('/transcribe',        upload.single('file'), ai.transcribe);
router.post('/extract',                                  ai.extract);
router.post('/generate-emr',                             ai.generateEMR);
router.post('/patient-summary',                          ai.patientSummary);
router.post('/pipeline',          upload.single('file'), ai.fullPipeline);

// ── ICD / Diagnosis ─────────────────────────────────────────────────────────
router.post('/icd-lookup',           ai.icdLookup);
router.post('/suggest-diagnoses',    ai.suggestDiagnoses);

// ── Records ─────────────────────────────────────────────────────────────────
router.get('/emr-records',           ai.getEMRRecords);
router.get('/emr-records/:emrId',    ai.getEMRRecord);

// ── Health ──────────────────────────────────────────────────────────────────
router.get('/health',                ai.aiHealth);
>>>>>>> Stashed changes

module.exports = router;
