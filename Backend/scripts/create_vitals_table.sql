-- =============================================
-- PATIENT VITALS TABLE
-- Stores vital sign readings recorded during consultations
-- =============================================
CREATE TABLE IF NOT EXISTS patient_vitals (
    vital_id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id          UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    blood_pressure      VARCHAR(20),
    heart_rate          VARCHAR(20),
    temperature         VARCHAR(20),
    weight              VARCHAR(20),
    height              VARCHAR(20),
    bmi                 NUMERIC(5,2),
    oxygen_saturation   VARCHAR(10),
    recorded_by         UUID REFERENCES doctors(doctor_id) ON DELETE SET NULL,
    recorded_at         TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick patient lookup
CREATE INDEX IF NOT EXISTS idx_vitals_patient ON patient_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded_at ON patient_vitals(recorded_at);

-- RLS
ALTER TABLE patient_vitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for patient_vitals" ON patient_vitals FOR ALL USING (true);
