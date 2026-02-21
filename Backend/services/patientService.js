const pool = require('../utils/db');

/**
 * Search patient by phone number
 */
async function searchPatientByPhone(phone) {
  try {
    // Clean the phone number (remove +, spaces, dashes)
    const cleanPhone = phone.replace(/[\s\-\+]/g, '');
    
    const result = await pool.query(
      `SELECT 
        patient_id,
        full_name,
        email,
        phone,
        date_of_birth,
        gender,
        blood_group,
        address,
        emergency_contact,
        created_at
       FROM patients
       WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') LIKE $1
       LIMIT 1`,
      [`%${cleanPhone}%`]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'Patient not found'
      };
    }

    return {
      success: true,
      patient: result.rows[0]
    };
  } catch (error) {
    console.error('[searchPatientByPhone] Error:', error.message);
    throw error;
  }
}

/**
 * Get patient by ID with full details including onboarding
 */
async function getPatientById(patientId) {
  const client = await pool.connect();
  
  try {
    // Get patient basic info
    const patientResult = await client.query(
      `SELECT 
        patient_id,
        full_name,
        email,
        phone,
        date_of_birth,
        gender,
        blood_group,
        address,
        emergency_contact,
        created_at
       FROM patients
       WHERE patient_id = $1`,
      [patientId]
    );

    if (patientResult.rows.length === 0) {
      return {
        success: false,
        message: 'Patient not found'
      };
    }

    const patient = patientResult.rows[0];

    // Get onboarding data
    const onboardingResult = await client.query(
      `SELECT * FROM onboarding WHERE patient_id = $1`,
      [patientId]
    );

    // Calculate age if date_of_birth exists
    let age = null;
    if (patient.date_of_birth) {
      const birthDate = new Date(patient.date_of_birth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    return {
      success: true,
      patient: {
        ...patient,
        age,
        onboarding: onboardingResult.rows[0] || null
      }
    };
  } catch (error) {
    console.error('[getPatientById] Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get comprehensive patient profile with all related data
 */
async function getPatientProfile(patientId) {
  const client = await pool.connect();
  
  try {
    // Get patient with onboarding
    const patientData = await getPatientById(patientId);
    
    if (!patientData.success) {
      return patientData;
    }

    // Get recent reports count
    const reportsResult = await client.query(
      `SELECT COUNT(*) as total_reports 
       FROM patient_reports 
       WHERE patient_id = $1`,
      [patientId]
    );

    return {
      success: true,
      profile: {
        ...patientData.patient,
        stats: {
          totalReports: parseInt(reportsResult.rows[0].total_reports) || 0
        }
      }
    };
  } catch (error) {
    console.error('[getPatientProfile] Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  searchPatientByPhone,
  getPatientById,
  getPatientProfile
};
