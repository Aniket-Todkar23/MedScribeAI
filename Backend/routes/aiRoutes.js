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

module.exports = router;
