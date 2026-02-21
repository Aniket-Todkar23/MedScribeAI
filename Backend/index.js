require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const authRoutes = require('./routes/authRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const documentRoutes = require('./routes/documentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const patientRoutes = require('./routes/patientRoutes');
const aiRoutes = require('./routes/aiRoutes');
const consultationRoutes = require('./routes/consultationRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

/* -- Security & parsing ---------------------------- */
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/* -- Health check ----------------------------------- */
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

/* -- API routes ------------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/consultations', consultationRoutes);

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
