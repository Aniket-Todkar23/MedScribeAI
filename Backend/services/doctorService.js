const supabase = require('./supabaseService');

/**
 * Get doctor profile by ID.
 */
const getProfile = async (doctorId) => {
  const { data, error } = await supabase.supabase
    .from('doctors')
    .select('doctor_id, full_name, email, phone, specialization, license_number, hospital_name, created_at')
    .eq('doctor_id', doctorId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Get aggregated analytics for a doctor's patient population.
 */
const getAnalytics = async (doctorId) => {
  // Total unique patients from consultations
  const { data: consultations, error: cErr } = await supabase.supabase
    .from('consultations')
    .select('patient_id')
    .eq('doctor_id', doctorId);

  if (cErr) throw cErr;

  const uniquePatientIds = [...new Set((consultations || []).map(c => c.patient_id))];
  const totalPatients = uniquePatientIds.length;

  // Today's appointments
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const { data: todayAppts, error: aErr } = await supabase.supabase
    .from('appointments')
    .select('appointment_id')
    .eq('doctor_id', doctorId)
    .gte('appointment_date', todayStart.toISOString())
    .lte('appointment_date', todayEnd.toISOString());

  if (aErr) throw aErr;

  // Total consultations this month
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const { data: monthConsults, error: mErr } = await supabase.supabase
    .from('consultations')
    .select('consultation_id')
    .eq('doctor_id', doctorId)
    .gte('consultation_date', monthStart.toISOString());

  if (mErr) throw mErr;

  // Condition distribution from onboarding for the doctor's patients
  let diabetesCount = 0, heartDiseaseCount = 0, lungDiseaseCount = 0;

  if (uniquePatientIds.length > 0) {
    const { data: onboarding } = await supabase.supabase
      .from('patient_onboarding')
      .select('has_diabetes, has_heart_disease, has_lung_disease')
      .in('patient_id', uniquePatientIds);

    for (const o of (onboarding || [])) {
      if (o.has_diabetes)       diabetesCount++;
      if (o.has_heart_disease)  heartDiseaseCount++;
      if (o.has_lung_disease)   lungDiseaseCount++;
    }
  }

  return {
    totalPatients,
    todayAppointments: (todayAppts || []).length,
    monthlyConsultations: (monthConsults || []).length,
    conditions: {
      diabetes:      { yes: diabetesCount,      no: totalPatients - diabetesCount },
      heartDisease:  { yes: heartDiseaseCount,   no: totalPatients - heartDiseaseCount },
      lungDisease:   { yes: lungDiseaseCount,    no: totalPatients - lungDiseaseCount },
    },
  };
};

/**
 * Get audit log entries for a doctor.
 */
const getAuditLog = async (doctorId, { limit = 50, offset = 0 } = {}) => {
  const { data, error } = await supabase.supabase
    .from('audit_log')
    .select('*')
    .eq('actor_id', doctorId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data || [];
};

module.exports = { getProfile, getAnalytics, getAuditLog };
