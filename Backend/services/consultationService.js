const supabase = require('./supabaseService');

/**
 * Create a new consultation.
 */
const create = async (consultationData) => {
  const { data, error } = await supabase.supabase
    .from('consultations')
    .insert([consultationData])
    .select()
    .single();

  if (error) throw error;

  await supabase.createAuditLog({
    actor_id: consultationData.doctor_id,
    actor_type: 'doctor',
    action: 'consultation_created',
    entity_type: 'consultation',
    entity_id: data.consultation_id,
    new_value: data,
  });

  return data;
};

/**
 * Get consultation by ID (with doctor & patient info).
 */
const getById = async (consultationId) => {
  const { data, error } = await supabase.supabase
    .from('consultations')
    .select(`
      *,
      doctor:doctors(doctor_id, full_name, specialization, email),
      patient:patients(patient_id, full_name, email, phone)
    `)
    .eq('consultation_id', consultationId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update a consultation (SOAP note, ICD codes, prescription, status, transcription).
 */
const update = async (consultationId, updateData, actorId) => {
  const { data, error } = await supabase.supabase
    .from('consultations')
    .update(updateData)
    .eq('consultation_id', consultationId)
    .select()
    .single();

  if (error) throw error;

  await supabase.createAuditLog({
    actor_id: actorId,
    actor_type: 'doctor',
    action: 'consultation_updated',
    entity_type: 'consultation',
    entity_id: consultationId,
    new_value: updateData,
  });

  return data;
};

/**
 * Get consultations for a patient.
 */
const getByPatient = async (patientId, limit = 20) => {
  const { data, error } = await supabase.supabase
    .from('consultations')
    .select(`
      *,
      doctor:doctors(doctor_id, full_name, specialization)
    `)
    .eq('patient_id', patientId)
    .order('consultation_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

/**
 * Get consultations for a doctor.
 */
const getByDoctor = async (doctorId, filters = {}) => {
  let query = supabase.supabase
    .from('consultations')
    .select(`
      *,
      patient:patients(patient_id, full_name, email, phone)
    `)
    .eq('doctor_id', doctorId)
    .order('consultation_date', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.limit)  query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

module.exports = { create, getById, update, getByPatient, getByDoctor };
