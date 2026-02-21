const pool = require('../utils/db');
const azureBlobService = require('./azureBlobService');
const axios = require('axios');

/**
 * Generate AI summary from uploaded report
 * This is a placeholder - integrate with your AI service (OpenAI, Azure AI, etc.)
 */
async function generateAISummary(fileBuffer, fileExtension, fileName) {
  try {
    // Placeholder for AI integration
    // You can integrate with OpenAI, Azure Document Intelligence, or other AI services
    
    // For now, return a basic summary structure
    const summary = {
      summary: `Medical report uploaded: ${fileName}. AI analysis in progress.`,
      keyFindings: [
        'Report uploaded successfully',
        'Awaiting detailed analysis',
        'File type: ' + fileExtension.toUpperCase()
      ]
    };

    // TODO: Integrate actual AI service here
    // Example with OpenAI (requires API key):
    /*
    const openai = require('openai');
    const client = new openai.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // For images, use vision API
    if (['.jpg', '.jpeg', '.png'].includes(fileExtension)) {
      const base64Image = fileBuffer.toString('base64');
      const response = await client.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Analyze this medical report and provide a summary with key findings." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }]
      });
      summary.summary = response.choices[0].message.content;
    }
    
    // For PDFs, extract text first then analyze
    if (fileExtension === '.pdf') {
      // Use PDF extraction library
      // Then send to AI for analysis
    }
    */

    return summary;
  } catch (error) {
    console.error('[generateAISummary] Error:', error.message);
    return {
      summary: 'Unable to generate AI summary at this time.',
      keyFindings: ['Manual review required']
    };
  }
}

/**
 * Upload patient report and generate summary
 */
async function uploadReport(fileBuffer, fileName, fileSize, patientId, doctorId, reportType) {
  const client = await pool.connect();
  
  try {
    // Determine file extension and content type
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (fileExtension === '.pdf') {
      contentType = 'application/pdf';
    } else if (['.jpg', '.jpeg'].includes(fileExtension)) {
      contentType = 'image/jpeg';
    } else if (fileExtension === '.png') {
      contentType = 'image/png';
    }

    // Upload to Azure Blob Storage
    console.log('[uploadReport] Uploading to Azure Blob...');
    const uploadResult = await azureBlobService.uploadFile(fileBuffer, fileName, contentType);

    if (!uploadResult.success) {
      throw new Error('Failed to upload file to storage');
    }

    // Generate AI summary
    console.log('[uploadReport] Generating AI summary...');
    const aiAnalysis = await generateAISummary(fileBuffer, fileExtension, fileName);

    // Save to database
    console.log('[uploadReport] Saving to database...');
    const result = await client.query(
      `INSERT INTO patient_reports 
        (patient_id, doctor_id, report_name, report_type, file_url, 
         file_size, file_extension, ai_summary, key_findings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        patientId,
        doctorId,
        fileName,
        reportType,
        uploadResult.sasUrl,
        fileSize,
        fileExtension,
        aiAnalysis.summary,
        aiAnalysis.keyFindings
      ]
    );

    return {
      success: true,
      report: result.rows[0],
      message: 'Report uploaded and analyzed successfully'
    };

  } catch (error) {
    console.error('[uploadReport] Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all reports for a patient
 */
async function getPatientReports(patientId) {
  try {
    const result = await pool.query(
      `SELECT 
        r.*,
        d.full_name as doctor_name,
        d.specialization as doctor_specialization
       FROM patient_reports r
       LEFT JOIN doctors d ON r.doctor_id = d.doctor_id
       WHERE r.patient_id = $1
       ORDER BY r.uploaded_at DESC`,
      [patientId]
    );

    return {
      success: true,
      reports: result.rows
    };
  } catch (error) {
    console.error('[getPatientReports] Error:', error.message);
    throw error;
  }
}

/**
 * Get patient history with all reports and summaries
 */
async function getPatientHistory(patientId) {
  const client = await pool.connect();
  
  try {
    // Get patient basic info
    const patientResult = await client.query(
      `SELECT * FROM patients WHERE patient_id = $1`,
      [patientId]
    );

    if (patientResult.rows.length === 0) {
      return {
        success: false,
        message: 'Patient not found'
      };
    }

    const patient = patientResult.rows[0];

    // Get all reports
    const reportsResult = await client.query(
      `SELECT 
        r.*,
        d.full_name as doctor_name,
        d.specialization as doctor_specialization
       FROM patient_reports r
       LEFT JOIN doctors d ON r.doctor_id = d.doctor_id
       WHERE r.patient_id = $1
       ORDER BY r.uploaded_at DESC`,
      [patientId]
    );

    // Get onboarding data if exists
    const onboardingResult = await client.query(
      `SELECT * FROM onboarding WHERE patient_id = $1`,
      [patientId]
    );

    // Compile comprehensive history
    const history = {
      patient: {
        id: patient.patient_id,
        name: patient.full_name,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.date_of_birth,
        gender: patient.gender
      },
      onboarding: onboardingResult.rows[0] || null,
      reports: reportsResult.rows,
      reportSummary: {
        totalReports: reportsResult.rows.length,
        recentUploads: reportsResult.rows.slice(0, 5),
        allKeyFindings: reportsResult.rows
          .flatMap(r => r.key_findings || [])
          .filter((finding, index, self) => self.indexOf(finding) === index) // unique
      }
    };

    return {
      success: true,
      history
    };

  } catch (error) {
    console.error('[getPatientHistory] Error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete a report
 */
async function deleteReport(reportId, doctorId) {
  try {
    const result = await pool.query(
      `DELETE FROM patient_reports 
       WHERE report_id = $1 AND doctor_id = $2
       RETURNING *`,
      [reportId, doctorId]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'Report not found or unauthorized'
      };
    }

    return {
      success: true,
      message: 'Report deleted successfully'
    };
  } catch (error) {
    console.error('[deleteReport] Error:', error.message);
    throw error;
  }
}

module.exports = {
  uploadReport,
  getPatientReports,
  getPatientHistory,
  deleteReport,
  generateAISummary
};
