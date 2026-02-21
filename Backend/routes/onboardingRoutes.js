const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const onboardingController = require('../controllers/onboardingController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = Router();

/* ── Validation rules ─────────────────────── */
const onboardingRules = [
  // Step 2: Medical conditions (optional booleans)
  body('hasDiabetes').optional().isBoolean(),
  body('diabetesType').optional().isIn(['type1', 'type2', 'gestational', 'not-sure']),
  body('onInsulin').optional().isBoolean(),
  
  body('hasHeartDisease').optional().isBoolean(),
  body('heartConditions').optional().isArray(),
  
  body('hasLungDisease').optional().isBoolean(),
  body('lungConditions').optional().isArray(),
  body('usesInhalerDaily').optional().isBoolean(),
  
  body('noMedicalConditions').optional().isBoolean(),

  // Step 3: Medications & Lifestyle
  body('takingMedications').optional().isBoolean(),
  body('medicationsList').optional().trim().isLength({ max: 2000 }),
  
  body('hasAllergies').optional().isBoolean(),
  body('allergiesList').optional().trim().isLength({ max: 500 }),
  
  body('smokingStatus').optional().isIn(['never', 'occasionally', 'regularly']),
  body('alcoholUse').optional().isIn(['no', 'occasionally', 'regularly']),
  
  body('hadMajorSurgeries').optional().isBoolean(),
  body('surgeriesDetails').optional().trim().isLength({ max: 2000 }),

  // Step 4: Consent (required)
  body('consentDataStorage').isBoolean().withMessage('Data storage consent is required'),
  body('consentAIAssist').isBoolean().withMessage('AI assistance consent is required'),
];

/* ── Routes ───────────────────────────────── */
router.post('/', requireAuth, (req, res) => onboardingController.saveOnboarding(req, res));
router.get('/', requireAuth, (req, res) => onboardingController.getOnboarding(req, res));

module.exports = router;
