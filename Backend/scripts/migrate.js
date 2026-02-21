/**
 * Migration: ensure password_hash column exists on both doctors and patients.
 * Safe to run multiple times (IF NOT EXISTS).
 * Run: node scripts/migrate.js
 */
require('dotenv').config();
const pool = require('../utils/db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');

    await client.query(`
      ALTER TABLE doctors
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    `);
    console.log('✅  doctors.password_hash — OK');

    await client.query(`
      ALTER TABLE patients
        ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    `);
    console.log('✅  patients.password_hash — OK');

  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

