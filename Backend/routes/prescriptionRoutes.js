const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl    = require('../controllers/prescriptionController');

/**
 * POST /api/prescriptions
 * Save a prescription (creates or updates consultation).
 */
router.post('/', requireAuth, ctrl.savePrescription);

/**
 * GET /api/prescriptions/:consultationId
 * Get prescription by consultation ID.
 */
router.get('/:consultationId', requireAuth, ctrl.getPrescription);

module.exports = router;
