const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const ctrl    = require('../controllers/doctorController');

/**
 * GET /api/doctors/:id/profile
 * Get doctor profile.
 */
router.get('/:id/profile', requireAuth, ctrl.getProfile);

/**
 * GET /api/doctors/:id/analytics
 * Get aggregated analytics for a doctor.
 */
router.get('/:id/analytics', requireAuth, ctrl.getAnalytics);

/**
 * GET /api/doctors/:id/audit-log?limit=50&offset=0
 * Get audit log entries for a doctor.
 */
router.get('/:id/audit-log', requireAuth, ctrl.getAuditLog);

module.exports = router;
