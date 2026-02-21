<<<<<<< Updated upstream
const consultationService = require('../services/consultationService');

/**
 * POST /api/consultations
 */
const createConsultation = async (req, res) => {
  try {
    const { patient_id, transcription, soap_note, icd_codes, prescription, appointment_id } = req.body;

    if (!patient_id) {
      return res.status(400).json({ message: 'patient_id is required.' });
    }

    const consultation = await consultationService.create({
      doctor_id:      req.user.id,
      patient_id,
      transcription:  transcription || null,
      soap_note:      soap_note || {},
      icd_codes:      icd_codes || [],
      prescription:   prescription || [],
      appointment_id: appointment_id || null,
      status:         'draft',
    });

    res.status(201).json({ consultation });
  } catch (err) {
    console.error('[consultationController.create]', err.message);
    res.status(500).json({ message: 'Failed to create consultation.' });
  }
};

/**
 * GET /api/consultations/:id
 */
const getConsultation = async (req, res) => {
  try {
    const consultation = await consultationService.getById(req.params.id);
    if (!consultation) return res.status(404).json({ message: 'Consultation not found.' });
    res.json({ consultation });
  } catch (err) {
    console.error('[consultationController.getById]', err.message);
    res.status(500).json({ message: 'Failed to get consultation.' });
  }
};

/**
 * PUT /api/consultations/:id
 */
const updateConsultation = async (req, res) => {
  try {
    const allowed = ['transcription', 'soap_note', 'icd_codes', 'prescription', 'patient_summary', 'status'];
    const updateData = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    const consultation = await consultationService.update(req.params.id, updateData, req.user.id);
    res.json({ consultation });
  } catch (err) {
    console.error('[consultationController.update]', err.message);
    res.status(500).json({ message: 'Failed to update consultation.' });
  }
};

/**
 * GET /api/consultations/patient/:patientId
 */
const getPatientConsultations = async (req, res) => {
  try {
    const consultations = await consultationService.getByPatient(
      req.params.patientId,
      Number(req.query.limit) || 20
    );
    res.json({ consultations });
  } catch (err) {
    console.error('[consultationController.getByPatient]', err.message);
    res.status(500).json({ message: 'Failed to get consultations.' });
  }
};

/**
 * GET /api/consultations/doctor/:doctorId
 */
const getDoctorConsultations = async (req, res) => {
  try {
    const consultations = await consultationService.getByDoctor(req.params.doctorId, {
      status: req.query.status,
      limit:  Number(req.query.limit) || 20,
    });
    res.json({ consultations });
  } catch (err) {
    console.error('[consultationController.getByDoctor]', err.message);
    res.status(500).json({ message: 'Failed to get consultations.' });
  }
};

module.exports = {
  createConsultation,
  getConsultation,
  updateConsultation,
  getPatientConsultations,
  getDoctorConsultations,
=======
/**
 * Consultation Controller — Full pipeline for audio → transcribe → extract → summarize → PDF → email
 *
 * Flow:
 *  1. Doctor creates a new consultation (POST /consultations)
 *  2. Frontend sends audio batches (POST /consultations/:id/audio-batch)
 *     - Each batch is transcribed via FastAPI
 *     - Next batch start_time = previous batch end_time
 *     - Merged transcript stored in DB
 *  3. Doctor finalises recording (POST /consultations/:id/finalise)
 *     - Extracts medical entities via FastAPI
 *     - Generates doctor summary via MedGemma
 *     - Generates patient summary via MedGemma
 *     - Generates PDF for doctor (if requested)
 *     - Emails patient-friendly summary to patient
 *     - Updates consultation row with all results
 */

const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');
const aiService = require('../services/aiService');
const medgemma = require('../services/medgemmaService');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');

/* ─────────────────────── 1. CREATE CONSULTATION ─────────────────────── */
exports.createConsultation = async (req, res, next) => {
  try {
    const { doctor_id, patient_id, appointment_id } = req.body;
    if (!doctor_id || !patient_id) {
      return res.status(400).json({ success: false, message: 'doctor_id and patient_id are required.' });
    }
    const id = uuidv4();
    await pool.query(
      `INSERT INTO consultations
         (consultation_id, doctor_id, patient_id, status, appointment_id, consultation_date, transcription)
       VALUES ($1, $2, $3, 'recording', $4, NOW(), '')`,
      [id, doctor_id, patient_id, appointment_id || null],
    );
    res.json({ success: true, consultation_id: id });
  } catch (err) { next(err); }
};

/* ─────────────────────── 2. AUDIO BATCH ─────────────────────── */
exports.audioBatch = async (req, res, next) => {
  try {
    const { id } = req.params;                       // consultation_id
    const { batch_index, previous_end_time } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Audio file is required.' });
    }

    // 1. Send audio to FastAPI /transcribe
    let result;
    try {
      result = await aiService.transcribeAudio(
        req.file.buffer, req.file.originalname, req.file.mimetype,
      );
    } catch (aiErr) {
      console.error('[audioBatch] FastAPI transcription failed:', aiErr.message);
      return res.status(502).json({ success: false, message: 'AI transcription service error.', error: aiErr.message });
    }

    const transcript = result.transcript || {};
    const turns = transcript.turns || [];
    const prevEnd = parseFloat(previous_end_time) || 0;

    // 2. Offset timestamps: shift all start/end by previous_end_time
    const adjustedTurns = turns.map(t => ({
      ...t,
      start_time: t.start_time != null ? t.start_time + prevEnd : null,
      end_time: t.end_time != null ? t.end_time + prevEnd : null,
    }));

    // 3. Get the last end_time for the next batch
    let batchEndTime = prevEnd;
    for (const t of adjustedTurns) {
      if (t.end_time != null && t.end_time > batchEndTime) batchEndTime = t.end_time;
    }
    // fallback: use audio duration
    if (batchEndTime === prevEnd && result.audio_duration_seconds) {
      batchEndTime = prevEnd + result.audio_duration_seconds;
    }

    // 4. Format text for this batch
    const batchText = adjustedTurns.map(t => {
      const speaker = t.speaker === 'CLINICIAN' ? 'Doctor' : t.speaker === 'PATIENT' ? 'Patient' : t.speaker;
      return `${speaker}: ${t.text}`;
    }).join('\n\n');

    // 5. Append to existing transcription in DB
    const { rows } = await pool.query(
      `SELECT transcription FROM consultations WHERE consultation_id = $1`, [id],
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Consultation not found.' });

    const existing = rows[0].transcription || '';
    const merged = existing ? `${existing}\n\n${batchText}` : batchText;

    await pool.query(
      `UPDATE consultations SET transcription = $1, status = 'recording', updated_at = NOW() WHERE consultation_id = $2`,
      [merged, id],
    );

    res.json({
      success: true,
      batch_index: parseInt(batch_index) || 0,
      batch_turns: adjustedTurns,
      batch_text: batchText,
      batch_end_time: batchEndTime,
      raw_transcript_fragment: transcript.raw_transcript || '',
      total_transcript_length: merged.length,
    });
  } catch (err) { next(err); }
};

/* ─────────────────────── 3. FINALISE CONSULTATION ─────────────────────── */
exports.finalise = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Fetch consultation + patient + doctor
    const { rows } = await pool.query(
      `SELECT c.*, p.full_name AS patient_name, p.email AS patient_email,
              p.date_of_birth, p.gender, p.blood_group, p.phone AS patient_phone,
              d.full_name AS doctor_name, d.specialization, d.email AS doctor_email
       FROM consultations c
       JOIN patients p ON p.patient_id = c.patient_id
       JOIN doctors d  ON d.doctor_id  = c.doctor_id
       WHERE c.consultation_id = $1`, [id],
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Consultation not found.' });
    const consult = rows[0];

    if (!consult.transcription || consult.transcription.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'No transcription data to process.' });
    }

    // 2. Extract entities via FastAPI
    let entities = {};
    try {
      const extractResult = await aiService.extractEntities(consult.transcription);
      entities = extractResult.entities || extractResult;
    } catch (e) {
      console.warn('[finalise] FastAPI extract failed, using MedGemma direct:', e.message);
      entities = await medgemma.extractEntitiesDirect(consult.transcription);
    }

    // 3. Fetch patient onboarding data for richer context
    const onboardResult = await pool.query(
      `SELECT * FROM patient_onboarding WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [consult.patient_id],
    );
    const onboarding = onboardResult.rows[0] || {};

    const patientDetails = {
      full_name: consult.patient_name,
      email: consult.patient_email,
      phone: consult.patient_phone,
      date_of_birth: consult.date_of_birth,
      gender: consult.gender,
      blood_group: consult.blood_group,
      existing_conditions: {
        diabetes: onboarding.has_diabetes ? onboarding.diabetes_type : 'none',
        heart_disease: onboarding.has_heart_disease,
        lung_disease: onboarding.has_lung_disease,
        medications: onboarding.medications_list,
        allergies: onboarding.allergies_list,
      },
    };

    // 4. Generate doctor summary via MedGemma
    const doctorSummary = await medgemma.generateDoctorSummary({
      transcript: consult.transcription,
      entities,
      patientDetails,
    });

    // 5. Generate patient summary via MedGemma
    const patientSummary = await medgemma.generatePatientSummary({
      transcript: consult.transcription,
      entities,
      patientDetails,
      doctorName: consult.doctor_name,
    });

    // 6. Build ICD codes array
    const icdCodes = [];
    if (entities.symptoms) entities.symptoms.forEach(s => (s.icd_codes || []).forEach(c => icdCodes.push(c)));
    if (entities.diagnoses) entities.diagnoses.forEach(d => (d.icd_codes || []).forEach(c => icdCodes.push(c)));
    if (doctorSummary.diagnoses) {
      doctorSummary.diagnoses.forEach(d => {
        if (d.icd_code) icdCodes.push({ code: d.icd_code, description: d.condition });
      });
    }

    // 7. Build SOAP note from doctor summary
    const soapNote = {
      subjective: doctorSummary.chief_complaint || '',
      objective: doctorSummary.physical_examination || '',
      assessment: doctorSummary.assessment || '',
      plan: (doctorSummary.plan || []).join('; '),
      hpi: doctorSummary.history_of_present_illness || '',
      ros: doctorSummary.review_of_systems || '',
    };

    // 8. Store EMR record
    const emrId = uuidv4();
    await pool.query(
      `INSERT INTO emr_records (emr_id, consultation_id, patient_id, record_data, status, created_at)
       VALUES ($1, $2, $3, $4, 'completed', NOW())`,
      [emrId, id, consult.patient_id, JSON.stringify({ entities, doctor_summary: doctorSummary, patient_summary: patientSummary })],
    );

    // 9. Update consultation
    await pool.query(
      `UPDATE consultations
       SET soap_note       = $1,
           icd_codes       = $2,
           patient_summary = $3,
           status          = 'completed',
           updated_at      = NOW()
       WHERE consultation_id = $4`,
      [JSON.stringify(soapNote), JSON.stringify(icdCodes), JSON.stringify(patientSummary), id],
    );

    // 10. Generate PDFs
    let doctorPdfBuffer = null;
    let patientPdfBuffer = null;
    try {
      doctorPdfBuffer = await pdfService.generateDoctorPDF({
        consultation_id: id,
        patient: patientDetails,
        doctor: { name: consult.doctor_name, specialization: consult.specialization },
        summary: doctorSummary,
        entities,
        icdCodes,
        date: consult.consultation_date,
      });
      patientPdfBuffer = await pdfService.generatePatientPDF({
        consultation_id: id,
        patient: patientDetails,
        doctor: { name: consult.doctor_name, specialization: consult.specialization },
        summary: patientSummary,
        date: consult.consultation_date,
      });
    } catch (pdfErr) {
      console.error('[finalise] PDF generation error:', pdfErr.message);
    }

    // 11. Email patient summary
    if (consult.patient_email) {
      try {
        await emailService.sendPatientSummary({
          to: consult.patient_email,
          patientName: consult.patient_name,
          doctorName: consult.doctor_name,
          consultationId: id,
          summary: patientSummary,
          date: consult.consultation_date,
          pdfBuffer: patientPdfBuffer,
        });
      } catch (emailErr) {
        console.error('[finalise] Email send error:', emailErr.message);
      }
    }

    // 12. Respond
    res.json({
      success: true,
      consultation_id: id,
      emr_id: emrId,
      entities,
      doctor_summary: doctorSummary,
      patient_summary: patientSummary,
      soap_note: soapNote,
      icd_codes: icdCodes,
      pdf_available: !!doctorPdfBuffer,
      email_sent: !!consult.patient_email,
    });
  } catch (err) { next(err); }
};

/* ────────────── 4. GET CONSULTATION DETAIL ────────────── */
exports.getConsultation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT c.*, p.full_name AS patient_name, p.email AS patient_email,
              p.phone AS patient_phone, p.gender, p.blood_group, p.date_of_birth,
              d.full_name AS doctor_name, d.specialization
       FROM consultations c
       JOIN patients p ON p.patient_id = c.patient_id
       JOIN doctors d  ON d.doctor_id  = c.doctor_id
       WHERE c.consultation_id = $1`, [id],
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found.' });

    // Also get EMR data
    const emrResult = await pool.query(
      `SELECT * FROM emr_records WHERE consultation_id = $1 ORDER BY created_at DESC LIMIT 1`, [id],
    );

    res.json({
      success: true,
      consultation: rows[0],
      emr_record: emrResult.rows[0] || null,
    });
  } catch (err) { next(err); }
};

/* ────────────── 5. LIST CONSULTATIONS FOR A PATIENT ────────────── */
exports.listConsultations = async (req, res, next) => {
  try {
    const { patient_id, doctor_id } = req.query;
    let q = `SELECT c.consultation_id, c.status, c.consultation_date, c.created_at,
                    p.full_name AS patient_name, d.full_name AS doctor_name, d.specialization
             FROM consultations c
             JOIN patients p ON p.patient_id = c.patient_id
             JOIN doctors d  ON d.doctor_id  = c.doctor_id
             WHERE 1=1`;
    const params = [];
    if (patient_id) { params.push(patient_id); q += ` AND c.patient_id = $${params.length}`; }
    if (doctor_id)  { params.push(doctor_id);  q += ` AND c.doctor_id  = $${params.length}`; }
    q += ' ORDER BY c.consultation_date DESC LIMIT 50';
    const { rows } = await pool.query(q, params);
    res.json({ success: true, consultations: rows });
  } catch (err) { next(err); }
};

/* ────────────── 6. DOWNLOAD DOCTOR PDF ────────────── */
exports.downloadDoctorPDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Fetch the data
    const { rows } = await pool.query(
      `SELECT c.*, p.full_name AS patient_name, p.email AS patient_email,
              p.phone AS patient_phone, p.gender, p.blood_group, p.date_of_birth,
              d.full_name AS doctor_name, d.specialization
       FROM consultations c
       JOIN patients p ON p.patient_id = c.patient_id
       JOIN doctors d  ON d.doctor_id  = c.doctor_id
       WHERE c.consultation_id = $1`, [id],
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found.' });
    const c = rows[0];

    const emrResult = await pool.query(
      `SELECT record_data FROM emr_records WHERE consultation_id = $1 ORDER BY created_at DESC LIMIT 1`, [id],
    );
    const emrData = emrResult.rows[0]?.record_data || {};

    const buf = await pdfService.generateDoctorPDF({
      consultation_id: id,
      patient: { full_name: c.patient_name, gender: c.gender, blood_group: c.blood_group, date_of_birth: c.date_of_birth, phone: c.patient_phone },
      doctor: { name: c.doctor_name, specialization: c.specialization },
      summary: emrData.doctor_summary || {},
      entities: emrData.entities || {},
      icdCodes: typeof c.icd_codes === 'string' ? JSON.parse(c.icd_codes) : (c.icd_codes || []),
      date: c.consultation_date,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="consultation-${id.slice(0, 8)}-doctor.pdf"`);
    res.send(buf);
  } catch (err) { next(err); }
>>>>>>> Stashed changes
};
