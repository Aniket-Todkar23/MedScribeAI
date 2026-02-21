const { google } = require('googleapis');
const config = require('../config/config');
const recordingService = require('./recordingService');
const supabaseService = require('./supabaseService');
const emailService = require('./emailService');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class MeetRecordingService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            config.google.clientId,
            config.google.clientSecret,
            config.google.redirectUrl
        );
    }

    /**
     * Set OAuth credentials
     */
    setCredentials(tokens) {
        this.oauth2Client.setCredentials(tokens);
    }

    /**
     * Enable auto-recording for Google Meet event
     * NOTE: Google Meet requires manual recording start by meeting host
     * This method ensures the Meet link has recording capability enabled
     * @param {string} eventId - Google Calendar event ID
     */
    async enableAutoRecording(eventId) {
        try {
            const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
            
            // Verify the event has Google Meet conference data
            const event = await calendar.events.get({
                calendarId: 'primary',
                eventId: eventId
            });

            if (event.data.conferenceData?.entryPoints) {
                console.log('✅ Google Meet recording capability verified for event:', eventId);
                console.log('⚠️ IMPORTANT: Recording must be started manually in Google Meet by the meeting host');
                console.log('📋 To record: Join meeting → Click 3 dots menu → Click "Record meeting"');
                return event.data;
            } else {
                console.warn('⚠️ Event does not have Google Meet conference data');
                return null;
            }
        } catch (error) {
            console.error('❌ Failed to verify recording capability:', error.message);
            // Non-fatal: Continue even if verification fails
            return null;
        }
    }

    /**
     * Poll for Google Drive recordings after meeting
     * @param {string} eventId - Calendar event ID
     * @param {string} appointmentId - Appointment UUID
     * @param {Object} tokens - OAuth tokens
     */
    async pollForRecording(eventId, appointmentId, tokens, maxAttempts = 20) {
        this.setCredentials(tokens);
        
        const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`🔍 [${appointmentId}] Polling attempt ${attempt}/${maxAttempts} for recording...`);
                
                // Search for Meet recordings in Google Drive
                // Google Meet recordings are auto-saved to "Meet Recordings" folder
                // File names typically start with "GMT" (Google Meet Timestamp)
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
                
                const response = await drive.files.list({
                    q: `(name contains 'GMT' or name contains 'Meet Recording') and (mimeType contains 'video' or mimeType = 'application/vnd.google-apps.video') and modifiedTime > '${yesterday}' and trashed = false`,
                    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink, webContentLink)',
                    orderBy: 'modifiedTime desc',
                    pageSize: 20,
                    spaces: 'drive'
                });

                console.log(`📊 Found ${response.data.files?.length || 0} video files in Drive`);
                
                if (response.data.files && response.data.files.length > 0) {
                    // Log all found files for debugging
                    response.data.files.forEach((file, index) => {
                        console.log(`  ${index + 1}. ${file.name} (${file.mimeType}) - Modified: ${file.modifiedTime}`);
                    });
                    
                    // Use the most recent recording
                    const recordingFile = response.data.files[0];
                    console.log(`✅ [${appointmentId}] Using recording: ${recordingFile.name}`);
                    
                    // Process the recording (save Google Drive URL to DB)
                    const result = await this.processRecording(appointmentId, recordingFile.id, recordingFile.name, tokens);
                    return result;
                }
                
                console.log(`⏳ No recording found yet, waiting 30 seconds...`);
                
                // Wait 30 seconds before next poll
                if (attempt < maxAttempts) {
                    await this.sleep(30000);
                }
            } catch (error) {
                console.error(`❌ Polling error (attempt ${attempt}):`, error.message);
                if (attempt < maxAttempts) {
                    await this.sleep(30000);
                }
            }
        }
        
        console.log('⚠️ No recording found after maximum polling attempts');
        return null;
    }

    /**
     * Process recording - Store Google Drive URL directly (NO download/conversion)
     */
    async processRecording(appointmentId, fileId, fileName, tokens) {
        this.setCredentials(tokens);
        const drive = google.drive({ version: 'v3', auth: this.oauth2Client });
        
        try {
            console.log('📄 Getting recording metadata from Google Drive...');
            
            // Get file metadata including webViewLink and webContentLink
            const fileMetadata = await drive.files.get({
                fileId: fileId,
                fields: 'id, name, mimeType, size, webViewLink, webContentLink, createdTime'
            });

            const file = fileMetadata.data;
            const driveUrl = file.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
            
            console.log('✅ Recording metadata retrieved');
            console.log(`📹 Recording: ${file.name}`);
            console.log(`🔗 Google Drive URL: ${driveUrl}`);
            
            // Get appointment details
            const appointment = await supabaseService.getAppointmentById(appointmentId);
            const doctor = await supabaseService.getDoctorById(appointment.doctor_id);
            const patient = await supabaseService.getPatientById(appointment.patient_id);
            
            // Create consultation if doesn't exist
            let consultationId;
            if (appointment.consultation_id) {
                consultationId = appointment.consultation_id;
            } else {
                const consultation = await supabaseService.createConsultation({
                    doctor_id: appointment.doctor_id,
                    patient_id: appointment.patient_id,
                    appointment_id: appointmentId,
                    status: 'draft',
                    consultation_date: new Date().toISOString()
                });
                consultationId = consultation.consultation_id;
                
                // Update appointment with consultation_id
                await supabaseService.updateAppointment(appointmentId, {
                    consultation_id: consultationId
                });
            }
            
            // Save document record with Google Drive URL
            const fileSizeKB = file.size ? Math.round(parseInt(file.size) / 1024) : 0;
            
            const document = await supabaseService.createDocument({
                consultation_id: consultationId,
                patient_id: appointment.patient_id,
                doctor_id: appointment.doctor_id,
                document_name: file.name,
                document_type: 'recording',
                file_url: driveUrl,
                file_size_kb: fileSizeKB,
                mime_type: file.mimeType || 'video/mp4',
                uploaded_by: appointment.doctor_id,
                notes: 'Google Meet recording - stored in Google Drive'
            });
            
            console.log('✅ Document record created in database');
            
            // Send email notification to patient
            if (patient.email) {
                await emailService.sendRecordingProcessedNotification({
                    to: patient.email,
                    patientName: patient.full_name,
                    appointmentDate: new Date(appointment.appointment_date).toLocaleDateString(),
                    recordingUrl: driveUrl
                });
                console.log('✅ Email notification sent to patient');
            }
            
            console.log('🎉 Recording saved successfully! No download/conversion needed.');
            return document;
            
        } catch (error) {
            console.error('❌ Recording processing failed:', error.message);
            throw error;
        }
    }

    /**
     * Start background polling job for recording
     * Waits for meeting to complete, then polls Google Drive
     */
    async startRecordingPolling(eventId, appointmentId, tokens) {
        // Run in background
        setImmediate(async () => {
            try {
                // Wait 2 minutes for meeting to potentially start and for recording to begin saving
                console.log(`⏱️ [Appointment ${appointmentId}] Waiting 2 minutes before polling for recording...`);
                console.log(`📅 Event ID: ${eventId}`);
                await this.sleep(2 * 60 * 1000);
                
                console.log(`🔍 [Appointment ${appointmentId}] Starting to poll for recording...`);
                const result = await this.pollForRecording(eventId, appointmentId, tokens);
                
                if (result) {
                    console.log(`✅ [Appointment ${appointmentId}] Recording found and saved!`);
                } else {
                    console.log(`⚠️ [Appointment ${appointmentId}] No recording found. Meeting may not have been recorded.`);
                }
            } catch (error) {
                console.error(`❌ [Appointment ${appointmentId}] Background polling error:`, error.message);
            }
        });
        
        console.log(`✅ Background polling job started for appointment ${appointmentId}`);
        console.log(`ℹ️ Polling will begin in 2 minutes and check every 30 seconds for up to 20 attempts (10 minutes)`);
    }

    /**
     * Utility: Sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new MeetRecordingService();
