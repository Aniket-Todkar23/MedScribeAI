<<<<<<< Updated upstream
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

/* -- Security & parsing ---------------------------- */
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/* -- Health check ----------------------------------- */
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

/* -- API routes ------------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);

/* -- 404 handler ------------------------------------ */
app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));

/* -- Global error handler --------------------------- */
app.use((err, _req, res, _next) => {
  console.error('[server]', err);
  res.status(500).json({ message: 'Internal server error.' });
});

/* -- Start ------------------------------------------ */
app.listen(PORT, () => {
  console.log(`\n🚀  API running on http://localhost:${PORT}`);
  console.log(`    Health → http://localhost:${PORT}/health\n`);
});
=======
const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const appointmentRoutes = require('./routes/appointmentRoutes');
const appointmentController = require('./controllers/appointmentController');
const { errorHandler, notFoundHandler } = require('./utils/errorHandler');
const azureBlobService = require('./services/azureBlobService');

// Initialize Express app
const app = express();

// =============================================
// MIDDLEWARE
// =============================================

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// =============================================
// ROUTES
// =============================================

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Smart EMR Appointment API is running',
        timestamp: new Date().toISOString(),
        environment: config.server.env
    });
});

// API routes
app.use('/api/appointments', appointmentRoutes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to Smart EMR Appointment Scheduling API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            appointments: '/api/appointments',
            documentation: 'See README.md for full API documentation'
        }
    });
});

// Google OAuth callback (root-level route to match Google Cloud Console config)
app.get('/oauth2callback', appointmentController.googleOAuthCallback);

// =============================================
// ERROR HANDLING
// =============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// =============================================
// SERVER INITIALIZATION
// =============================================

const PORT = config.server.port;

const startServer = async () => {
    try {
        // Initialize Azure Blob Storage container
        console.log('Initializing Azure Blob Storage...');
        await azureBlobService.initializeContainer();
        console.log('✓ Azure Blob Storage initialized');

        // Start server
        app.listen(PORT, () => {
            console.log('═══════════════════════════════════════════════════');
            console.log('  Smart EMR Appointment Scheduling API');
            console.log('═══════════════════════════════════════════════════');
            console.log(`  Environment: ${config.server.env}`);
            console.log(`  Server running on: http://localhost:${PORT}`);
            console.log(`  Health check: http://localhost:${PORT}/health`);
            console.log('═══════════════════════════════════════════════════');
            console.log('\n📋 Features Enabled:');
            console.log('  ✓ Patient appointment booking');
            console.log('  ✓ Google Meet integration');
            console.log('  ✓ Meeting recording upload');
            console.log('  ✓ Auto MP3 conversion');
            console.log('  ✓ Azure Blob Storage with SAS URLs');
            console.log('  ✓ Supabase database integration');
            console.log('\n⚠️  Remember to:');
            console.log('  1. Set up your .env file with credentials');
            console.log('  2. Configure Google OAuth for Meet integration');
            console.log('  3. Set up Supabase database tables');
            console.log('═══════════════════════════════════════════════════\n');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
    process.exit(1);
});

// Start the server
startServer();

module.exports = app;
>>>>>>> Stashed changes
