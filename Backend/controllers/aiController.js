<<<<<<< Updated upstream
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
=======
/**
 * AI Controller — Orchestrates AI pipeline calls and DB persistence
 *
 * Each endpoint proxies to the FastAPI AI backend, then stores
 * results in the existing consultations / emr_records tables.
 */

const aiService = require('../services/aiService');
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// ─────────────────────────────────────────────────────────────────────────────
// 1. TRANSCRIBE  →  stores transcription in consultations row
// ─────────────────────────────────────────────────────────────────────────────
exports.transcribe = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file is required.' });
    }

    const { patient_id, doctor_id, appointment_id } = req.body;

    // Forward audio to FastAPI
    const result = await aiService.transcribeAudio(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
    );

    // If doctor/patient provided, create or update a consultation row
    let consultation_id = null;
    if (doctor_id && patient_id) {
      const row = await pool.query(
        `INSERT INTO consultations
           (consultation_id, doctor_id, patient_id, transcription, status, appointment_id, consultation_date)
         VALUES ($1, $2, $3, $4, 'transcribed', $5, NOW())
         RETURNING consultation_id`,
        [uuidv4(), doctor_id, patient_id, result.transcript.raw_transcript, appointment_id || null],
      );
      consultation_id = row.rows[0].consultation_id;
    }

    res.json({
      success: true,
      consultation_id,
      transcript: result.transcript,
      audio_duration_seconds: result.audio_duration_seconds,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. EXTRACT  →  returns entities (caller can pass them to generate-emr)
// ─────────────────────────────────────────────────────────────────────────────
exports.extract = async (req, res, next) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ success: false, message: 'transcript is required.' });
    }

    const result = await aiService.extractEntities(transcript);

    // Optionally update consultation with extracted ICD codes
    const { consultation_id } = req.body;
    if (consultation_id && result.entities) {
      const icdCodes = [
        ...(result.entities.symptoms || []).flatMap(s => s.icd_codes || []),
        ...(result.entities.diagnoses || []).flatMap(d => d.icd_codes || []),
      ];
      await pool.query(
        `UPDATE consultations SET icd_codes = $1, updated_at = NOW() WHERE consultation_id = $2`,
        [JSON.stringify(icdCodes), consultation_id],
      );
    }

    res.json({ success: true, entities: result.entities });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GENERATE EMR  →  stores full EMR record + updates consultation SOAP note
// ─────────────────────────────────────────────────────────────────────────────
exports.generateEMR = async (req, res, next) => {
  try {
    const { entities, transcript, consultation_id, patient_id, encounter_date,
            encounter_type, audio_duration, patient_name, provider_name, facility_name } = req.body;

    if (!entities || !transcript) {
      return res.status(400).json({ success: false, message: 'entities and transcript are required.' });
    }

    const result = await aiService.generateEMR({
      entities, transcript, patient_id, encounter_date,
      encounter_type, audio_duration, patient_name, provider_name, facility_name,
    });

    const emr = result.emr_record;

    // Store full EMR in emr_records table
    const emrId = uuidv4();
    await pool.query(
      `INSERT INTO emr_records
         (emr_id, consultation_id, patient_id, record_data, status, created_at)
       VALUES ($1, $2, $3, $4, 'draft', NOW())`,
      [emrId, consultation_id || null, patient_id || null, JSON.stringify(emr)],
    );

    // Update consultation with SOAP note + ICD codes extracted from EMR
    if (consultation_id) {
      const soapNote = emr.narratives || {};
      const icdCodes = emr.icd10_codes || [];
      await pool.query(
        `UPDATE consultations
         SET soap_note  = $1,
             icd_codes  = $2,
             status     = 'emr_generated',
             updated_at = NOW()
         WHERE consultation_id = $3`,
        [JSON.stringify(soapNote), JSON.stringify(icdCodes), consultation_id],
      );
    }

    res.json({ success: true, emr_id: emrId, emr_record: emr });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. PATIENT SUMMARY  →  stores in consultations.patient_summary
// ─────────────────────────────────────────────────────────────────────────────
exports.patientSummary = async (req, res, next) => {
  try {
    const { emr_record, consultation_id } = req.body;
    if (!emr_record) {
      return res.status(400).json({ success: false, message: 'emr_record is required.' });
    }

    const result = await aiService.generatePatientSummary(emr_record);

    if (consultation_id) {
      await pool.query(
        `UPDATE consultations SET patient_summary = $1, updated_at = NOW() WHERE consultation_id = $2`,
        [result.patient_summary, consultation_id],
      );
    }

    res.json({ success: true, patient_summary: result.patient_summary });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. FULL PIPELINE  →  transcribe + extract + EMR + summary in one call
// ─────────────────────────────────────────────────────────────────────────────
exports.fullPipeline = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file is required.' });
    }

    const { patient_id, doctor_id, appointment_id, encounter_type,
            patient_name, provider_name, facility_name } = req.body;

    // Step 1: Transcribe
    const transcribeResult = await aiService.transcribeAudio(
      req.file.buffer, req.file.originalname, req.file.mimetype,
    );
    const { transcript, audio_duration_seconds } = transcribeResult;

    // Step 2: Extract entities
    const extractResult = await aiService.extractEntities(transcript);
    const { entities } = extractResult;

    // Step 3: Generate EMR
    const emrResult = await aiService.generateEMR({
      entities, transcript, patient_id,
      encounter_date: new Date().toISOString().split('T')[0],
      encounter_type: encounter_type || 'outpatient',
      audio_duration: audio_duration_seconds,
      patient_name, provider_name, facility_name,
    });
    const emr = emrResult.emr_record;

    // Step 4: Patient summary
    const summaryResult = await aiService.generatePatientSummary(emr);

    // ── Persist everything ──────────────────────────────────────────────
    const consultationId = uuidv4();
    const emrId = uuidv4();

    // Consultation row
    if (doctor_id && patient_id) {
      const soapNote = emr.narratives || {};
      const icdCodes = emr.icd10_codes || [];

      await pool.query(
        `INSERT INTO consultations
           (consultation_id, doctor_id, patient_id, transcription,
            soap_note, icd_codes, patient_summary, status,
            appointment_id, consultation_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', $8, NOW())`,
        [
          consultationId, doctor_id, patient_id,
          transcript.raw_transcript,
          JSON.stringify(soapNote),
          JSON.stringify(icdCodes),
          summaryResult.patient_summary,
          appointment_id || null,
        ],
      );
    }

    // Full EMR record
    await pool.query(
      `INSERT INTO emr_records
         (emr_id, consultation_id, patient_id, record_data, status, created_at)
       VALUES ($1, $2, $3, $4, 'completed', NOW())`,
      [emrId, doctor_id && patient_id ? consultationId : null, patient_id || null, JSON.stringify(emr)],
    );

    res.json({
      success: true,
      consultation_id: consultationId,
      emr_id: emrId,
      transcript,
      entities,
      emr_record: emr,
      patient_summary: summaryResult.patient_summary,
      audio_duration_seconds,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. ICD LOOKUP
// ─────────────────────────────────────────────────────────────────────────────
exports.icdLookup = async (req, res, next) => {
  try {
    const { query, version, top_k } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, message: 'query is required.' });
    }
    const result = await aiService.icdLookup(query, version, top_k);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. SUGGEST DIAGNOSES
// ─────────────────────────────────────────────────────────────────────────────
exports.suggestDiagnoses = async (req, res, next) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms || !symptoms.length) {
      return res.status(400).json({ success: false, message: 'symptoms array is required.' });
    }
    const result = await aiService.suggestDiagnoses(req.body);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. AI HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
exports.aiHealth = async (_req, res, next) => {
  try {
    const result = await aiService.checkHealth();
    res.json({ success: true, ai_backend: result });
  } catch (err) {
    res.json({
      success: false,
      message: 'AI backend is not reachable',
      error: err.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. GET EMR RECORDS (by patient or consultation)
// ─────────────────────────────────────────────────────────────────────────────
exports.getEMRRecords = async (req, res, next) => {
  try {
    const { patient_id, consultation_id } = req.query;
    let query = 'SELECT * FROM emr_records WHERE 1=1';
    const params = [];

    if (patient_id) {
      params.push(patient_id);
      query += ` AND patient_id = $${params.length}`;
    }
    if (consultation_id) {
      params.push(consultation_id);
      query += ` AND consultation_id = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC';

    const { rows } = await pool.query(query, params);
    res.json({ success: true, records: rows });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. GET SINGLE EMR RECORD
// ─────────────────────────────────────────────────────────────────────────────
exports.getEMRRecord = async (req, res, next) => {
  try {
    const { emrId } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM emr_records WHERE emr_id = $1', [emrId],
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'EMR record not found.' });
    }
    res.json({ success: true, record: rows[0] });
  } catch (err) {
    next(err);
  }
};
>>>>>>> Stashed changes
