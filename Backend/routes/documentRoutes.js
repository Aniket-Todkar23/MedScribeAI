/**
 * Document Generation Routes
 */

const express = require('express');
const router = express.Router();
const { generateDocument, generateDocumentBuffer } = require('../controllers/documentController');

// Generate and download Word document
router.post('/generate-document', generateDocument);

// Generate and return as base64 buffer
router.post('/generate-document-buffer', generateDocumentBuffer);

module.exports = router;
