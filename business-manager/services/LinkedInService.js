const axios = require('axios');
const logger = require('../../utils/logger');

class LinkedInService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.linkedin.com/v2';
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get user's profile
   */
  async getProfile() {
    try {
      const response = await this.api.get('/me', {
        params: {
          projection: '(id,localizedFirstName,localizedLastName)'
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching LinkedIn profile:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get recent messages/conversations
   * Note: LinkedIn Messaging API requires r_messages permission and app approval
   * 
   * LinkedIn API v2 Messaging endpoints:
   * - Requires OAuth 2.0 with r_messages scope
   * - May require LinkedIn Partner Program approval
   * - Alternative: Use LinkedIn's REST API endpoints
   */
  async getConversations(limit = 50) {
    try {
      // Try LinkedIn Messaging API v2 first
      const response = await this.api.get('/messaging/conversations', {
        params: {
          q: 'viewer',
          count: limit
        }
      });
      return response.data.elements || [];
    } catch (error) {
      // If v2 API fails, try alternative endpoints
      if (error.response?.status === 403) {
        logger.warn('LinkedIn Messaging API access denied. r_messages permission may require approval.');
        logger.warn('See: https://www.linkedin.com/developers/apps for app review process');
      } else if (error.response?.status === 404) {
        logger.warn('LinkedIn Messaging API endpoint not found. API may have changed.');
      } else {
        logger.error('Error fetching LinkedIn conversations:', error.response?.data || error.message);
      }
      
      // Return empty array so system can still work with HubSpot only
      return [];
    }
  }

  /**
   * Get messages for a specific conversation
   * Note: Requires r_messages permission
   */
  async getConversationMessages(conversationId) {
    try {
      // Try v2 API endpoint
      const response = await this.api.get(`/messaging/conversations/${conversationId}/events`, {
        params: {
          count: 100
        }
      });
      return response.data.elements || [];
    } catch (error) {
      if (error.response?.status === 403) {
        logger.warn(`LinkedIn messaging access denied for conversation ${conversationId}`);
      } else {
        logger.error('Error fetching LinkedIn conversation messages:', error.response?.data || error.message);
      }
      return [];
    }
  }

  /**
   * Get connection requests
   */
  async getConnectionRequests() {
    try {
      const response = await this.api.get('/relationshipStatuses', {
        params: {
          q: 'viewer',
          edgeType: 'CompanyFollowedByMember'
        }
      });
      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn connection requests:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get recent activity/notifications
   */
  async getRecentActivity() {
    try {
      // LinkedIn Activity API
      const response = await this.api.get('/ugcPosts', {
        params: {
          q: 'authors',
          authors: 'List(urn:li:person:YOUR_ID)',
          count: 25
        }
      });
      return response.data.elements || [];
    } catch (error) {
      logger.error('Error fetching LinkedIn activity:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Send a message (for testing/drafting)
   */
  async sendMessage(conversationId, messageText) {
    try {
      const response = await this.api.post(`/messaging/conversations/${conversationId}/events`, {
        eventCreate: {
          value: {
            'com.linkedin.common.MessageCreate': {
              body: messageText
            }
          }
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error sending LinkedIn message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get contact/profile by ID
   */
  async getProfileById(profileId) {
    try {
      const response = await this.api.get(`/people/(id:${profileId})`, {
        params: {
          projection: '(id,localizedFirstName,localizedLastName,headline,profilePicture(displayImage~:playableStreams))'
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching LinkedIn profile:', error.response?.data || error.message);
      return null;
    }
  }
}

module.exports = LinkedInService;

