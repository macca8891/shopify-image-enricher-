require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const logger = require('../utils/logger');

// Import routes
const dashboardRoutes = require('./routes/dashboard');
const linkedinRoutes = require('./routes/linkedin');

// LinkedIn OAuth (optional)
let linkedinOAuthRoutes = null;
if (process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET) {
  try {
    const LinkedInOAuthService = require('./services/LinkedInOAuthService');
    const linkedinOAuth = new LinkedInOAuthService(
      process.env.LINKEDIN_CLIENT_ID,
      process.env.LINKEDIN_CLIENT_SECRET,
      process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3002/api/linkedin/callback'
    );
    linkedinOAuthRoutes = linkedinOAuth.createOAuthRoutes();
    logger.info('LinkedIn OAuth routes enabled');
  } catch (error) {
    logger.warn('LinkedIn OAuth not configured:', error.message);
  }
}

// Import models (to ensure schemas are registered)
require('./models/Contact');
require('./models/Conversation');
require('./models/DraftResponse');

const app = express();
const PORT = process.env.BUSINESS_MANAGER_PORT || 3002;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/linkedin', linkedinRoutes);

// LinkedIn OAuth routes (if configured)
if (linkedinOAuthRoutes) {
  app.use('/api/linkedin', linkedinOAuthRoutes);
}

// Main dashboard route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify-image-enricher';
mongoose.connect(mongoUri)
  .then(() => {
    logger.info('Connected to MongoDB for Business Manager');
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Business Manager server running on port ${PORT}`);
      logger.info(`Dashboard available at http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Error handling
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: err.message });
});

module.exports = app;

