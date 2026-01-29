const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * BuckyDrop Shipping Rate Service
 * 
 * This service acts as a proxy for Google Apps Script to call BuckyDrop API.
 * Since Google Apps Script uses dynamic IPs, this service runs on a fixed IP
 * that can be whitelisted with BuckyDrop.
 */

class BuckyDropService {
  constructor(config) {
    // Store original appCode (without =) for signature calculation
    this.appCodeOriginal = config.APPCODE || '';
    // Append '=' to appCode for query parameter (as developer requested)
    this.appCode = this.appCodeOriginal.endsWith('=') ? this.appCodeOriginal : this.appCodeOriginal + '=';
    this.appSecret = config.APPSECRET;
    this.domain = config.DOMAIN;
    this.apiPath = config.API_PATH;
  }

  /**
   * Generates MD5 signature for BuckyDrop API (matching Google Apps Script)
   * Signature string: APP_CODE (original, without =) + jsonParams + timestamp + APP_SECRET
   */
  generateMD5Signature(jsonParams, timestamp) {
    // Use original appCode (without =) for signature calculation (matching Google Apps Script)
    const stringToSign = 
      this.appCodeOriginal +  // Use original appCode without = for signature
      jsonParams + 
      timestamp + 
      this.appSecret;

    const hash = crypto
      .createHash('md5')
      .update(stringToSign)
      .digest('hex');

    return hash;
  }

  /**
   * Fetches shipping rates from BuckyDrop API
   * Matches the exact implementation from Google Apps Script
   * 
   * @param {Object} requestBody - The request body containing destination and productList
   * @returns {Promise<Object>} - The API response
   */
  async fetchShippingRates(requestBody) {
    const timestamp = Date.now().toString();
    
    // Wrap request body exactly like Google Apps Script: { size: 50, current: 1, item: requestBody }
    // Try without appCode in body first (matching Google Apps Script)
    const wrapper = {
      size: 50,
      current: 1,
      item: requestBody
    };
    
    // Stringify the wrapper (NOT canonical sorting - use standard JSON.stringify)
    const jsonParams = JSON.stringify(wrapper);
    
    // Generate MD5 signature (matching Google Apps Script)
    // Signature string: APP_CODE + jsonParams + timestamp + APP_SECRET
    const sign = this.generateMD5Signature(jsonParams, timestamp);

    // Construct the final API URL (matching Google Apps Script exactly)
    // Query parameter: appCode (lowercase), signature parameter: sign (not signature)
    // Use original appCode (without =) in query string to match credentials
    const finalUrl = `${this.domain}/${this.apiPath}?appCode=${this.appCodeOriginal}&timestamp=${timestamp}&sign=${sign}`;

    // Prepare request options (matching Google Apps Script)
    const options = {
      method: 'POST',
      url: finalUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      data: jsonParams, // Send as JSON string (NOT including appCode in body)
      timeout: 30000 // 30 second timeout
    };

    // EXTENSIVE DEBUG LOGGING
    logger.info(`═══════════════════════════════════════════════════════════`);
    logger.info(`🔍 BUCKYDROP API REQUEST DEBUG`);
    logger.info(`═══════════════════════════════════════════════════════════`);
    logger.info(`📋 Configuration:`);
    logger.info(`   appCode (original, for signature): ${this.appCodeOriginal}`);
    logger.info(`   appCode (with =, for query): ${this.appCode}`);
    logger.info(`   appSecret: ${this.appSecret.substring(0, 10)}...${this.appSecret.substring(this.appSecret.length - 4)}`);
    logger.info(`   domain: ${this.domain}`);
    logger.info(`   apiPath: ${this.apiPath}`);
    logger.info(`📦 Request Body (wrapped):`);
    logger.info(`   ${JSON.stringify(wrapper, null, 2)}`);
    logger.info(`📝 JSON String (for signature):`);
    logger.info(`   ${jsonParams}`);
    logger.info(`   (Note: appCode is NOT in body, only in query string)`);
    logger.info(`🔐 Signature Calculation:`);
    logger.info(`   String to sign: ${this.appCodeOriginal} + ${jsonParams.substring(0, 100)}... + ${timestamp} + ${this.appSecret.substring(0, 10)}...`);
    logger.info(`   (Using original appCode without = for signature)`);
    logger.info(`   Timestamp: ${timestamp}`);
    logger.info(`   MD5 Signature: ${sign}`);
    logger.info(`🌐 Full Request URL:`);
    logger.info(`   ${finalUrl}`);
    logger.info(`📤 Request Headers:`);
    logger.info(`   Content-Type: application/json`);
    logger.info(`═══════════════════════════════════════════════════════════`);

    try {
      logger.info(`🚀 Sending request to BuckyDrop API...`);
      const response = await axios(options);
      
      logger.info(`✅ Response received: HTTP ${response.status}`);
      logger.info(`📥 Response data: ${JSON.stringify(response.data, null, 2)}`);
      
      if (response.status !== 200) {
        throw new Error(`HTTP Code ${response.status}: ${response.data?.info || 'Server Error'}`);
      }

      const jsonResponse = response.data;

      if (!jsonResponse.success) {
        logger.error(`❌ API returned success=false:`);
        logger.error(`   Code: ${jsonResponse.code}`);
        logger.error(`   Info: ${jsonResponse.info}`);
        logger.error(`   Full response: ${JSON.stringify(jsonResponse, null, 2)}`);
        throw new Error(`BuckyDrop Error: ${jsonResponse.info} (Code: ${jsonResponse.code})`);
      }

      logger.info(`✅ API call successful! Records: ${jsonResponse.data?.records?.length || 0}`);
      return jsonResponse;
    } catch (error) {
      logger.error(`═══════════════════════════════════════════════════════════`);
      logger.error(`❌ BUCKYDROP API ERROR`);
      logger.error(`═══════════════════════════════════════════════════════════`);
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.error(`HTTP Status: ${error.response.status}`);
        logger.error(`Response Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
        logger.error(`Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
        logger.error(`Request URL: ${finalUrl}`);
        logger.error(`Request Body: ${jsonParams}`);
        logger.error(`Request Headers: ${JSON.stringify(options.headers, null, 2)}`);
        logger.error(`═══════════════════════════════════════════════════════════`);
        throw new Error(`API Error ${error.response.status}: ${error.response.data?.info || error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        // The request was made but no response was received
        logger.error(`No response received from server`);
        logger.error(`Request URL: ${finalUrl}`);
        logger.error(`Request Body: ${jsonParams}`);
        logger.error(`Error: ${error.message}`);
        logger.error(`═══════════════════════════════════════════════════════════`);
        throw new Error('Network error: No response from BuckyDrop API');
      } else {
        // Something happened in setting up the request that triggered an Error
        logger.error(`Request setup error: ${error.message}`);
        logger.error(`Stack: ${error.stack}`);
        logger.error(`═══════════════════════════════════════════════════════════`);
        throw new Error(`Request error: ${error.message}`);
      }
    }
  }

  /**
   * Formats shipping rates response for Google Sheets
   */
  formatRatesForSheets(apiResponse) {
    if (!apiResponse.data || !apiResponse.data.records || apiResponse.data.records.length === 0) {
      return `No rates found. Info: ${apiResponse.info || 'Check product dimensions/category code.'}`;
    }

    const ratesSummary = apiResponse.data.records.map(record => {
      const priceRMB = record.totalPrice ? record.totalPrice.toFixed(2) : 'N/A';
      const minTime = record.minTimeInTransit || 'N/A';
      const maxTime = record.maxTimeInTransit || 'N/A';
      return `${record.serviceName} (${minTime}-${maxTime} days): ¥${priceRMB}`;
    }).join(' | ');

    return ratesSummary;
  }
}

module.exports = BuckyDropService;

