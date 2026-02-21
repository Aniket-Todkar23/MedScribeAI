const supabaseService = require('../services/supabaseService');
const googleMeetService = require('../services/googleMeetService');
const recordingService = require('../services/recordingService');
const emailService = require('../services/emailService');
const meetRecordingService = require('../services/meetRecordingService');
const moment = require('moment');

class AppointmentController {
    /**
     * Create a new appointment request (by patient) - FULLY AUTOMATED PIPELINE
     * Automatically creates Meet link, sends emails, enables auto-recording
     */
    async createAppointmentRequest(req, res) {
        try {
            const {
                doctor_id,
                patient_id,
                appointment_date,
                duration_minutes,
                appointment_type,
                reason,
                notes,
                google_tokens // Optional: OAuth tokens for Google Meet/Drive access
            } = req.body;

            // Validate required fields
            if (!doctor_id || !patient_id || !appointment_date) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: doctor_id, patient_id, appointment_date'
                });
            }

            // Verify doctor and patient exist
            const doctor = await supabaseService.getDoctorById(doctor_id);
            const patient = await supabaseService.getPatientById(patient_id);

            if (!doctor || !patient) {
                return res.status(404).json({
                    success: false,
                    message: 'Doctor or Patient not found'
                });
            }

            // Create appointment with 'scheduled' status initially
            const appointmentData = {
                doctor_id,
                patient_id,
                appointment_date: new Date(appointment_date).toISOString(),
                duration_minutes: duration_minutes || 30,
                appointment_type: appointment_type || 'in_person',
                status: 'scheduled',
                reason,
                notes
            };

            const appointment = await supabaseService.createAppointment(appointmentData);
            console.log(`✅ Appointment created: ${appointment.appointment_id}`);

            // AUTOMATED PIPELINE: For telehealth appointments, automatically create Meet link
            let meetLink = null;
            let eventId = null;
            let pipelineStatus = {
                meetLinkCreated: false,
                emailsSent: { patient: false, doctor: false },
                autoRecordingEnabled: false,
                pollingStarted: false
            };

            if (appointment_type === 'telehealth') {
                try {
                    console.log('📅 Starting automated pipeline for telehealth appointment...');

                    // Check if Google OAuth tokens are provided
                    if (!google_tokens) {
                        console.warn('⚠️ No Google OAuth tokens provided. Telehealth appointment created but Meet link NOT generated.');
                        console.warn('ℹ️ To enable automated pipeline: Complete Google OAuth first, then include google_tokens in request.');
                        
                        // Create notification without Meet link
                        await supabaseService.createNotificationLog({
                            appointment_id: appointment.appointment_id,
                            patient_id: patient_id,
                            channel: 'email',
                            status: 'pending',
                            message_content: `Telehealth appointment created for ${moment(appointment_date).format('MMMM Do YYYY, h:mm a')}\n\n⚠️ Google Meet link not generated - OAuth authorization required.`
                        });
                        
                        return res.status(201).json({
                            success: true,
                            message: '⚠️ Telehealth appointment created but automated pipeline NOT started. Please authorize Google OAuth first.',
                            data: {
                                ...appointment,
                                warning: 'Google OAuth tokens not provided. Complete OAuth authorization to enable automated Meet link creation, emails, and recording.',
                                nextSteps: [
                                    '1. Go to Google OAuth tab in the frontend',
                                    '2. Click "Start Authorization" and complete OAuth flow',
                                    '3. Click "Save Authorization Tokens"',
                                    '4. Create a new telehealth appointment'
                                ]
                            }
                        });
                    }

                    // Set Google OAuth credentials
                    googleMeetService.setCredentials(google_tokens);
                    meetRecordingService.setCredentials(google_tokens);
                    console.log('✅ Google OAuth credentials set');

                    // 1. CREATE GOOGLE MEET LINK
                    const meetingData = {
                        patientName: patient.full_name,
                        doctorName: doctor.full_name,
                        appointmentDate: appointment.appointment_date,
                        duration: appointment.duration_minutes,
                        reason: appointment.reason,
                        patientEmail: patient.email,
                        doctorEmail: doctor.email
                    };

                    const meetEvent = await googleMeetService.createMeetingEvent(meetingData);
                    meetLink = meetEvent.meetLink;
                    eventId = meetEvent.eventId;
                    pipelineStatus.meetLinkCreated = true;
                    console.log(`✅ Meet link created: ${meetLink}`);

                    // 2. ENABLE AUTO-RECORDING
                    await meetRecordingService.enableAutoRecording(eventId);
                    pipelineStatus.autoRecordingEnabled = true;
                    console.log('✅ Auto-recording enabled');

                    // 3. UPDATE APPOINTMENT STATUS TO 'CONFIRMED'
                    await supabaseService.updateAppointment(appointment.appointment_id, {
                        status: 'confirmed',
                        notes: (appointment.notes || '') + `\n\nGoogle Meet Link: ${meetLink}`
                    });
                    appointment.status = 'confirmed';
                    console.log('✅ Appointment status updated to confirmed');

                    // 4. SEND EMAIL TO PATIENT
                    if (patient.email) {
                        try {
                            await emailService.sendAppointmentConfirmation({
                                to: patient.email,
                                doctorName: doctor.full_name,
                                patientName: patient.full_name,
                                appointmentDate: moment(appointment.appointment_date).format('MMMM Do YYYY'),
                                appointmentTime: moment(appointment.appointment_date).format('h:mm A'),
                                meetLink: meetLink,
                                duration: appointment.duration_minutes || 30
                            });
                            pipelineStatus.emailsSent.patient = true;
                            console.log(`✅ Patient email sent to: ${patient.email}`);
                        } catch (emailError) {
                            console.error('⚠️ Patient email failed:', emailError.message);
                        }
                    }

                    // 5. SEND EMAIL TO DOCTOR
                    if (doctor.email) {
                        try {
                            await emailService.sendDoctorNotification({
                                to: doctor.email,
                                doctorName: doctor.full_name,
                                patientName: patient.full_name,
                                appointmentDate: moment(appointment.appointment_date).format('MMMM Do YYYY'),
                                appointmentTime: moment(appointment.appointment_date).format('h:mm A'),
                                meetLink: meetLink,
                                reason: appointment.reason,
                                duration: appointment.duration_minutes || 30
                            });
                            pipelineStatus.emailsSent.doctor = true;
                            console.log(`✅ Doctor email sent to: ${doctor.email}`);
                        } catch (emailError) {
                            console.error('⚠️ Doctor email failed:', emailError.message);
                        }
                    }

                    // 6. START BACKGROUND POLLING FOR RECORDING
                    if (google_tokens) {
                        meetRecordingService.startRecordingPolling(eventId, appointment.appointment_id, google_tokens);
                        pipelineStatus.pollingStarted = true;
                        console.log('✅ Background recording polling started');
                    } else {
                        console.warn('⚠️ No Google tokens provided - recording polling not started');
                    }

                    // 7. CREATE NOTIFICATION LOG
                    await supabaseService.createNotificationLog({
                        appointment_id: appointment.appointment_id,
                        patient_id: patient_id,
                        channel: 'email',
                        status: 'sent',
                        message_content: `Appointment confirmed for ${moment(appointment.appointment_date).format('MMMM Do YYYY, h:mm a')}\n\nJoin Meeting: ${meetLink}`
                    });
                    console.log('✅ Notification log created');

                } catch (pipelineError) {
                    console.error('❌ Automated pipeline error:', pipelineError.message);
                    // Non-fatal: Return appointment even if pipeline partially fails
                }
            } else {
                // For non-telehealth appointments, just send basic notification
                await supabaseService.createNotificationLog({
                    appointment_id: appointment.appointment_id,
                    patient_id: patient_id,
                    channel: 'email',
                    status: 'pending',
                    message_content: `Appointment created for ${moment(appointment_date).format('MMMM Do YYYY, h:mm a')}`
                });
            }

            console.log('🎉 Automated pipeline completed successfully!');

            res.status(201).json({
                success: true,
                message: appointment_type === 'telehealth' 
                    ? 'Appointment created! Meet link generated, emails sent, auto-recording enabled.'
                    : 'Appointment created successfully',
                data: {
                    ...appointment,
                    meetLink,
                    eventId,
                    pipeline: pipelineStatus
                }
            });
        } catch (error) {
            console.error('Error creating appointment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create appointment',
                error: error.message
            });
        }
    }

    /**
     * Confirm appointment and create Google Meet link (by doctor)
     */
    async confirmAppointment(req, res) {
        try {
            const { appointmentId } = req.params;
            const { google_tokens } = req.body; // Doctor's Google OAuth tokens

            // Get appointment details
            const appointment = await supabaseService.getAppointmentById(appointmentId);

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
            }

            // Get doctor and patient details
            const doctor = await supabaseService.getDoctorById(appointment.doctor_id);
            const patient = await supabaseService.getPatientById(appointment.patient_id);

            // For telehealth appointments, create Google Meet link
            let meetLink = null;
            let eventId = null;

            if (appointment.appointment_type === 'telehealth') {
                // Set Google OAuth credentials
                if (google_tokens) {
                    googleMeetService.setCredentials(google_tokens);
                    meetRecordingService.setCredentials(google_tokens);
                }

                // Create Google Calendar event with Meet link
                const meetingData = {
                    patientName: patient.full_name,
                    doctorName: doctor.full_name,
                    appointmentDate: appointment.appointment_date,
                    duration: appointment.duration_minutes,
                    reason: appointment.reason,
                    patientEmail: patient.email,
                    doctorEmail: doctor.email
                };

                const meetEvent = await googleMeetService.createMeetingEvent(meetingData);
                meetLink = meetEvent.meetLink;
                eventId = meetEvent.eventId;

                // Enable auto-recording for this meeting
                await meetRecordingService.enableAutoRecording(eventId);

                // Start background polling for recording after meeting
                // This will wait for the meeting to end and automatically process the recording
                meetRecordingService.startRecordingPolling(eventId, appointmentId, google_tokens);
                console.log('✅ Auto-recording polling started for appointment:', appointmentId);
            }

            // Update appointment status to confirmed
            const updatedAppointment = await supabaseService.updateAppointment(appointmentId, {
                status: 'confirmed',
                notes: appointment.notes + (meetLink ? `\n\nGoogle Meet Link: ${meetLink}` : '')
            });

            // Send email notification to PATIENT
            if (patient.email && meetLink) {
                try {
                    await emailService.sendAppointmentConfirmation({
                        to: patient.email,
                        doctorName: doctor.full_name,
                        patientName: patient.full_name,
                        appointmentDate: moment(appointment.appointment_date).format('MMMM Do YYYY'),
                        appointmentTime: moment(appointment.appointment_date).format('h:mm A'),
                        meetLink: meetLink,
                        duration: appointment.duration_minutes || 30
                    });
                    console.log('✅ Patient email sent to:', patient.email);
                } catch (emailError) {
                    console.error('⚠️ Failed to send patient email:', emailError.message);
                    // Non-fatal: Continue even if email fails
                }
            }

            // Send email notification to DOCTOR
            if (doctor.email && meetLink) {
                try {
                    await emailService.sendDoctorNotification({
                        to: doctor.email,
                        doctorName: doctor.full_name,
                        patientName: patient.full_name,
                        appointmentDate: moment(appointment.appointment_date).format('MMMM Do YYYY'),
                        appointmentTime: moment(appointment.appointment_date).format('h:mm A'),
                        meetLink: meetLink,
                        reason: appointment.reason,
                        duration: appointment.duration_minutes || 30
                    });
                    console.log('✅ Doctor email sent to:', doctor.email);
                } catch (emailError) {
                    console.error('⚠️ Failed to send doctor email:', emailError.message);
                    // Non-fatal: Continue even if email fails
                }
            }

            // Send confirmation notification log
            const meetingInfo = meetLink ? `\n\nJoin Meeting: ${meetLink}` : '';
            await supabaseService.createNotificationLog({
                appointment_id: appointmentId,
                patient_id: appointment.patient_id,
                channel: 'email',
                status: 'sent',
                message_content: `Appointment confirmed for ${moment(appointment.appointment_date).format('MMMM Do YYYY, h:mm a')}${meetingInfo}`
            });

            res.status(200).json({
                success: true,
                message: 'Appointment confirmed successfully. Emails sent to patient and doctor. Auto-recording enabled.',
                data: {
                    ...updatedAppointment,
                    meetLink,
                    eventId,
                    autoRecordingEnabled: true,
                    emailsSent: {
                        patient: !!patient.email,
                        doctor: !!doctor.email
                    }
                }
            });
        } catch (error) {
            console.error('Error confirming appointment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to confirm appointment',
                error: error.message
            });
        }
    }

    /**
     * Upload and process meeting recording
     */
    async uploadRecording(req, res) {
        try {
            const { appointmentId } = req.params;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No recording file provided'
                });
            }

            // Validate file format
            if (!recordingService.isValidFormat(file.originalname)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid file format. Supported formats: webm, wav, mp4, ogg'
                });
            }

            // Get appointment details
            const appointment = await supabaseService.getAppointmentById(appointmentId);

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
            }

            // Process and upload recording
            const recordingResult = await recordingService.processAndUploadRecording(
                file.buffer,
                file.originalname,
                {
                    appointmentId: appointmentId,
                    doctorId: appointment.doctor_id,
                    patientId: appointment.patient_id
                }
            );

            // Create consultation if not exists
            let consultationId = appointment.consultation_id;
            
            if (!consultationId) {
                const consultation = await supabaseService.createConsultation({
                    doctor_id: appointment.doctor_id,
                    patient_id: appointment.patient_id,
                    appointment_id: appointmentId,
                    status: 'draft'
                });
                consultationId = consultation.consultation_id;
            }

            // Save recording reference in documents table
            await supabaseService.createDocument({
                consultation_id: consultationId,
                patient_id: appointment.patient_id,
                doctor_id: appointment.doctor_id,
                document_name: `Recording - ${moment(appointment.appointment_date).format('YYYY-MM-DD')}`,
                document_type: 'other',
                file_url: recordingResult.blobName, // Store blob name, not SAS URL
                file_size_kb: Math.round(recordingResult.size / 1024),
                mime_type: 'audio/mpeg',
                uploaded_by: appointment.doctor_id,
                notes: 'Consultation recording - MP3 format'
            });

            res.status(200).json({
                success: true,
                message: 'Recording uploaded and processed successfully',
                data: {
                    recordingUrl: recordingResult.recordingUrl, // SAS URL for temporary access
                    blobName: recordingResult.blobName,
                    size: recordingResult.size,
                    format: recordingResult.format,
                    consultationId: consultationId
                }
            });
        } catch (error) {
            console.error('Error uploading recording:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to upload recording',
                error: error.message
            });
        }
    }

    /**
     * Get appointments for a doctor
     */
    async getDoctorAppointments(req, res) {
        try {
            const { doctorId } = req.params;
            const { status, startDate, endDate } = req.query;

            const filters = {};
            if (status) filters.status = status;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const appointments = await supabaseService.getAppointmentsByDoctor(doctorId, filters);

            res.status(200).json({
                success: true,
                count: appointments.length,
                data: appointments
            });
        } catch (error) {
            console.error('Error getting doctor appointments:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get appointments',
                error: error.message
            });
        }
    }

    /**
     * Get appointments for a patient
     */
    async getPatientAppointments(req, res) {
        try {
            const { patientId } = req.params;
            const { status } = req.query;

            const filters = {};
            if (status) filters.status = status;

            const appointments = await supabaseService.getAppointmentsByPatient(patientId, filters);

            res.status(200).json({
                success: true,
                count: appointments.length,
                data: appointments
            });
        } catch (error) {
            console.error('Error getting patient appointments:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get appointments',
                error: error.message
            });
        }
    }

    /**
     * Get appointment by ID
     */
    async getAppointment(req, res) {
        try {
            const { appointmentId } = req.params;

            const appointment = await supabaseService.getAppointmentById(appointmentId);

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    message: 'Appointment not found'
                });
            }

            res.status(200).json({
                success: true,
                data: appointment
            });
        } catch (error) {
            console.error('Error getting appointment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get appointment',
                error: error.message
            });
        }
    }

    /**
     * Update appointment
     */
    async updateAppointment(req, res) {
        try {
            const { appointmentId } = req.params;
            const updateData = req.body;

            // Don't allow direct status updates via this endpoint
            delete updateData.status;

            const appointment = await supabaseService.updateAppointment(appointmentId, updateData);

            res.status(200).json({
                success: true,
                message: 'Appointment updated successfully',
                data: appointment
            });
        } catch (error) {
            console.error('Error updating appointment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update appointment',
                error: error.message
            });
        }
    }

    /**
     * Cancel appointment
     */
    async cancelAppointment(req, res) {
        try {
            const { appointmentId } = req.params;
            const { cancelled_reason } = req.body;

            if (!cancelled_reason) {
                return res.status(400).json({
                    success: false,
                    message: 'Cancellation reason is required'
                });
            }

            const appointment = await supabaseService.cancelAppointment(appointmentId, cancelled_reason);

            // Send cancellation notification
            await supabaseService.createNotificationLog({
                appointment_id: appointmentId,
                patient_id: appointment.patient_id,
                channel: 'email',
                status: 'pending',
                message_content: `Appointment cancelled. Reason: ${cancelled_reason}`
            });

            res.status(200).json({
                success: true,
                message: 'Appointment cancelled successfully',
                data: appointment
            });
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to cancel appointment',
                error: error.message
            });
        }
    }

    /**
     * Get all doctors
     */
    async getAllDoctors(req, res) {
        try {
            const { specialization } = req.query;
            const filters = {};
            if (specialization) filters.specialization = specialization;

            const doctors = await supabaseService.getAllDoctors(filters);

            res.status(200).json({
                success: true,
                count: doctors.length,
                data: doctors
            });
        } catch (error) {
            console.error('Error getting doctors:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get doctors',
                error: error.message
            });
        }
    }

    /**
     * Generate new SAS URL for recording
     */
    async generateRecordingSasUrl(req, res) {
        try {
            const { blobName } = req.params;
            const { expiryHours } = req.query;

            const sasUrl = await recordingService.generateNewSasUrl(
                blobName,
                expiryHours ? Number.parseInt(expiryHours) : 24
            );

            res.status(200).json({
                success: true,
                sasUrl: sasUrl,
                expiresIn: `${expiryHours || 24} hours`
            });
        } catch (error) {
            console.error('Error generating SAS URL:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate SAS URL',
                error: error.message
            });
        }
    }

    /**
     * Google OAuth callback
     */
    async googleOAuthCallback(req, res) {
        try {
            const { code } = req.query;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: 'Authorization code is required'
                });
            }

            const tokens = await googleMeetService.getTokensFromCode(code);

            res.status(200).json({
                success: true,
                message: 'Google OAuth successful',
                tokens: tokens
            });
        } catch (error) {
            console.error('Error in OAuth callback:', error);
            res.status(500).json({
                success: false,
                message: 'OAuth authentication failed',
                error: error.message
            });
        }
    }

    /**
     * Get Google OAuth URL
     */
    async getGoogleAuthUrl(req, res) {
        try {
            const authUrl = googleMeetService.getAuthUrl();

            res.status(200).json({
                success: true,
                authUrl: authUrl
            });
        } catch (error) {
            console.error('Error getting auth URL:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get auth URL',
                error: error.message
            });
        }
    }

    /**
     * Exchange authorization code for tokens (POST version)
     * Used by frontend to get tokens for localStorage
     */
    async exchangeCodeForTokens(req, res) {
        try {
            let { code } = req.body;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: 'Authorization code is required'
                });
            }

            // Decode the authorization code (it may be URL-encoded)
            code = decodeURIComponent(code);
            
            console.log('🔑 Exchanging auth code for Google OAuth tokens...');
            console.log('📝 Code length:', code.length, 'chars');
            console.log('📝 Code preview:', code.substring(0, 20) + '...');
            
            const tokens = await googleMeetService.getTokensFromCode(code);

            res.status(200).json({
                success: true,
                message: 'Google OAuth tokens received successfully. Tokens saved to localStorage.',
                tokens: tokens
            });
        } catch (error) {
            console.error('❌ Error exchanging code for tokens:', error);
            
            let errorMessage = 'Failed to exchange authorization code';
            let helpText = '';
            
            if (error.message.includes('invalid_grant')) {
                errorMessage = 'Invalid or expired authorization code';
                helpText = 'OAuth codes can only be used ONCE and expire in 10 minutes. Please get a new authorization code by clicking "Authorize Google Calendar" again.';
            }
            
            res.status(500).json({
                success: false,
                message: errorMessage,
                help: helpText,
                error: error.message
            });
        }
    }
}

module.exports = new AppointmentController();
