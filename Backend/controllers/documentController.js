/**
 * Document Generation Controller
 * Express.js equivalent of the FastAPI document generation endpoint
 */

const { Packer } = require('docx');
const { generateConsultationDoc } = require('../services/documentGenerationService');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * POST /api/generate-document
 * Generate a clinical consultation Word document from transcript and extraction JSON
 * 
 * Request body:
 * {
 *   "consultation_id": "string",
 *   "transcript_json": { ... },
 *   "extraction_json": { ... }
 * }
 * 
 * Response: Word document file download
 */
async function generateDocument(req, res) {
  try {
    const { consultation_id, transcript_json, extraction_json } = req.body;

    // Validation
    if (!consultation_id) {
      return res.status(400).json({
        success: false,
        error: 'consultation_id is required'
      });
    }

    if (!transcript_json || !transcript_json.transcript || !transcript_json.transcript.turns) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transcript_json format. Must contain transcript.turns array'
      });
    }

    if (!extraction_json) {
      return res.status(400).json({
        success: false,
        error: 'extraction_json is required'
      });
    }

    // Generate document
    const doc = generateConsultationDoc(transcript_json, extraction_json);

    // Create temporary file
    const tempDir = os.tmpdir();
    const filename = `consultation_${consultation_id}_${Date.now()}.docx`;
    const tempPath = path.join(tempDir, filename);

    // Convert to buffer and save
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(tempPath, buffer);

    // Send file
    res.download(tempPath, `consultation_${consultation_id}.docx`, (err) => {
      // Clean up temp file after sending
      try {
        fs.unlinkSync(tempPath);
      } catch (cleanupErr) {
        console.error('Failed to delete temp file:', cleanupErr);
      }

      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to send document'
          });
        }
      }
    });

  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error while generating document'
    });
  }
}

/**
 * POST /api/generate-document-buffer
 * Alternative endpoint that returns the document as base64 instead of file download
 */
async function generateDocumentBuffer(req, res) {
  try {
    const { consultation_id, transcript_json, extraction_json } = req.body;

    // Validation
    if (!consultation_id || !transcript_json || !extraction_json) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Generate document
    const doc = generateConsultationDoc(transcript_json, extraction_json);
    const buffer = await Packer.toBuffer(doc);

    res.json({
      success: true,
      consultation_id,
      filename: `consultation_${consultation_id}.docx`,
      document: buffer.toString('base64'),
      size_kb: (buffer.length / 1024).toFixed(2)
    });

  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

module.exports = {
  generateDocument,
  generateDocumentBuffer,
};
