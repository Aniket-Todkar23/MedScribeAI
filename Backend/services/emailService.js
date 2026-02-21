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

    /**
     * Send patient-friendly consultation summary email
     */
    async sendPatientSummary({ to, patientName, doctorName, consultationId, summary, date, pdfBuffer }) {
        try {
            const fmtDate = new Date(date || Date.now()).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });

            // Build sections from summary JSON
            const findings = (summary.what_we_found || []).map(f =>
                `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                    <strong style="color:#0B3C3D;">${f.finding || ''}</strong><br>
                    <span style="color:#64748B;font-size:13px;">${f.explanation || ''}</span>
                </div>`
            ).join('');

            const medications = (summary.medications || []).map(m =>
                `<div style="background:#f0f9ff;border-radius:8px;padding:12px 16px;margin:8px 0;">
                    <strong style="color:#0B3C3D;font-size:15px;">${m.name || ''}</strong><br>
                    <span style="color:#475569;font-size:13px;">📝 ${m.how_to_take || ''}</span><br>
                    <span style="color:#64748B;font-size:12px;">💡 ${m.why || ''}</span>
                    ${m.important_notes ? `<br><span style="color:#DC2626;font-size:12px;">⚠️ ${m.important_notes}</span>` : ''}
                </div>`
            ).join('');

            const todos = (summary.things_to_do || []).map((t, i) =>
                `<div style="display:flex;gap:10px;padding:8px 0;">
                    <div style="width:24px;height:24px;border-radius:50%;background:#1F9FA3;color:white;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">${i + 1}</div>
                    <div><strong>${t.action || ''}</strong><br><span style="color:#64748B;font-size:13px;">${t.why || ''}</span></div>
                </div>`
            ).join('');

            const dietHTML = (summary.diet_recommendations || []).map(d =>
                `<div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin:8px 0;">
                    <strong style="color:#166534;">🥗 ${d.food_group || ''}</strong>
                    ${d.eat_more?.length ? `<br><span style="color:#16a34a;font-size:13px;">✅ Eat more: ${d.eat_more.join(', ')}</span>` : ''}
                    ${d.eat_less?.length ? `<br><span style="color:#dc2626;font-size:13px;">❌ Eat less: ${d.eat_less.join(', ')}</span>` : ''}
                    ${d.tip ? `<br><span style="color:#64748B;font-size:12px;">💡 ${d.tip}</span>` : ''}
                </div>`
            ).join('');

            const warnings = (summary.warning_signs || []).map(w =>
                `<p style="margin:4px 0;color:#7F1D1D;font-size:13px;">🚨 ${w}</p>`
            ).join('');

            const mailOptions = {
                from: config.email.from,
                to: to,
                subject: `🏥 Your Health Summary — Consultation with ${doctorName} on ${fmtDate}`,
                html: `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1F9FA3 0%, #0B3C3D 100%); color: white; padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .header p { margin: 6px 0 0; opacity: 0.85; font-size: 14px; }
        .content { padding: 28px 32px; }
        .section { margin: 20px 0; }
        .section h3 { font-size: 16px; font-weight: 700; color: #0B3C3D; margin: 0 0 12px; padding-bottom: 8px; border-bottom: 2px solid #1F9FA3; }
        .footer { background: #f1f5f9; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Your Health Summary</h1>
            <p>Consultation with ${doctorName} on ${fmtDate}</p>
            <p style="font-size:11px;opacity:.6;">Reference: ${consultationId}</p>
        </div>

        <div class="content">
            <p style="font-size:16px;line-height:1.8;">${summary.greeting || `Dear ${patientName},`}</p>
            <p style="font-size:15px;line-height:1.7;color:#334155;">${summary.visit_summary || ''}</p>

            ${summary.your_diagnosis ? `
            <div class="section">
                <h3>🩺 Your Diagnosis</h3>
                <p style="font-size:15px;color:#334155;">${summary.your_diagnosis}</p>
            </div>` : ''}

            ${findings ? `
            <div class="section">
                <h3>🔍 What We Found</h3>
                ${findings}
            </div>` : ''}

            ${medications ? `
            <div class="section">
                <h3>💊 Your Medications</h3>
                ${medications}
            </div>` : ''}

            ${todos ? `
            <div class="section">
                <h3>✅ Things To Do</h3>
                ${todos}
            </div>` : ''}

            ${dietHTML ? `
            <div class="section">
                <h3>🥗 Diet Recommendations</h3>
                ${dietHTML}
            </div>` : ''}

            ${(summary.lifestyle_changes || []).length ? `
            <div class="section">
                <h3>🏃 Lifestyle Tips</h3>
                <ul style="padding-left:18px;">
                    ${summary.lifestyle_changes.map(l => `<li style="padding:3px 0;color:#475569;">${l}</li>`).join('')}
                </ul>
            </div>` : ''}

            ${warnings ? `
            <div class="section" style="background:#fef2f2;border-radius:12px;padding:16px 20px;">
                <h3 style="border-bottom-color:#ef4444;">⚠️ Warning Signs</h3>
                ${warnings}
            </div>` : ''}

            ${summary.recovery_timeline ? `
            <div class="section">
                <h3>📅 Recovery Timeline</h3>
                <p style="color:#334155;">${summary.recovery_timeline}</p>
            </div>` : ''}

            ${summary.next_appointment ? `
            <div class="section">
                <h3>📆 Next Appointment</h3>
                <p style="color:#334155;">${summary.next_appointment}</p>
            </div>` : ''}

            ${summary.encouraging_note ? `
            <div style="background:linear-gradient(135deg,rgba(31,159,163,0.08),rgba(31,159,163,0.02));border-radius:12px;padding:20px;text-align:center;margin:20px 0;">
                <p style="font-size:16px;color:#0B3C3D;font-weight:600;margin:0;">${summary.encouraging_note}</p>
            </div>` : ''}
        </div>

        <div class="footer">
            <p>Diagnostic-IQ Smart EMR — Your Digital Healthcare Partner</p>
            <p>This summary is for informational purposes. Always follow your doctor's advice.</p>
            <p>Questions? Contact your doctor's office directly.</p>
        </div>
    </div>
</body>
</html>`,
                attachments: pdfBuffer ? [{
                    filename: `health-summary-${consultationId.slice(0, 8)}.html`,
                    content: pdfBuffer,
                    contentType: 'text/html',
                }] : [],
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Patient summary email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Patient summary email failed:', error.message);
            throw error;
        }
    }
}

module.exports = new EmailService();
