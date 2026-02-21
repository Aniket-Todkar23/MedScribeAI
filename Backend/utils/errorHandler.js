/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Multer file upload errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            message: 'File size too large. Maximum allowed size is 500MB'
        });
    }

    if (err.message.includes('Invalid file type')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    // Database errors
    if (err.code === '23505') { // Unique constraint violation
        return res.status(409).json({
            success: false,
            message: 'Duplicate entry. Record already exists'
        });
    }

    if (err.code === '23503') { // Foreign key violation
        return res.status(400).json({
            success: false,
            message: 'Invalid reference. Related record not found'
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
};

module.exports = {
    errorHandler,
    notFoundHandler
};
