const { validationResult } = require('express-validator');
const onboardingService = require('../services/onboardingService');

/**
 * @route   POST /api/onboarding
 * @desc    Save patient onboarding data
 * @access  Private (Patient only)
 */
async function saveOnboarding(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation failed.', errors: errors.array() });
  }

  try {
    const patientId = req.user.id; // From auth middleware
    const onboardingData = req.body;

    console.log('[onboardingController] Saving onboarding for patient:', patientId);
    console.log('[onboardingController] Data:', JSON.stringify(onboardingData, null, 2));

    const result = await onboardingService.saveOnboardingData(patientId, onboardingData);

    return res.status(201).json({
      message: 'Onboarding completed successfully.',
      data: result,
    });
  } catch (err) {
    console.error('[onboardingController] saveOnboarding error:', err);
    console.error('[onboardingController] Stack:', err.stack);
    
    if (err.message === 'Patient not found') {
      return res.status(404).json({ message: err.message });
    }
    
    return res.status(500).json({ message: 'Failed to save onboarding data.', error: err.message });
  }
}

/**
 * @route   GET /api/onboarding
 * @desc    Get patient onboarding data
 * @access  Private (Patient only)
 */
async function getOnboarding(req, res) {
  try {
    const patientId = req.user.id;
    const data = await onboardingService.getOnboardingData(patientId);

    if (!data) {
      return res.status(404).json({ message: 'Onboarding data not found.' });
    }

    return res.json(data);
  } catch (err) {
    console.error('[onboardingController] getOnboarding error:', err);
    return res.status(500).json({ message: 'Failed to retrieve onboarding data.' });
  }
}

module.exports = {
  saveOnboarding,
  getOnboarding,
};
