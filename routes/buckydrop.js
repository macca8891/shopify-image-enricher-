const express = require('express');
const router = express.Router();
const BuckyDropService = require('../services/BuckyDropService');
const logger = require('../utils/logger');

// BuckyDrop Configuration
const BUCKY_DROP_CONFIG = {
  APPCODE: process.env.BUCKY_DROP_APPCODE || "ae75dfea63cc39f6efe052af4a8b9dea",
  APPSECRET: process.env.BUCKY_DROP_APPSECRET || "8d8e3c046d6bf420b5999899786d8481",
  DOMAIN: "https://bdopenapi.buckydrop.com",
  API_PATH: "api/rest/v2/adapt/adaptation/logistics/channel-carriage-list",
};

// Initialize service
const buckyDropService = new BuckyDropService(BUCKY_DROP_CONFIG);

/**
 * POST /api/buckydrop/shipping-rates
 * 
 * Proxy endpoint for Google Apps Script to get shipping rates from BuckyDrop.
 * This endpoint runs on a fixed IP that can be whitelisted with BuckyDrop.
 * 
 * Request body:
 * {
 *   destination: { ... },
 *   productList: [ ... ]
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   rates: "formatted string for Google Sheets",
 *   rawData: { ... } // Full API response
 * }
 */
router.post('/shipping-rates', async (req, res) => {
  try {
    const { destination, productList } = req.body;

    // Validate request
    if (!destination) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: destination'
      });
    }

    if (!productList || !Array.isArray(productList) || productList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing or invalid field: productList (must be a non-empty array)'
      });
    }

    // Prepare request body for BuckyDrop API
    const requestBody = {
      ...destination,
      productList: productList,
      size: 10,
      current: 1,
      orderBy: "price",
      orderType: "asc",
    };

    // Call BuckyDrop API
    const apiResponse = await buckyDropService.fetchShippingRates(requestBody);

    // Format response for Google Sheets
    const ratesSummary = buckyDropService.formatRatesForSheets(apiResponse);

    // Return formatted response
    res.json({
      success: true,
      rates: ratesSummary,
      rawData: apiResponse // Include full response for debugging
    });

  } catch (error) {
    logger.error('BuckyDrop proxy error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/buckydrop/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'BuckyDrop Proxy',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/buckydrop/ip
 * Returns the current server's IP address (useful for whitelisting)
 */
router.get('/ip', async (req, res) => {
  try {
    // Get client IP (the IP that made the request)
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || req.headers['x-real-ip'];
    
    // Try to get the server's public IP
    const axios = require('axios');
    let publicIp = 'Unknown';
    try {
      const ipResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
      publicIp = ipResponse.data.ip;
    } catch (e) {
      logger.warn('Could not fetch public IP:', e.message);
    }

    res.json({
      clientIp: clientIp,
      publicIp: publicIp,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip']
      },
      note: 'Add the publicIp to your BuckyDrop IP whitelist'
    });
  } catch (error) {
    logger.error('IP check error:', error);
    res.status(500).json({
      error: 'Could not determine IP address'
    });
  }
});

module.exports = router;


