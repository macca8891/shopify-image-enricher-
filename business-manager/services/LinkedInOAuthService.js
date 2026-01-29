const axios = require('axios');
const express = require('express');
const logger = require('../../utils/logger');

/**
 * LinkedIn OAuth Service
 * LinkedIn Messaging API requires OAuth 2.0 flow
 * This service handles the OAuth flow to get user access tokens
 */
class LinkedInOAuthService {
  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
    this.baseURL = 'https://www.linkedin.com/oauth/v2';
    this.apiURL = 'https://api.linkedin.com/v2';
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(state = 'default') {
    const scopes = [
      'r_liteprofile',      // Basic profile info
      'r_emailaddress',      // Email address
      'w_member_social',     // Post updates (optional)
      'r_messages'           // Messaging API (requires approval)
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state,
      scope: scopes
    });

    return `${this.baseURL}/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async getAccessToken(code) {
    try {
      const response = await axios.post(`${this.baseURL}/accessToken`, null, {
        params: {
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri,
          client_id: this.clientId,
          client_secret: this.clientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
        refreshToken: response.data.refresh_token
      };
    } catch (error) {
      logger.error('Error getting LinkedIn access token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(`${this.baseURL}/accessToken`, null, {
        params: {
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return {
        accessToken: response.data.access_token,
        expiresIn: response.data.expires_in,
        refreshToken: response.data.refresh_token || refreshToken
      };
    } catch (error) {
      logger.error('Error refreshing LinkedIn token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create Express routes for OAuth flow
   */
  createOAuthRoutes() {
    const router = express.Router();

    // Step 1: Redirect to LinkedIn authorization
    router.get('/auth', (req, res) => {
      const authUrl = this.getAuthUrl();
      res.redirect(authUrl);
    });

    // Step 2: Handle callback from LinkedIn
    router.get('/callback', async (req, res) => {
      const { code, error } = req.query;

      if (error) {
        return res.status(400).json({
          error: 'LinkedIn authorization failed',
          details: error
        });
      }

      if (!code) {
        return res.status(400).json({
          error: 'No authorization code received'
        });
      }

      try {
        const tokens = await this.getAccessToken(code);
        
        // Return HTML page with tokens for user to copy
        const expiresInDays = Math.floor(tokens.expiresIn / 86400);
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>LinkedIn Authorization Success</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f7fa;
              }
              .success-box {
                background: white;
                border-radius: 8px;
                padding: 30px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 { color: #0077b5; margin-top: 0; }
              .token-box {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
                font-family: monospace;
                word-break: break-all;
              }
              .copy-btn {
                background: #0077b5;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                margin-top: 10px;
              }
              .copy-btn:hover { background: #005885; }
              .instructions {
                background: #e7f3ff;
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
              }
              .warning {
                background: #fff3cd;
                padding: 15px;
                border-radius: 6px;
                margin: 20px 0;
                border-left: 4px solid #ffc107;
              }
            </style>
          </head>
          <body>
            <div class="success-box">
              <h1>✅ LinkedIn Authorization Successful!</h1>
              
              <p>Add these to your <code>.env</code> file:</p>
              
              <div class="token-box">
                <strong>LINKEDIN_ACCESS_TOKEN</strong><br>
                <span id="accessToken">${tokens.accessToken}</span>
                <button class="copy-btn" onclick="copyToken('accessToken')">Copy</button>
              </div>
              
              ${tokens.refreshToken ? `
              <div class="token-box">
                <strong>LINKEDIN_REFRESH_TOKEN</strong><br>
                <span id="refreshToken">${tokens.refreshToken}</span>
                <button class="copy-btn" onclick="copyToken('refreshToken')">Copy</button>
              </div>
              ` : ''}
              
              <div class="instructions">
                <strong>Next Steps:</strong>
                <ol>
                  <li>Copy the tokens above</li>
                  <li>Add them to your <code>.env</code> file</li>
                  <li>Restart the Business Manager server</li>
                  <li>Visit the dashboard to test LinkedIn connection</li>
                </ol>
              </div>
              
              <div class="warning">
                <strong>⚠️ Note:</strong> Access token expires in ${expiresInDays} days (${tokens.expiresIn} seconds).
                ${tokens.refreshToken ? 'Use the refresh token to get a new access token when it expires.' : 'You may need to re-authorize when it expires.'}
              </div>
              
              <p><a href="/">← Back to Dashboard</a></p>
            </div>
            
            <script>
              function copyToken(id) {
                const text = document.getElementById(id).textContent;
                navigator.clipboard.writeText(text).then(() => {
                  alert('Copied to clipboard!');
                });
              }
            </script>
          </body>
          </html>
        `);
      } catch (error) {
        logger.error('OAuth callback error:', error);
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>LinkedIn Authorization Failed</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f7fa;
              }
              .error-box {
                background: white;
                border-radius: 8px;
                padding: 30px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                border-left: 4px solid #dc3545;
              }
              h1 { color: #dc3545; margin-top: 0; }
            </style>
          </head>
          <body>
            <div class="error-box">
              <h1>❌ LinkedIn Authorization Failed</h1>
              <p><strong>Error:</strong> ${error.message}</p>
              <p>Please check:</p>
              <ul>
                <li>LinkedIn app credentials are correct</li>
                <li>Redirect URI matches your app settings</li>
                <li>Required permissions are requested</li>
              </ul>
              <p><a href="/">← Back to Dashboard</a></p>
            </div>
          </body>
          </html>
        `);
      }
    });

    return router;
  }
}

module.exports = LinkedInOAuthService;

