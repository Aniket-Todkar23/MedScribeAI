const aiService = require('../services/aiService');

/**
 * POST /api/ai/chat
 */
const chat = async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required.' });
    }
    const reply = await aiService.chat({ message, context });
    res.json({ reply });
  } catch (err) {
    console.error('[aiController.chat]', err.message);
    res.status(500).json({ message: 'AI chat failed.' });
  }
};

/**
 * POST /api/ai/soap-note
 */
const soapNote = async (req, res) => {
  try {
    const { transcription, patient_context } = req.body;
    if (!transcription || !transcription.trim()) {
      return res.status(400).json({ message: 'Transcription text is required.' });
    }
    const soap = await aiService.generateSoapNote({ transcription, patient_context });
    res.json({ soap_note: soap });
  } catch (err) {
    console.error('[aiController.soapNote]', err.message);
    res.status(500).json({ message: 'SOAP note generation failed.' });
  }
};

/**
 * POST /api/ai/icd-codes
 */
const icdCodes = async (req, res) => {
  try {
    const { transcription, diagnosis } = req.body;
    if (!transcription && !diagnosis) {
      return res.status(400).json({ message: 'Transcription or diagnosis is required.' });
    }
    const codes = await aiService.generateIcdCodes({ transcription, diagnosis });
    res.json({ icd_codes: codes });
  } catch (err) {
    console.error('[aiController.icdCodes]', err.message);
    res.status(500).json({ message: 'ICD code generation failed.' });
  }
};

module.exports = { chat, soapNote, icdCodes };
