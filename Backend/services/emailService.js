const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.email.user,
                pass: config.email.password
            }
        });
    }

    /**
     * Send appointment confirmation email with Google Meet link
     * @param {Object} params - Email parameters
     */
    async sendAppointmentConfirmation({ to, doctorName, patientName, appointmentDate, appointmentTime, meetLink, duration }) {
        try {
            const mailOptions = {
                from: config.email.from,
                to: to,
                subject: '🏥 Appointment Confirmed - Google Meet Link Included',
                html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .info-box h3 { margin: 0 0 10px 0; color: #667eea; font-size: 16px; }
        .info-box p { margin: 5px 0; color: #333; }
        .meet-link { display: inline-block; background: #4285f4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .meet-link:hover { background: #3367d6; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .important { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Appointment Confirmed</h1>
            <p>Your telehealth appointment is scheduled</p>
        </div>
        
        <div class="content">
            <h2>Hello ${patientName},</h2>
            <p>Your appointment with <strong>${doctorName}</strong> has been confirmed.</p>
            
            <div class="info-box">
                <h3>📅 Appointment Details</h3>
                <p><strong>Date:</strong> ${appointmentDate}</p>
                <p><strong>Time:</strong> ${appointmentTime}</p>
                <p><strong>Duration:</strong> ${duration} minutes</p>
                <p><strong>Type:</strong> Telehealth (Google Meet)</p>
            </div>
            
            <div class="important">
                <h3>🎥 Recording Notice</h3>
                <p><strong>This meeting will be automatically recorded</strong> for medical documentation purposes. The recording will be securely stored and used only for:</p>
                <ul>
                    <li>Medical record keeping</li>
                    <li>Quality assurance</li>
                    <li>Generating your consultation notes</li>
                </ul>
                <p>All recordings are encrypted and HIPAA-compliant.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${meetLink}" class="meet-link">🎥 Join Google Meet</a>
            </div>
            
            <div class="info-box">
                <h3>ℹ️ Before Your Appointment</h3>
                <p>• Ensure stable internet connection</p>
                <p>• Test your camera and microphone</p>
                <p>• Prepare any questions or concerns</p>
                <p>• Have your medical history ready if needed</p>
            </div>
            
            <p><strong>Meeting Link:</strong><br>
            <a href="${meetLink}" style="color: #667eea; word-break: break-all;">${meetLink}</a></p>
            
            <p style="margin-top: 30px; color: #666;">If you need to reschedule or cancel, please contact us at least 24 hours in advance.</p>
        </div>
        
        <div class="footer">
            <p>Smart EMR - Your Digital Healthcare Partner</p>
            <p>📧 cs.pasteroom@gmail.com | 📱 +91-9876543210</p>
            <p style="margin-top: 10px;">This is an automated email. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
                `
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Email sending failed:', error.message);
            throw error;
        }
    }

    /**
     * Send email to doctor about new appointment
     */
    async sendDoctorNotification({ to, doctorName, patientName, appointmentDate, appointmentTime, meetLink, reason, duration }) {
        try {
            const mailOptions = {
                from: config.email.from,
                to: to,
                subject: '🩺 New Appointment Scheduled',
                html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .info-box { background: #f8f9fa; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .info-box h3 { margin: 0 0 10px 0; color: #10b981; font-size: 16px; }
        .info-box p { margin: 5px 0; color: #333; }
        .meet-link { display: inline-block; background: #4285f4; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 New Appointment</h1>
            <p>A patient has scheduled an appointment with you</p>
        </div>
        
        <div class="content">
            <h2> ${doctorName},</h2>
            <p>You have a new telehealth appointment scheduled.</p>
            
            <div class="info-box">
                <h3>👤 Patient Information</h3>
                <p><strong>Patient:</strong> ${patientName}</p>
                <p><strong>Reason:</strong> ${reason || 'Not specified'}</p>
            </div>
            
            <div class="info-box">
                <h3>📅 Appointment Details</h3>
                <p><strong>Date:</strong> ${appointmentDate}</p>
                <p><strong>Time:</strong> ${appointmentTime}</p>
                <p><strong>Duration:</strong> ${duration} minutes</p>
                <p><strong>Type:</strong> Telehealth (Google Meet)</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${meetLink}" class="meet-link">🎥 Join Google Meet</a>
            </div>
            
            <p><strong>Meeting Link:</strong><br>
            <a href="${meetLink}" style="color: #10b981; word-break: break-all;">${meetLink}</a></p>
            
            <div style="margin-top: 20px; background: #e7f3ff; padding: 15px; border-radius: 4px; border-left: 4px solid #4285f4;">
                <p style="margin: 0 0 10px 0;"><strong>📹 To Record This Meeting:</strong></p>
                <ol style="margin: 5px 0; padding-left: 20px; color: #333;">
                    <li>Join the Google Meet using the link above</li>
                    <li>Click the <strong>⋮ (3 dots)</strong> menu in the bottom right</li>
                    <li>Click <strong>"Record meeting"</strong></li>
                    <li>Confirm to start recording</li>
                    <li>Click <strong>"Stop recording"</strong> before ending the meeting</li>
                </ol>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                    ⚠️ <strong>Note:</strong> Recording requires a Google Workspace account. Personal Gmail accounts cannot record meetings.
                    After recording, the system will automatically detect and save it to the EMR.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <p>Smart EMR - Your Digital Healthcare Partner</p>
            <p>📧 cs.pasteroom@gmail.com</p>
        </div>
    </div>
</body>
</html>
                `
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Doctor notification sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Doctor email failed:', error.message);
            throw error;
        }
    }

    /**
     * Send recording processing notification
     */
    async sendRecordingProcessedNotification({ to, patientName, appointmentDate, recordingUrl }) {
        try {
            const mailOptions = {
                from: config.email.from,
                to: to,
                subject: '✅ Your Consultation Recording is Ready',
                html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .info-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .download-btn { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Recording Ready</h1>
        </div>
        
        <div class="content">
            <h2>Hello ${patientName},</h2>
            <p>Your consultation recording from ${appointmentDate} has been processed and is now available.</p>
            
            <div class="info-box">
                <h3>🔒 Privacy & Security</h3>
                <p>• Recording is encrypted and HIPAA-compliant</p>
                <p>• Link expires in 24 hours for security</p>
                <p>• Only accessible by authorized medical staff</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${recordingUrl}" class="download-btn">📥 Download Recording</a>
            </div>
            
            <p style="margin-top: 30px; color: #666; font-size: 14px;">
                This recording has been automatically converted to MP3 format and securely stored in our cloud storage.
            </p>
        </div>
        
        <div class="footer">
            <p>Smart EMR - Your Digital Healthcare Partner</p>
            <p>📧 cs.pasteroom@gmail.com</p>
        </div>
    </div>
</body>
</html>
                `
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Recording notification sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Recording email failed:', error.message);
            throw error;
        }
    }
}

module.exports = new EmailService();
