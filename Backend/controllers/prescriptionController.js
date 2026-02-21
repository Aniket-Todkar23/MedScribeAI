const prescriptionService = require('../services/prescriptionService');

/**
 * POST /api/prescriptions
 */
const savePrescription = async (req, res) => {
  try {
    const { patient_id, consultation_id, prescription, diagnosis, notes } = req.body;

    if (!patient_id) {
      return res.status(400).json({ message: 'patient_id is required.' });
    }
    if (!prescription || !Array.isArray(prescription) || prescription.length === 0) {
      return res.status(400).json({ message: 'At least one medication is required.' });
    }

    const result = await prescriptionService.save({
      doctor_id:       req.user.id,
      patient_id,
      consultation_id: consultation_id || null,
      prescription,
      diagnosis:       diagnosis || null,
      notes:           notes || null,
    });

    res.status(201).json({ prescription: result });
  } catch (err) {
    console.error('[prescriptionController.save]', err.message);
    res.status(500).json({ message: 'Failed to save prescription.' });
  }
};

/**
 * GET /api/prescriptions/:consultationId
 */
const getPrescription = async (req, res) => {
  try {
    const data = await prescriptionService.getByConsultation(req.params.consultationId);
    if (!data) return res.status(404).json({ message: 'Prescription not found.' });
    res.json({ prescription: data });
  } catch (err) {
    console.error('[prescriptionController.get]', err.message);
    res.status(500).json({ message: 'Failed to get prescription.' });
  }
};

module.exports = { savePrescription, getPrescription };
