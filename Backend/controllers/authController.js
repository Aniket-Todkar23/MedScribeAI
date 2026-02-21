const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { signToken } = require('../utils/jwt');

const sanitize = (obj) => {
  const { password_hash, ...safe } = obj; // eslint-disable-line no-unused-vars
  return safe;
};

/** Build a consistent user shape for the frontend. */
const buildUser = (entity, id_field, user_type) => ({
  id:        entity[id_field],
  name:      entity.full_name,
  email:     entity.email,
  user_type,
});

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
    const user   = buildUser(doctor, 'doctor_id', 'doctor');
    const token  = signToken({ id: user.id, email: user.email, user_type: 'doctor' });
    return res.status(201).json({ token, user });
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
    const user    = buildUser(patient, 'patient_id', 'patient');
    const token   = signToken({ id: user.id, email: user.email, user_type: 'patient' });
    return res.status(201).json({ token, user });
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

    const user  = buildUser(entity, id_field, user_type);
    const token = signToken({ id: user.id, email: user.email, user_type });
    return res.status(200).json({ token, user });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { doctorSignup, patientSignup, login };
