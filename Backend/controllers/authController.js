const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { signToken, verifyToken } = require('../utils/jwt');
const { google: gapis } = require('googleapis');
const config = require('../config/config');

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

module.exports = { doctorSignup, patientSignup, login, googleAuth, googleCompleteDoctor, googleCompletePatient };

/* ─── Google OAuth ─────────────────────────────────────────── */

/* POST /api/auth/google  — verify ID token, login or prompt profile */
async function googleAuth(req, res) {
  const { credential } = req.body;
  if (!credential) return res.status(400).json({ message: 'Google credential is required.' });

  try {
    const client = new gapis.auth.OAuth2(config.google.clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: config.google.clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email)
      return res.status(401).json({ message: 'Invalid Google credential.' });

    const { email, name, sub: google_id, picture } = payload;

    // Check if user already exists (doctor first, then patient)
    let entity = await authService.findDoctorByEmail(email);
    if (entity) {
      const user  = buildUser(entity, 'doctor_id', 'doctor');
      const token = signToken({ id: user.id, email: user.email, user_type: 'doctor' });
      return res.json({ token, user });
    }

    entity = await authService.findPatientByEmail(email);
    if (entity) {
      const user  = buildUser(entity, 'patient_id', 'patient');
      const token = signToken({ id: user.id, email: user.email, user_type: 'patient' });
      return res.json({ token, user });
    }

    // New user → issue a short-lived pending token for profile completion
    const pendingToken = signToken(
      { email, name: name || '', google_id, picture: picture || '', type: 'google_pending' },
      '15m',
    );
    return res.json({
      needs_profile: true,
      google_profile: { name: name || '', email, google_id, picture: picture || '' },
      pending_token: pendingToken,
    });
  } catch (err) {
    console.error('[googleAuth]', err);
    return res.status(401).json({ message: 'Google authentication failed.' });
  }
}

/* POST /api/auth/google/complete/doctor */
async function googleCompleteDoctor(req, res) {
  const { pending_token, full_name, license_number, phone, specialization, hospital_name } = req.body;
  if (!pending_token) return res.status(400).json({ message: 'Pending token is required.' });

  try {
    const decoded = verifyToken(pending_token);
    if (decoded.type !== 'google_pending')
      return res.status(401).json({ message: 'Invalid pending token.' });

    const existing = await authService.findDoctorByEmail(decoded.email);
    if (existing)
      return res.status(409).json({ message: 'A doctor with this email already exists.' });

    const doctor = await authService.createDoctorFromGoogle({
      full_name:      full_name || decoded.name,
      email:          decoded.email,
      license_number,
      phone:          phone          || undefined,
      specialization: specialization || undefined,
      hospital_name:  hospital_name  || undefined,
    });
    const user  = buildUser(doctor, 'doctor_id', 'doctor');
    const token = signToken({ id: user.id, email: user.email, user_type: 'doctor' });
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
      return res.status(401).json({ message: 'Pending token expired. Please sign in with Google again.' });
    if (err.code === '23505' && err.constraint === 'doctors_license_number_key')
      return res.status(409).json({ message: 'This license number is already registered.' });
    console.error('[googleCompleteDoctor]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}

/* POST /api/auth/google/complete/patient */
async function googleCompletePatient(req, res) {
  const { pending_token, full_name, phone, date_of_birth, gender, blood_group, address, emergency_contact } = req.body;
  if (!pending_token) return res.status(400).json({ message: 'Pending token is required.' });

  try {
    const decoded = verifyToken(pending_token);
    if (decoded.type !== 'google_pending')
      return res.status(401).json({ message: 'Invalid pending token.' });

    const existing = await authService.findPatientByEmail(decoded.email);
    if (existing)
      return res.status(409).json({ message: 'A patient with this email already exists.' });

    const patient = await authService.createPatientFromGoogle({
      full_name:         full_name || decoded.name,
      email:             decoded.email,
      phone:             phone             || undefined,
      date_of_birth:     date_of_birth     || undefined,
      gender:            gender            || undefined,
      blood_group:       blood_group       || undefined,
      address:           address           || undefined,
      emergency_contact: emergency_contact || undefined,
    });
    const user  = buildUser(patient, 'patient_id', 'patient');
    const token = signToken({ id: user.id, email: user.email, user_type: 'patient' });
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
      return res.status(401).json({ message: 'Pending token expired. Please sign in with Google again.' });
    console.error('[googleCompletePatient]', err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
}
