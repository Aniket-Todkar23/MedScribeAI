const supabase = require('./supabaseService');

/**
 * Save a prescription — either creates a new consultation with prescription data
 * or updates an existing consultation's prescription field.
 */
const save = async ({ doctor_id, patient_id, consultation_id, prescription, diagnosis, notes }) => {
  let result;

  if (consultation_id) {
    // Update existing consultation
    const { data, error } = await supabase.supabase
      .from('consultations')
      .update({ prescription, status: 'confirmed' })
      .eq('consultation_id', consultation_id)
      .select()
      .single();

    if (error) throw error;
    result = data;
  } else {
    // Create a new consultation with the prescription
    const { data, error } = await supabase.supabase
      .from('consultations')
      .insert([{
        doctor_id,
        patient_id,
        prescription,
        icd_codes: diagnosis ? [{ code: '', description: diagnosis }] : [],
        patient_summary: notes || null,
        status: 'confirmed',
      }])
      .select()
      .single();

    if (error) throw error;
    result = data;
  }

  await supabase.createAuditLog({
    actor_id: doctor_id,
    actor_type: 'doctor',
    action: 'prescription_created',
    entity_type: 'consultation',
    entity_id: result.consultation_id,
    new_value: { prescription },
  });

  return result;
};

/**
 * Get prescription by consultation ID.
 */
const getByConsultation = async (consultationId) => {
  const { data, error } = await supabase.supabase
    .from('consultations')
    .select('consultation_id, prescription, icd_codes, patient_summary, consultation_date, status')
    .eq('consultation_id', consultationId)
    .single();

  if (error) throw error;
  return data;
};

module.exports = { save, getByConsultation };
