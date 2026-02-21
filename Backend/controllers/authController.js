const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { signToken } = require('../utils/jwt');

const sanitize = (obj) => {
  const { password_hash, ...safe } = obj; // eslint-disable-line no-unused-vars
  return safe;
};

/* POST /api/auth/signup/doctor */
const doctorSignup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ message: errors.array()[0].msg, errors: errors.array() });

  try {
    const existing = await authService.findDoctorByEmail(req.body.email);
    if (existing)
      return res.status(409).json({ message: 'A doctor with this email already exists.' });

    const doctor = await authService.createDoctor(req.body);
    const token  = signToken({ id: doctor.doctor_id, email: doctor.email, user_type: 'doctor' });
    return res.status(201).json({ token, user: { ...doctor, user_type: 'doctor' } });
  } catch (err) {
    if (err.code === '23505' && err.constraint === 'doctors_license_number_key')
      return res.status(409).json({ message: 'This license number is already registered.' });
    console.error('[doctorSignup]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/* POST /api/auth/signup/patient */
const patientSignup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ message: errors.array()[0].msg, errors: errors.array() });

  try {
    const existing = await authService.findPatientByEmail(req.body.email);
    if (existing)
      return res.status(409).json({ message: 'A patient with this email already exists.' });

    const patient = await authService.createPatient(req.body);
    const token   = signToken({ id: patient.patient_id, email: patient.email, user_type: 'patient' });
    return res.status(201).json({ token, user: { ...patient, user_type: 'patient' } });
  } catch (err) {
    console.error('[patientSignup]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

/* POST /api/auth/login  — searches doctors first, then patients */
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ message: errors.array()[0].msg, errors: errors.array() });

  const { email, password } = req.body;
  try {
    let entity    = await authService.findDoctorByEmail(email);
    let user_type = 'doctor';
    let id_field  = 'doctor_id';

    if (!entity) {
      entity    = await authService.findPatientByEmail(email);
      user_type = 'patient';
      id_field  = 'patient_id';
    }

    if (!entity)
      return res.status(401).json({ message: 'Invalid email or password.' });

    const valid = await authService.verifyPassword(password, entity.password_hash);
    if (!valid)
      return res.status(401).json({ message: 'Invalid email or password.' });

    const token = signToken({ id: entity[id_field], email: entity.email, user_type });
    return res.status(200).json({ token, user: { ...sanitize(entity), user_type } });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { doctorSignup, patientSignup, login };
