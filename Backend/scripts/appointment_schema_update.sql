-- =============================================
-- APPOINTMENT SCHEMA UPDATE
-- Adds 'pending' status, meet_link column, and google_tokens to doctors
-- =============================================

-- 1. Add 'pending' to appointments status enum
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'));

-- 2. Add meet_link column to appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS meet_link TEXT;

-- 3. Add google_event_id column to appointments  
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS google_event_id TEXT;

-- 4. Add google_tokens JSONB column to doctors (stores OAuth tokens per doctor)
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS google_tokens JSONB;

-- 5. Add 'appointment_approved' and 'appointment_rejected' to audit_log actions
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check CHECK (action IN (
    'consultation_created',
    'consultation_updated',
    'consultation_confirmed',
    'transcription_generated',
    'soap_note_generated',
    'soap_note_edited',
    'icd_code_assigned',
    'prescription_created',
    'prescription_edited',
    'document_uploaded',
    'document_deleted',
    'document_accessed',
    'patient_summary_sent',
    'patient_record_accessed',
    'patient_record_exported',
    'notification_sent',
    'ai_suggestion_accepted',
    'ai_suggestion_rejected',
    'appointment_created',
    'appointment_updated',
    'appointment_cancelled',
    'appointment_completed',
    'appointment_approved',
    'appointment_rejected',
    'patient_onboarding_completed',
    'patient_onboarding_updated',
    'recording_uploaded'
));

-- 6. Index on meet_link for quick lookup
CREATE INDEX IF NOT EXISTS idx_appointments_meet_link ON appointments(meet_link);

SELECT 'Appointment schema update complete' AS status;
