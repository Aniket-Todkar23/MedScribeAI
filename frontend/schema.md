-- =============================================
-- SMART EMR - SUPABASE POSTGRESQL SCHEMA
-- =============================================

-- Enable UUID extension (already enabled in Supabase by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- DOCTORS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS doctors (
    doctor_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name           VARCHAR(150) NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    phone               VARCHAR(20),
    specialization      VARCHAR(100),
    license_number      VARCHAR(50) UNIQUE NOT NULL,
    hospital_name       VARCHAR(200),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PATIENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS patients (
    patient_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name           VARCHAR(150) NOT NULL,
    email               VARCHAR(255),
    phone               VARCHAR(20),
    date_of_birth       DATE,
    gender              VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    blood_group         VARCHAR(5),
    address             TEXT,
    emergency_contact   VARCHAR(20),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CONSULTATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS consultations (
    consultation_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id           UUID NOT NULL REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
    patient_id          UUID NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,

    -- Raw dialogue transcription
    -- Format inside text:
    -- patient: I have chest pain for 2 days
    -- doctor: Where is the pain located?
    -- patient: Left side, radiating to my arm
    transcription       TEXT,

    -- AI Generated SOAP Note
    soap_note           JSONB DEFAULT '{}'::JSONB,
    -- {
    --   "subjective": "Patient reports chest pain...",
    --   "objective": "BP 130/90, HR 88...",
    --   "assessment": "Possible angina...",
    --   "plan": "ECG, refer cardiologist..."
    -- }

    -- ICD Codes
    icd_codes           JSONB DEFAULT '[]'::JSONB,
    -- [
    --   {"code": "I20.9", "description": "Angina pectoris, unspecified"},
    --   {"code": "R07.9", "description": "Chest pain, unspecified"}
    -- ]

    -- Prescription
    prescription        JSONB DEFAULT '[]'::JSONB,
    -- [
    --   {"drug": "Aspirin", "dose": "75mg", "frequency": "Once daily", "duration": "30 days"}
    -- ]

    -- Plain language summary for patient
    patient_summary     TEXT,

    status              VARCHAR(20) DEFAULT 'draft'
                        CHECK (status IN ('draft', 'confirmed', 'reviewed')),

    consultation_date   TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DOCUMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS documents (
    document_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id     UUID REFERENCES consultations(consultation_id) ON DELETE CASCADE,
    patient_id          UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    doctor_id           UUID REFERENCES doctors(doctor_id) ON DELETE SET NULL,

    document_name       VARCHAR(255) NOT NULL,
    document_type       VARCHAR(50) CHECK (document_type IN (
                            'lab_report',
                            'prescription',
                            'xray',
                            'mri_scan',
                            'ecg',
                            'referral_letter',
                            'discharge_summary',
                            'insurance',
                            'other'
                        )),
    file_url            TEXT NOT NULL,
    file_size_kb        INTEGER,
    mime_type           VARCHAR(100),
    uploaded_by         UUID REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    notes               TEXT,

    uploaded_at         TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NOTIFICATION LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notification_log (
    notification_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id     UUID NOT NULL REFERENCES consultations(consultation_id) ON DELETE CASCADE,
    patient_id          UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    channel             VARCHAR(20) CHECK (channel IN ('whatsapp', 'sms', 'email')),
    status              VARCHAR(20) DEFAULT 'pending'
                        CHECK (status IN ('sent', 'failed', 'pending')),
    message_content     TEXT,
    sent_at             TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMPLIANCE AUDIT LOG TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- WHO did it
    actor_id            UUID NOT NULL,
    actor_type          VARCHAR(20) CHECK (actor_type IN ('doctor', 'system', 'admin')),
    actor_name          VARCHAR(150),

    -- WHAT they did
    action              VARCHAR(50) NOT NULL CHECK (action IN (
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
                            'ai_suggestion_rejected'
                        )),

    -- WHAT was affected
    entity_type         VARCHAR(50),
    entity_id           UUID,

    -- DETAILS of change
    old_value           JSONB,
    new_value           JSONB,
    change_summary      TEXT,

    -- CONTEXT
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    session_id          VARCHAR(255),

    -- COMPLIANCE
    data_sensitivity    VARCHAR(20) DEFAULT 'high'
                        CHECK (data_sensitivity IN ('low', 'medium', 'high', 'critical')),
    is_phi_accessed     BOOLEAN DEFAULT FALSE,

    created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- AUTO UPDATE updated_at TRIGGER
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_doctors_updated_at
    BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_patients_updated_at
    BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_consultations_updated_at
    BEFORE UPDATE ON consultations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_consultations_doctor      ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient     ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date        ON consultations(consultation_date);
CREATE INDEX IF NOT EXISTS idx_consultations_status      ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_documents_patient         ON documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_consultation    ON documents(consultation_id);
CREATE INDEX IF NOT EXISTS idx_documents_type            ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_notification_consultation ON notification_log(consultation_id);
CREATE INDEX IF NOT EXISTS idx_notification_status       ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_audit_actor               ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity              ON audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action              ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at          ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_session             ON audit_log(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_phi                 ON audit_log(is_phi_accessed);

-- =============================================
-- ROW LEVEL SECURITY (RLS) — Supabase Specific
-- =============================================
ALTER TABLE doctors         ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents       ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log       ENABLE ROW LEVEL SECURITY;

-- Allow all for now (tighten before production)
CREATE POLICY "Allow all for doctors"          ON doctors          FOR ALL USING (true);
CREATE POLICY "Allow all for patients"         ON patients         FOR ALL USING (true);
CREATE POLICY "Allow all for consultations"    ON consultations    FOR ALL USING (true);
CREATE POLICY "Allow all for documents"        ON documents        FOR ALL USING (true);
CREATE POLICY "Allow all for notifications"    ON notification_log FOR ALL USING (true);
CREATE POLICY "Allow all for audit"            ON audit_log        FOR ALL USING (true);

-- =============================================
-- AUDIT LOG IMMUTABILITY
-- Prevent update and delete on audit_log
-- =============================================
CREATE OR REPLACE RULE audit_log_no_update
    AS ON UPDATE TO audit_log DO INSTEAD NOTHING;

CREATE OR REPLACE RULE audit_log_no_delete
    AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- =============================================
-- APPOINTMENTS TABLE (NEW)
-- =============================================
CREATE TABLE IF NOT EXISTS appointments (
    appointment_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id           UUID NOT NULL REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
    patient_id          UUID NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,

    appointment_date    TIMESTAMPTZ NOT NULL,
    duration_minutes    INTEGER DEFAULT 30,

    appointment_type    VARCHAR(50) DEFAULT 'in_person'
                        CHECK (appointment_type IN (
                            'in_person',
                            'telehealth',
                            'follow_up',
                            'emergency',
                            'routine_checkup'
                        )),

    status              VARCHAR(20) DEFAULT 'scheduled'
                        CHECK (status IN (
                            'scheduled',
                            'confirmed',
                            'in_progress',
                            'completed',
                            'cancelled',
                            'no_show'
                        )),

    reason              TEXT,
    notes               TEXT,
    cancelled_reason    TEXT,

    -- Link to consultation once appointment is done
    consultation_id     UUID REFERENCES consultations(consultation_id) ON DELETE SET NULL,

    -- Reminder tracking
    reminder_sent       BOOLEAN DEFAULT FALSE,
    reminder_sent_at    TIMESTAMPTZ,

    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADD appointment_id TO CONSULTATIONS (NEW COLUMN)
-- =============================================
ALTER TABLE consultations
    ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(appointment_id) ON DELETE SET NULL;

-- =============================================
-- ADD appointment_id TO NOTIFICATION LOG (NEW COLUMN)
-- =============================================
ALTER TABLE notification_log
    ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(appointment_id) ON DELETE CASCADE;

-- =============================================
-- ADD NEW AUDIT ACTIONS FOR APPOINTMENTS
-- =============================================
ALTER TABLE audit_log
    DROP CONSTRAINT IF EXISTS audit_log_action_check;

ALTER TABLE audit_log
    ADD CONSTRAINT audit_log_action_check CHECK (action IN (
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
        'appointment_completed'
    ));

-- =============================================
-- TRIGGER FOR APPOINTMENTS updated_at (NEW)
-- =============================================
CREATE TRIGGER trigger_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- INDEXES FOR APPOINTMENTS (NEW)
-- =============================================
CREATE INDEX IF NOT EXISTS idx_appointments_doctor       ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient      ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date         ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status       ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_type         ON appointments(appointment_type);
CREATE INDEX IF NOT EXISTS idx_consultations_appointment ON consultations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notification_appointment  ON notification_log(appointment_id);

-- =============================================
-- RLS FOR APPOINTMENTS (NEW)
-- =============================================
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for appointments" ON appointments FOR ALL USING (true);

-- =============================================
-- SEED DATA FOR DEMO
-- =============================================