const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const monitorRoutes = require('./routes/monitor.routes');
const incidentRoutes = require('./routes/incident.routes');
const healthRoutes = require('./routes/health.routes');
const alertRoutes = require('./routes/alert.routes');
const mockRoutes = require('./routes/mock.routes');

const app = express();

// Security and utility middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // allow loading local scripts, styles, and icons
  })
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static frontend serving
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/health-checks', healthRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/mock', mockRoutes);

// Health probe for Docker and orchestrators
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend for root
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.path}`,
    });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('[Sentinel Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;
