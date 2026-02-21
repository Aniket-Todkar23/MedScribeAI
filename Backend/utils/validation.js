const Joi = require('joi');

/**
 * Validate appointment request creation
 */
const validateAppointmentRequest = (req, res, next) => {
    const schema = Joi.object({
        doctor_id: Joi.string().uuid().required(),
        patient_id: Joi.string().uuid().required(),
        appointment_date: Joi.date().iso().required().min('now'),
        duration_minutes: Joi.number().integer().min(15).max(180).default(30),
        appointment_type: Joi.string().valid('in_person', 'telehealth', 'follow_up', 'emergency', 'routine_checkup').default('in_person'),
        reason: Joi.string().max(500),
        notes: Joi.string().max(1000)
    });

    const { error, value } = schema.validate(req.body);

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message)
        });
    }

    req.body = value;
    next();
};

/**
 * Validate cancel appointment request
 */
const validateCancelAppointment = (req, res, next) => {
    const schema = Joi.object({
        cancelled_reason: Joi.string().required().min(10).max(500)
    });

    const { error, value } = schema.validate(req.body);

    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message)
        });
    }

    req.body = value;
    next();
};

/**
 * Validate UUID parameter
 */
const validateUuidParam = (paramName) => {
    return (req, res, next) => {
        const schema = Joi.string().uuid().required();
        const { error } = schema.validate(req.params[paramName]);

        if (error) {
            return res.status(400).json({
                success: false,
                message: `Invalid ${paramName} format`
            });
        }

        next();
    };
};

module.exports = {
    validateAppointmentRequest,
    validateCancelAppointment,
    validateUuidParam
};
