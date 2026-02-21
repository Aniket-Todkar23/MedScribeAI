const reportService = require('../services/reportService');
const multer = require('multer');
const { validationResult } = require('express-validator');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept only PDFs and images
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed.'));
    }
  }
}).single('report');

/**
 * POST /api/reports/upload
 * Upload a patient report (PDF or image)
 */
const uploadReport = async (req, res) => {
  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      // Check if file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const { patientId, reportType } = req.body;
      const doctorId = req.user?.userId || req.body.doctorId; // From auth middleware or request body

      // Validate required fields
      if (!patientId || !doctorId) {
        return res.status(400).json({
          success: false,
          message: 'Patient ID and Doctor ID are required'
        });
      }

      // Upload and process report
      const result = await reportService.uploadReport(
        req.file.buffer,
        req.file.originalname,
        req.file.size,
        patientId,
        doctorId,
        reportType || 'General'
      );

      return res.status(201).json(result);

    } catch (error) {
      console.error('[uploadReport controller]', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload report',
        error: error.message
      });
    }
  });
};

/**
 * GET /api/reports/patient/:patientId
 * Get all reports for a patient
 */
const getPatientReports = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    const result = await reportService.getPatientReports(patientId);
    return res.status(200).json(result);

  } catch (error) {
    console.error('[getPatientReports controller]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve reports',
      error: error.message
    });
  }
};

/**
 * GET /api/reports/history/:patientId
 * Get comprehensive patient history with all reports and summaries
 */
const getPatientHistory = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID is required'
      });
    }

    const result = await reportService.getPatientHistory(patientId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('[getPatientHistory controller]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient history',
      error: error.message
    });
  }
};

/**
 * DELETE /api/reports/:reportId
 * Delete a report
 */
const deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const doctorId = req.user?.userId || req.body.doctorId;

    if (!reportId || !doctorId) {
      return res.status(400).json({
        success: false,
        message: 'Report ID and Doctor ID are required'
      });
    }

    const result = await reportService.deleteReport(reportId, doctorId);
    
    if (!result.success) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error('[deleteReport controller]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete report',
      error: error.message
    });
  }
};

module.exports = {
  uploadReport,
  getPatientReports,
  getPatientHistory,
  deleteReport
};
