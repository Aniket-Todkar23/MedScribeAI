/**
 * Migration: Create patient_reports table
 * Stores uploaded medical reports (PDFs, images) with AI-generated summaries
 * Run: node scripts/migrations/createPatientReportsTable.js
 */
require('dotenv').config();
const pool = require('../../utils/db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Creating patient_reports table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_reports (
        report_id SERIAL PRIMARY KEY,
        patient_id VARCHAR(255) NOT NULL,
        doctor_id VARCHAR(255) NOT NULL,
        report_name VARCHAR(500) NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        file_url TEXT NOT NULL,
        file_size INTEGER,
        file_extension VARCHAR(10),
        ai_summary TEXT,
        key_findings TEXT[],
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅  patient_reports table created successfully');

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_reports_patient_id 
      ON patient_reports(patient_id);
    `);
    console.log('✅  Index on patient_id created');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_reports_doctor_id 
      ON patient_reports(doctor_id);
    `);
    console.log('✅  Index on doctor_id created');

  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
