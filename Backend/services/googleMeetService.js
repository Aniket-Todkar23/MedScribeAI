const { google } = require('googleapis');
const config = require('../config/config');

class GoogleMeetService {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            config.google.clientId,
            config.google.clientSecret,
            config.google.redirectUrl
        );
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    }

    /**
     * Get OAuth2 authorization URL
     * @returns {string} Authorization URL
     */
    getAuthUrl() {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: config.google.scopes,
            prompt: 'consent'
        });
    }

    /**
     * Exchange authorization code for tokens
     * @param {string} code - Authorization code from OAuth callback
     * @returns {Promise<Object>} Tokens object
     */
    async getTokensFromCode(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);
            return tokens;
        } catch (error) {
            console.error('Error getting tokens from code:', error.message);
            throw error;
        }
    }

    /**
     * Set OAuth2 credentials
     * @param {Object} tokens - Tokens object with access_token and refresh_token
     */
    setCredentials(tokens) {
        this.oauth2Client.setCredentials(tokens);
    }

    /**
     * Check if the OAuth2 client has valid credentials set
     * @returns {boolean}
     */
    hasValidCredentials() {
        const creds = this.oauth2Client.credentials;
        return !!(creds && (creds.access_token || creds.refresh_token));
    }

    /**
     * Create a Google Calendar event with Google Meet link
     * @param {Object} appointmentData - Appointment details
     * @returns {Promise<Object>} Created event with Meet link
     */
    async createMeetingEvent(appointmentData) {
        try {
            const { patientName, doctorName, appointmentDate, duration, reason, patientEmail, doctorEmail } = appointmentData;

            // Calculate end time
            const startDateTime = new Date(appointmentDate);
            const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

            const event = {
                summary: `Medical Appointment: ${patientName} with Dr. ${doctorName}`,
                description: `Appointment Reason: ${reason || 'General Consultation'}\n\nThis is a telehealth appointment via Google Meet.`,
                start: {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'UTC',
                },
                end: {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'UTC',
                },
                attendees: [
                    { email: patientEmail, displayName: patientName },
                    { email: doctorEmail, displayName: `Dr. ${doctorName}` }
                ],
                conferenceData: {
                    createRequest: {
                        requestId: `appointment-${Date.now()}`,
                        conferenceSolutionKey: {
                            type: 'hangoutsMeet'
                        }
                    }
                },
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email', minutes: 24 * 60 }, // 24 hours before
                        { method: 'popup', minutes: 30 }, // 30 minutes before
                    ],
                },
                guestsCanModify: false,
                guestsCanInviteOthers: false,
                guestsCanSeeOtherGuests: true
            };

            const response = await this.calendar.events.insert({
                calendarId: 'primary',
                resource: event,
                conferenceDataVersion: 1,
                sendUpdates: 'all' // Send email notifications to attendees
            });

            const meetLink = response.data.conferenceData?.entryPoints?.find(
                ep => ep.entryPointType === 'video'
            )?.uri;

            return {
                success: true,
                eventId: response.data.id,
                meetLink: meetLink,
                htmlLink: response.data.htmlLink,
                startTime: response.data.start.dateTime,
                endTime: response.data.end.dateTime
            };
        } catch (error) {
            console.error('Error creating Google Meet event:', error.message);
            throw error;
        }
    }

    /**
     * Update a Google Calendar event
     * @param {string} eventId - Event ID to update
     * @param {Object} updateData - Updated appointment details
     */
    async updateMeetingEvent(eventId, updateData) {
        try {
            const { appointmentDate, duration, reason } = updateData;

            // Get existing event
            const existingEvent = await this.calendar.events.get({
                calendarId: 'primary',
                eventId: eventId
            });

            // Prepare updated fields
            const updatedEvent = { ...existingEvent.data };

            if (appointmentDate) {
                const startDateTime = new Date(appointmentDate);
                const endDateTime = new Date(startDateTime.getTime() + (duration || 30) * 60000);
                
                updatedEvent.start = {
                    dateTime: startDateTime.toISOString(),
                    timeZone: 'UTC'
                };
                updatedEvent.end = {
                    dateTime: endDateTime.toISOString(),
                    timeZone: 'UTC'
                };
            }

            if (reason) {
                updatedEvent.description = `Appointment Reason: ${reason}\n\nThis is a telehealth appointment via Google Meet.`;
            }

            const response = await this.calendar.events.update({
                calendarId: 'primary',
                eventId: eventId,
                resource: updatedEvent,
                sendUpdates: 'all'
            });

            return {
                success: true,
                eventId: response.data.id,
                updated: true
            };
        } catch (error) {
            console.error('Error updating Google Meet event:', error.message);
            throw error;
        }
    }

    /**
     * Cancel a Google Calendar event
     * @param {string} eventId - Event ID to cancel
     */
    async cancelMeetingEvent(eventId) {
        try {
            await this.calendar.events.delete({
                calendarId: 'primary',
                eventId: eventId,
                sendUpdates: 'all'
            });

            return {
                success: true,
                message: 'Meeting cancelled successfully'
            };
        } catch (error) {
            console.error('Error cancelling Google Meet event:', error.message);
            throw error;
        }
    }

    /**
     * Get event details
     * @param {string} eventId - Event ID
     */
    async getEventDetails(eventId) {
        try {
            const response = await this.calendar.events.get({
                calendarId: 'primary',
                eventId: eventId
            });

            const meetLink = response.data.conferenceData?.entryPoints?.find(
                ep => ep.entryPointType === 'video'
            )?.uri;

            return {
                eventId: response.data.id,
                summary: response.data.summary,
                description: response.data.description,
                startTime: response.data.start.dateTime,
                endTime: response.data.end.dateTime,
                meetLink: meetLink,
                status: response.data.status
            };
        } catch (error) {
            console.error('Error getting event details:', error.message);
            throw error;
        }
    }
}

module.exports = new GoogleMeetService();
