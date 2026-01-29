const express = require('express');
const router = express.Router();
const LinkedInService = require('../services/LinkedInService');
const logger = require('../../utils/logger');

/**
 * GET /api/linkedin/status
 * Check LinkedIn connection status
 */
router.get('/status', async (req, res) => {
  try {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    
    if (!token) {
      return res.json({
        connected: false,
        message: 'LinkedIn access token not configured',
        setupRequired: true
      });
    }

    // Test connection by getting profile
    const linkedin = new LinkedInService(token);
    const profile = await linkedin.getProfile();
    
    // Try to get conversations (may fail if r_messages not approved)
    let conversationsCount = 0;
    let messagingAvailable = false;
    try {
      const conversations = await linkedin.getConversations(1);
      conversationsCount = conversations.length;
      messagingAvailable = true;
    } catch (error) {
      if (error.response?.status === 403) {
        messagingAvailable = false;
      } else {
        throw error;
      }
    }

    res.json({
      connected: true,
      profile: {
        id: profile.id,
        firstName: profile.localizedFirstName,
        lastName: profile.localizedLastName
      },
      messagingAvailable,
      conversationsCount,
      message: messagingAvailable 
        ? 'LinkedIn connected and messaging API available' 
        : 'LinkedIn connected but messaging API requires approval'
    });
  } catch (error) {
    logger.error('Error checking LinkedIn status:', error);
    res.json({
      connected: false,
      error: error.message,
      message: 'LinkedIn connection failed. Check your access token.'
    });
  }
});

/**
 * GET /api/linkedin/test
 * Test LinkedIn API endpoints
 */
router.get('/test', async (req, res) => {
  try {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    
    if (!token) {
      return res.status(400).json({
        error: 'LinkedIn access token not configured'
      });
    }

    const linkedin = new LinkedInService(token);
    const results = {
      profile: null,
      conversations: null,
      messages: null,
      errors: []
    };

    // Test profile
    try {
      results.profile = await linkedin.getProfile();
    } catch (error) {
      results.errors.push({ endpoint: 'profile', error: error.message });
    }

    // Test conversations
    try {
      const conversations = await linkedin.getConversations(5);
      results.conversations = {
        count: conversations.length,
        sample: conversations.slice(0, 2)
      };
    } catch (error) {
      results.errors.push({ 
        endpoint: 'conversations', 
        error: error.message,
        status: error.response?.status,
        note: error.response?.status === 403 ? 'r_messages permission may require approval' : ''
      });
    }

    res.json(results);
  } catch (error) {
    logger.error('Error testing LinkedIn:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


