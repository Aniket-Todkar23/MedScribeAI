const doctorService = require('../services/doctorService');

/**
 * GET /api/doctors/:id/profile
 */
const getProfile = async (req, res) => {
  try {
    const profile = await doctorService.getProfile(req.params.id);
    if (!profile) return res.status(404).json({ message: 'Doctor not found.' });
    res.json({ doctor: profile });
  } catch (err) {
    console.error('[doctorController.getProfile]', err.message);
    res.status(500).json({ message: 'Failed to get doctor profile.' });
  }
};

/**
 * GET /api/doctors/:id/analytics
 */
const getAnalytics = async (req, res) => {
  try {
    const analytics = await doctorService.getAnalytics(req.params.id);
    res.json({ analytics });
  } catch (err) {
    console.error('[doctorController.getAnalytics]', err.message);
    res.status(500).json({ message: 'Failed to get analytics.' });
  }
};

/**
 * GET /api/doctors/:id/audit-log
 */
const getAuditLog = async (req, res) => {
  try {
    const entries = await doctorService.getAuditLog(req.params.id, {
      limit:  Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    });
    res.json({ auditLog: entries });
  } catch (err) {
    console.error('[doctorController.getAuditLog]', err.message);
    res.status(500).json({ message: 'Failed to get audit log.' });
  }
};

module.exports = { getProfile, getAnalytics, getAuditLog };
