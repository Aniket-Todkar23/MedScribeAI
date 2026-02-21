/**
 * Migration: Create emr_records table
 *
 * Stores the full FHIR-aligned EMR JSON returned by the AI backend.
 * Linked to consultations and patients for easy querying.
 */

const pool = require('../../utils/db');

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS emr_records (
    emr_id           UUID PRIMARY KEY,
    consultation_id  UUID REFERENCES consultations(consultation_id) ON DELETE SET NULL,
    patient_id       UUID REFERENCES patients(patient_id) ON DELETE SET NULL,
    record_data      JSONB NOT NULL,              -- full EMR JSON from AI backend
    status           VARCHAR(20) DEFAULT 'draft', -- draft | completed | reviewed | amended
    reviewed_by      UUID,                        -- doctor who reviewed
    reviewed_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
  );

  -- Index for fast patient lookups
  CREATE INDEX IF NOT EXISTS idx_emr_records_patient   ON emr_records(patient_id);
  CREATE INDEX IF NOT EXISTS idx_emr_records_consult   ON emr_records(consultation_id);
  CREATE INDEX IF NOT EXISTS idx_emr_records_status    ON emr_records(status);
`;

async function run() {
  console.log('Creating emr_records table...');
  await pool.query(CREATE_TABLE);
  console.log('✅ emr_records table created successfully');
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
