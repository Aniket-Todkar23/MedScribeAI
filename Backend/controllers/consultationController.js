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
};
