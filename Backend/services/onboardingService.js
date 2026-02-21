const pool = require('../utils/db');

/**
 * Save patient onboarding data to the database
 */
async function saveOnboardingData(patientId, data) {
  console.log('[onboardingService] Starting saveOnboardingData for patient:', patientId);
  
  try {
    // Verify patient exists
    console.log('[onboardingService] Checking patient exists...');
    const patientCheck = await pool.query(
      'SELECT patient_id FROM patients WHERE patient_id = $1',
      [patientId]
    );
    console.log('[onboardingService] Patient check result:', patientCheck.rows.length);

    if (patientCheck.rows.length === 0) {
      throw new Error('Patient not found');
    }

    // Check if onboarding already exists
    console.log('[onboardingService] Checking for existing onboarding...');
    const existingOnboarding = await pool.query(
      'SELECT onboarding_id FROM patient_onboarding WHERE patient_id = $1',
      [patientId]
    );
    console.log('[onboardingService] Existing onboarding:', existingOnboarding.rows.length);

    let result;

    if (existingOnboarding.rows.length > 0) {
      // Update existing onboarding
      console.log('[onboardingService] Updating existing onboarding...');
      result = await pool.query(
        `UPDATE patient_onboarding SET
          has_diabetes = $2,
          diabetes_type = $3,
          on_insulin = $4,
          has_heart_disease = $5,
          heart_conditions = $6,
          has_lung_disease = $7,
          lung_conditions = $8,
          uses_inhaler_daily = $9,
          no_medical_conditions = $10,
          taking_medications = $11,
          medications_list = $12,
          has_allergies = $13,
          allergies_list = $14,
          smoking_status = $15,
          alcohol_use = $16,
          had_major_surgeries = $17,
          surgeries_details = $18,
          consent_data_storage = $19,
          consent_ai_assist = $20,
          updated_at = NOW()
        WHERE patient_id = $1
        RETURNING onboarding_id, completed_at`,
        [
          patientId,
          data.hasDiabetes || false,
          data.diabetesType || null,
          data.onInsulin || false,
          data.hasHeartDisease || false,
          JSON.stringify(data.heartConditions || []),
          data.hasLungDisease || false,
          JSON.stringify(data.lungConditions || []),
          data.usesInhalerDaily || false,
          data.noMedicalConditions || false,
          data.takingMedications || false,
          data.medicationsList || null,
          data.hasAllergies || false,
          data.allergiesList || null,
          data.smokingStatus || null,
          data.alcoholUse || null,
          data.hadMajorSurgeries || false,
          data.surgeriesDetails || null,
          data.consentDataStorage || false,
          data.consentAIAssist || false,
        ]
      );
    } else {
      // Insert new onboarding
      console.log('[onboardingService] Inserting new onboarding...');
      result = await pool.query(
        `INSERT INTO patient_onboarding (
          patient_id,
          has_diabetes, diabetes_type, on_insulin,
          has_heart_disease, heart_conditions,
          has_lung_disease, lung_conditions, uses_inhaler_daily,
          no_medical_conditions,
          taking_medications, medications_list,
          has_allergies, allergies_list,
          smoking_status, alcohol_use,
          had_major_surgeries, surgeries_details,
          consent_data_storage, consent_ai_assist
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        )
        RETURNING onboarding_id, completed_at`,
        [
          patientId,
          data.hasDiabetes || false,
          data.diabetesType || null,
          data.onInsulin || false,
          data.hasHeartDisease || false,
          JSON.stringify(data.heartConditions || []),
          data.hasLungDisease || false,
          JSON.stringify(data.lungConditions || []),
          data.usesInhalerDaily || false,
          data.noMedicalConditions || false,
          data.takingMedications || false,
          data.medicationsList || null,
          data.hasAllergies || false,
          data.allergiesList || null,
          data.smokingStatus || null,
          data.alcoholUse || null,
          data.hadMajorSurgeries || false,
          data.surgeriesDetails || null,
          data.consentDataStorage || false,
          data.consentAIAssist || false,
        ]
      );
    }

    console.log('[onboardingService] Operation successful');
    return result.rows[0];
  } catch (err) {
    console.error('[onboardingService] Error:', err);
    console.error('[onboardingService] Stack:', err.stack);
    throw err;
  }
}


/**
 * Get patient onboarding data
 */
async function getOnboardingData(patientId) {
  const result = await pool.query(
    `SELECT 
      onboarding_id,
      has_diabetes, diabetes_type, on_insulin,
      has_heart_disease, heart_conditions,
      has_lung_disease, lung_conditions, uses_inhaler_daily,
      no_medical_conditions,
      taking_medications, medications_list,
      has_allergies, allergies_list,
      smoking_status, alcohol_use,
      had_major_surgeries, surgeries_details,
      consent_data_storage, consent_ai_assist,
      completed_at, created_at, updated_at
    FROM patient_onboarding
    WHERE patient_id = $1`,
    [patientId]
  );

  return result.rows[0] || null;
}

module.exports = {
  saveOnboardingData,
  getOnboardingData,
};
