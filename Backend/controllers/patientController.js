const patientService = require('../services/patientService');

/**
 * GET /api/patients/search?phone=123456789
 * Search for a patient by phone number
 */
const searchPatient = async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const result = await patientService.searchPatientByPhone(phone);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('[searchPatient controller]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search patient',
      error: error.message
    });
  }
};

/**
 * GET /api/patients/:patientId
 * Get patient details by ID
 */
const getPatientById = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    const result = await patientService.getPatientById(patientId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('[getPatientById controller]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get patient details',
      error: error.message
    });
  }
};

/**
 * GET /api/patients/:patientId/profile
 * Get comprehensive patient profile
 */
const getPatientProfile = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    const result = await patientService.getPatientProfile(patientId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('[getPatientProfile controller]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get patient profile',
      error: error.message
    });
  }
};

module.exports = {
  searchPatient,
  getPatientById,
  getPatientProfile
};
