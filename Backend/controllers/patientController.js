const patientService = require('../services/patientService');

/**
 * GET /api/patients/search?phone=xxx
 */
const searchPatients = async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || phone.trim().length < 3) {
      return res.status(400).json({ message: 'Phone query must be at least 3 characters.' });
    }
    const patients = await patientService.searchByPhone(phone.trim());
    res.json({ patients });
  } catch (err) {
    console.error('[patientController.searchPatients]', err.message);
    res.status(500).json({ message: 'Failed to search patients.' });
  }
};

/**
 * GET /api/patients/:id
 */
const getPatient = async (req, res) => {
  try {
    const patient = await patientService.getFullProfile(req.params.id);
    if (!patient) return res.status(404).json({ message: 'Patient not found.' });
    res.json({ patient });
  } catch (err) {
    console.error('[patientController.getPatient]', err.message);
    res.status(500).json({ message: 'Failed to get patient.' });
  }
};

/**
 * GET /api/patients/:id/vitals
 */
const getVitals = async (req, res) => {
  try {
    const history = req.query.history === 'true';
    const data = history
      ? await patientService.getVitalsHistory(req.params.id, Number(req.query.limit) || 10)
      : await patientService.getLatestVitals(req.params.id);
    res.json({ vitals: data });
  } catch (err) {
    console.error('[patientController.getVitals]', err.message);
    res.status(500).json({ message: 'Failed to get vitals.' });
  }
};

/**
 * POST /api/patients/:id/vitals
 */
const recordVitals = async (req, res) => {
  try {
    const vitals = await patientService.recordVitals({
      patient_id:       req.params.id,
      blood_pressure:   req.body.blood_pressure,
      heart_rate:       req.body.heart_rate,
      temperature:      req.body.temperature,
      weight:           req.body.weight,
      height:           req.body.height,
      bmi:              req.body.bmi,
      oxygen_saturation: req.body.oxygen_saturation,
      recorded_by:      req.user.id,
    });
    res.status(201).json({ vitals });
  } catch (err) {
    console.error('[patientController.recordVitals]', err.message);
    res.status(500).json({ message: 'Failed to record vitals.' });
  }
};

/**
 * GET /api/patients/:id/medications
 */
const getMedications = async (req, res) => {
  try {
    const medications = await patientService.getMedications(req.params.id);
    res.json({ medications });
  } catch (err) {
    console.error('[patientController.getMedications]', err.message);
    res.status(500).json({ message: 'Failed to get medications.' });
  }
};

/**
 * GET /api/patients/:id/documents
 */
const getDocuments = async (req, res) => {
  try {
    const documents = await patientService.getDocuments(req.params.id);
    res.json({ documents });
  } catch (err) {
    console.error('[patientController.getDocuments]', err.message);
    res.status(500).json({ message: 'Failed to get documents.' });
  }
};

module.exports = {
  searchPatients,
  getPatient,
  getVitals,
  recordVitals,
  getMedications,
  getDocuments,
};
