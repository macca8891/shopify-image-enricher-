const axios = require('axios');
const logger = require('../../utils/logger');

class HubSpotService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseURL = 'https://api.hubapi.com';
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get all contacts from HubSpot
   */
  async getContacts(limit = 100, after = null) {
    try {
      const params = { limit };
      if (after) params.after = after;

      const response = await this.api.get('/crm/v3/objects/contacts', { params });
      return {
        contacts: response.data.results,
        paging: response.data.paging
      };
    } catch (error) {
      logger.error('Error fetching HubSpot contacts:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get contact by email
   */
  async getContactByEmail(email) {
    try {
      const response = await this.api.get('/crm/v3/objects/contacts', {
        params: {
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: email
            }]
          }]
        }
      });
      return response.data.results[0] || null;
    } catch (error) {
      logger.error('Error fetching HubSpot contact by email:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Get recent emails for a contact
   */
  async getContactEmails(contactId, limit = 50) {
    try {
      const response = await this.api.get(`/crm/v3/objects/contacts/${contactId}/associations/emails`, {
        params: { limit }
      });
      
      // Get email details
      const emailIds = response.data.results.map(r => r.id);
      if (emailIds.length === 0) return [];

      const emailsResponse = await this.api.post('/crm/v3/objects/emails/batch/read', {
        inputs: emailIds.map(id => ({ id }))
      });

      return emailsResponse.data.results || [];
    } catch (error) {
      logger.error('Error fetching HubSpot emails:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get all recent emails (across all contacts)
   */
  async getRecentEmails(limit = 100, days = 7) {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      const response = await this.api.get('/crm/v3/objects/emails', {
        params: {
          limit,
          properties: ['hs_timestamp', 'hs_email_subject', 'hs_email_text', 'hs_email_direction', 'hs_email_status'],
          associations: ['contacts'],
          after: since.getTime()
        }
      });

      return response.data.results || [];
    } catch (error) {
      logger.error('Error fetching recent HubSpot emails:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get tasks and activities for a contact
   */
  async getContactTasks(contactId) {
    try {
      const response = await this.api.get(`/crm/v3/objects/contacts/${contactId}/associations/tasks`);
      return response.data.results || [];
    } catch (error) {
      logger.error('Error fetching HubSpot tasks:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get all tasks that need follow-up
   */
  async getFollowUpTasks() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const response = await this.api.get('/crm/v3/objects/tasks', {
        params: {
          properties: ['hs_task_subject', 'hs_task_status', 'hs_timestamp', 'hs_task_priority'],
          associations: ['contacts'],
          filterGroups: [{
            filters: [{
              propertyName: 'hs_task_status',
              operator: 'NEQ',
              value: 'COMPLETED'
            }]
          }]
        }
      });

      return response.data.results || [];
    } catch (error) {
      logger.error('Error fetching HubSpot follow-up tasks:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get contact details with all properties
   */
  async getContactDetails(contactId) {
    try {
      const response = await this.api.get(`/crm/v3/objects/contacts/${contactId}`, {
        params: {
          properties: ['email', 'firstname', 'lastname', 'company', 'phone', 'jobtitle', 'lastcontacteddate']
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching HubSpot contact details:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get engagement (calls, meetings, notes) for a contact
   */
  async getContactEngagements(contactId, limit = 50) {
    try {
      const response = await this.api.get(`/engagements/v1/engagements/associated/contact/${contactId}`, {
        params: { limit }
      });
      return response.data.results || [];
    } catch (error) {
      logger.error('Error fetching HubSpot engagements:', error.response?.data || error.message);
      return [];
    }
  }
}

module.exports = HubSpotService;


