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
