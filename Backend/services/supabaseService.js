const { createClient } = require('@supabase/supabase-js');
const config = require('../config/config');

class SupabaseService {
    constructor() {
        this.supabase = createClient(
            config.supabase.url,
            config.supabase.serviceRoleKey
        );
    }

    // =============================================
    // APPOINTMENT OPERATIONS
    // =============================================

    /**
     * Create a new appointment
     * @param {Object} appointmentData - Appointment details
     * @returns {Promise<Object>} Created appointment
     */
    async createAppointment(appointmentData) {
        try {
            const { data, error } = await this.supabase
                .from('appointments')
                .insert([appointmentData])
                .select()
                .single();

            if (error) throw error;

            // Log audit trail
            await this.createAuditLog({
                actor_id: appointmentData.doctor_id,
                actor_type: 'doctor',
                action: 'appointment_created',
                entity_type: 'appointment',
                entity_id: data.appointment_id,
                new_value: data
            });

            return data;
        } catch (error) {
            console.error('Error creating appointment:', error.message);
            throw error;
        }
    }

    /**
     * Get appointment by ID
     * @param {string} appointmentId - Appointment UUID
     */
    async getAppointmentById(appointmentId) {
        try {
            const { data, error } = await this.supabase
                .from('appointments')
                .select(`
                    *,
                    doctor:doctors(*),
                    patient:patients(*)
                `)
                .eq('appointment_id', appointmentId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting appointment:', error.message);
            throw error;
        }
    }

    /**
     * Get appointments by doctor ID
     * @param {string} doctorId - Doctor UUID
     * @param {Object} filters - Optional filters (status, date range)
     */
    async getAppointmentsByDoctor(doctorId, filters = {}) {
        try {
            let query = this.supabase
                .from('appointments')
                .select(`
                    *,
                    patient:patients(full_name, email, phone, patient_id)
                `)
                .eq('doctor_id', doctorId)
                .order('appointment_date', { ascending: true });

            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            if (filters.startDate) {
                query = query.gte('appointment_date', filters.startDate);
            }

            if (filters.endDate) {
                query = query.lte('appointment_date', filters.endDate);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting doctor appointments:', error.message);
            throw error;
        }
    }

    /**
     * Get appointments by patient ID
     * @param {string} patientId - Patient UUID
     */
    async getAppointmentsByPatient(patientId, filters = {}) {
        try {
            let query = this.supabase
                .from('appointments')
                .select(`
                    *,
                    doctor:doctors(full_name, specialization, email, phone, doctor_id)
                `)
                .eq('patient_id', patientId)
                .order('appointment_date', { ascending: true });

            if (filters.status) {
                query = query.eq('status', filters.status);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting patient appointments:', error.message);
            throw error;
        }
    }

    /**
     * Update appointment
     * @param {string} appointmentId - Appointment UUID
     * @param {Object} updateData - Fields to update
     */
    async updateAppointment(appointmentId, updateData) {
        try {
            // Get old value for audit
            const oldData = await this.getAppointmentById(appointmentId);

            const { data, error } = await this.supabase
                .from('appointments')
                .update(updateData)
                .eq('appointment_id', appointmentId)
                .select()
                .single();

            if (error) throw error;

            // Log audit trail
            await this.createAuditLog({
                actor_id: updateData.doctor_id || oldData.doctor_id,
                actor_type: 'doctor',
                action: 'appointment_updated',
                entity_type: 'appointment',
                entity_id: appointmentId,
                old_value: oldData,
                new_value: data
            });

            return data;
        } catch (error) {
            console.error('Error updating appointment:', error.message);
            throw error;
        }
    }

    /**
     * Cancel appointment
     * @param {string} appointmentId - Appointment UUID
     * @param {string} cancelledReason - Reason for cancellation
     */
    async cancelAppointment(appointmentId, cancelledReason) {
        try {
            const { data, error } = await this.supabase
                .from('appointments')
                .update({
                    status: 'cancelled',
                    cancelled_reason: cancelledReason
                })
                .eq('appointment_id', appointmentId)
                .select()
                .single();

            if (error) throw error;

            // Log audit trail
            await this.createAuditLog({
                actor_id: data.doctor_id,
                actor_type: 'doctor',
                action: 'appointment_cancelled',
                entity_type: 'appointment',
                entity_id: appointmentId,
                change_summary: `Cancelled: ${cancelledReason}`
            });

            return data;
        } catch (error) {
            console.error('Error cancelling appointment:', error.message);
            throw error;
        }
    }

    // =============================================
    // CONSULTATION OPERATIONS
    // =============================================

    /**
     * Create consultation from appointment
     * @param {Object} consultationData - Consultation details
     */
    async createConsultation(consultationData) {
        try {
            const { data, error } = await this.supabase
                .from('consultations')
                .insert([consultationData])
                .select()
                .single();

            if (error) throw error;

            // Update appointment with consultation_id
            if (consultationData.appointment_id) {
                await this.updateAppointment(consultationData.appointment_id, {
                    consultation_id: data.consultation_id,
                    status: 'completed'
                });
            }

            return data;
        } catch (error) {
            console.error('Error creating consultation:', error.message);
            throw error;
        }
    }

    /**
     * Update consultation transcription
     * @param {string} consultationId - Consultation UUID
     * @param {string} transcription - Meeting transcription
     */
    async updateConsultationTranscription(consultationId, transcription) {
        try {
            const { data, error } = await this.supabase
                .from('consultations')
                .update({ transcription })
                .eq('consultation_id', consultationId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating transcription:', error.message);
            throw error;
        }
    }

    // =============================================
    // DOCUMENT OPERATIONS
    // =============================================

    /**
     * Create document record (for recordings)
     * @param {Object} documentData - Document details
     */
    async createDocument(documentData) {
        try {
            const { data, error } = await this.supabase
                .from('documents')
                .insert([documentData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating document:', error.message);
            throw error;
        }
    }

    // =============================================
    // PATIENT & DOCTOR OPERATIONS
    // =============================================

    /**
     * Get doctor by ID
     */
    async getDoctorById(doctorId) {
        try {
            const { data, error } = await this.supabase
                .from('doctors')
                .select('*')
                .eq('doctor_id', doctorId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting doctor:', error.message);
            throw error;
        }
    }

    /**
     * Get patient by ID
     */
    async getPatientById(patientId) {
        try {
            const { data, error } = await this.supabase
                .from('patients')
                .select('*')
                .eq('patient_id', patientId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting patient:', error.message);
            throw error;
        }
    }

    /**
     * Get all doctors
     */
    async getAllDoctors(filters = {}) {
        try {
            let query = this.supabase
                .from('doctors')
                .select('*')
                .order('full_name');

            if (filters.specialization) {
                query = query.eq('specialization', filters.specialization);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error getting doctors:', error.message);
            throw error;
        }
    }

    // =============================================
    // NOTIFICATION OPERATIONS
    // =============================================

    /**
     * Create notification log
     */
    async createNotificationLog(notificationData) {
        try {
            const { data, error } = await this.supabase
                .from('notification_log')
                .insert([notificationData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating notification log:', error.message);
            throw error;
        }
    }

    // =============================================
    // AUDIT LOG OPERATIONS
    // =============================================

    /**
     * Create audit log entry
     */
    async createAuditLog(auditData) {
        try {
            const { data, error } = await this.supabase
                .from('audit_log')
                .insert([{
                    ...auditData,
                    data_sensitivity: 'high',
                    is_phi_accessed: true
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating audit log:', error.message);
            // Don't throw - audit log failures shouldn't break main flow
        }
    }
}

module.exports = new SupabaseService();
