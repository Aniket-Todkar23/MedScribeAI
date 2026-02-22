const pool   = require('../utils/db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const SALT_ROUNDS = 12;

/* ─── DOCTORS ───────────────────────────────────────────────── */

const findDoctorByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT doctor_id, full_name, email, phone, specialization,
            license_number, hospital_name, password_hash
     FROM doctors WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return rows[0] ?? null;
};

const createDoctor = async ({
  full_name, email, password, license_number,
  phone, specialization, hospital_name,
}) => {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO doctors
       (full_name, email, phone, specialization, license_number, hospital_name, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING doctor_id, full_name, email, phone, specialization, license_number, hospital_name`,
    [
      full_name.trim(),
      email.toLowerCase().trim(),
      phone          ?? null,
      specialization ?? null,
      license_number.trim(),
      hospital_name  ?? null,
      password_hash,
    ]
  );
  return rows[0];
};

/* ─── PATIENTS ──────────────────────────────────────────────── */

const findPatientByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT patient_id, full_name, email, phone, date_of_birth,
            gender, blood_group, address, emergency_contact, password_hash
     FROM patients WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return rows[0] ?? null;
};

const createPatient = async ({
  full_name, email, password,
  phone, date_of_birth, gender, blood_group, address, emergency_contact,
}) => {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO patients
       (full_name, email, phone, date_of_birth, gender,
        blood_group, address, emergency_contact, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING patient_id, full_name, email, phone, date_of_birth,
               gender, blood_group, address, emergency_contact`,
    [
      full_name.trim(),
      email.toLowerCase().trim(),
      phone             ?? null,
      date_of_birth     ?? null,
      gender            ?? null,
      blood_group       ?? null,
      address           ?? null,
      emergency_contact ?? null,
      password_hash,
    ]
  );
  return rows[0];
};

/* ─── SHARED ────────────────────────────────────────────────── */

const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

/* ─── GOOGLE OAUTH (no user-supplied password) ──────────────── */

const createDoctorFromGoogle = async ({
  full_name, email, license_number,
  phone, specialization, hospital_name,
}) => {
  // Generate a secure random password hash — user authenticates via Google
  const randomPwd     = crypto.randomBytes(48).toString('hex');
  const password_hash = await bcrypt.hash(randomPwd, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO doctors
       (full_name, email, phone, specialization, license_number, hospital_name, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING doctor_id, full_name, email, phone, specialization, license_number, hospital_name`,
    [
      full_name.trim(),
      email.toLowerCase().trim(),
      phone          ?? null,
      specialization ?? null,
      license_number.trim(),
      hospital_name  ?? null,
      password_hash,
    ]
  );
  return rows[0];
};

const createPatientFromGoogle = async ({
  full_name, email,
  phone, date_of_birth, gender, blood_group, address, emergency_contact,
}) => {
  const randomPwd     = crypto.randomBytes(48).toString('hex');
  const password_hash = await bcrypt.hash(randomPwd, SALT_ROUNDS);
  const { rows } = await pool.query(
    `INSERT INTO patients
       (full_name, email, phone, date_of_birth, gender,
        blood_group, address, emergency_contact, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING patient_id, full_name, email, phone, date_of_birth,
               gender, blood_group, address, emergency_contact`,
    [
      full_name.trim(),
      email.toLowerCase().trim(),
      phone             ?? null,
      date_of_birth     ?? null,
      gender            ?? null,
      blood_group       ?? null,
      address           ?? null,
      emergency_contact ?? null,
      password_hash,
    ]
  );
  return rows[0];
};

module.exports = {
  findDoctorByEmail,
  createDoctor,
  findPatientByEmail,
  createPatient,
  verifyPassword,
  createDoctorFromGoogle,
  createPatientFromGoogle,
};

