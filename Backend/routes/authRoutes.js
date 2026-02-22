const { Router } = require('express');
const { body }   = require('express-validator');
const { doctorSignup, patientSignup, login, googleAuth, googleCompleteDoctor, googleCompletePatient } = require('../controllers/authController');

const router = Router();

/* ── Doctor signup rules ──────────────────── */
const doctorRules = [
  body('full_name').trim().notEmpty().withMessage('Full name is required.').isLength({ max: 150 }),
  body('email').trim().notEmpty().isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').notEmpty().isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('license_number').trim().notEmpty().withMessage('License number is required.').isLength({ max: 50 }),
  body('phone').optional({ values: 'falsy' }).isMobilePhone('any', { strictMode: false }),
  body('specialization').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('hospital_name').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
];

/* ── Patient signup rules ─────────────────── */
const patientRules = [
  body('full_name').trim().notEmpty().withMessage('Full name is required.').isLength({ max: 150 }),
  body('email').trim().notEmpty().isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').notEmpty().isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
  body('phone').optional({ values: 'falsy' }).isMobilePhone('any', { strictMode: false }),
  body('date_of_birth').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date format.'),
  body('gender').optional({ values: 'falsy' }).isIn(['male', 'female', 'other']),
  body('blood_group').optional({ values: 'falsy' }).trim().isLength({ max: 5 }),
  body('address').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('emergency_contact').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
];

/* ── Login rules (unified) ────────────────── */
const loginRules = [
  body('email').trim().notEmpty().isEmail().normalizeEmail().withMessage('Valid email required.'),
  body('password').notEmpty().withMessage('Password is required.'),
];

/* ── Routes ───────────────────────────────── */
router.post('/signup/doctor',  doctorRules,  doctorSignup);
router.post('/signup/patient', patientRules, patientSignup);
router.post('/login',          loginRules,   login);

/* ── Google OAuth ─────────────────────────── */
router.post('/google',                  googleAuth);
router.post('/google/complete/doctor',  googleCompleteDoctor);
router.post('/google/complete/patient', googleCompletePatient);

module.exports = router;
