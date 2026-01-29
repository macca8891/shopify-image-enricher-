const hubspot = require('@hubspot/api-client');
const axios = require('axios');

class HubSpotService {
  constructor() {
    this.client = new hubspot.Client({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN
    });
    this.portalId = process.env.HUBSPOT_PORTAL_ID;
    this.userId = process.env.HUBSPOT_USER_ID;
  }

  /**
   * Get all contacts assigned to the current user
   */
  async getAssignedContacts() {
    try {
      const response = await this.client.crm.contacts.basicApi.getPage(
        100, // limit
        undefined, // after (pagination)
        ['email', 'firstname', 'lastname', 'lastcontactdate', 'hubspot_owner_id', 'lifecyclestage'],
        undefined, // propertiesWithHistory
        false // associations
      );

      // Filter contacts assigned to current user
      const assignedContacts = response.results.filter(
        contact => contact.properties.hubspot_owner_id === this.userId
      );

      return assignedContacts;
    } catch (error) {
      console.error('Error fetching assigned contacts:', error);
      throw error;
    }
  }

  /**
   * Get communication history for a contact
   */
  async getContactCommunications(contactId) {
    try {
      // Get emails
      const emails = await this.getContactEmails(contactId);
      
      // Get calls
      const calls = await this.getContactCalls(contactId);
      
      // Get meetings
      const meetings = await this.getContactMeetings(contactId);
      
      // Get notes
      const notes = await this.getContactNotes(contactId);

      // Combine and sort by date
      const communications = [
        ...emails.map(e => ({ ...e, type: 'email' })),
        ...calls.map(c => ({ ...c, type: 'call' })),
        ...meetings.map(m => ({ ...m, type: 'meeting' })),
        ...notes.map(n => ({ ...n, type: 'note' }))
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return communications;
    } catch (error) {
      console.error(`Error fetching communications for contact ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Get emails for a contact using engagements API
   */
  async getContactEmails(contactId) {
    try {
      // Use engagements API to get emails
      const response = await axios.get(
        `https://api.hubapi.com/engagements/v1/engagements/associated/contact/${contactId}/paged`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`
          },
          params: {
            limit: 100
          }
        }
      );

      const engagements = response.data.results || [];
      return engagements
        .filter(eng => eng.engagement && eng.engagement.type === 'EMAIL')
        .map(email => ({
          id: email.engagement.id,
          subject: email.metadata?.subject || '',
          body: email.metadata?.html || email.metadata?.text || '',
          timestamp: email.engagement.createdAt || email.engagement.timestamp
        }));
    } catch (error) {
      console.error(`Error fetching emails for contact ${contactId}:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get calls for a contact using engagements API
   */
  async getContactCalls(contactId) {
    try {
      const response = await axios.get(
        `https://api.hubapi.com/engagements/v1/engagements/associated/contact/${contactId}/paged`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`
          },
          params: {
            limit: 100
          }
        }
      );

      const engagements = response.data.results || [];
      return engagements
        .filter(eng => eng.engagement && eng.engagement.type === 'CALL')
        .map(call => ({
          id: call.engagement.id,
          title: call.metadata?.title || 'Call',
          notes: call.metadata?.body || '',
          timestamp: call.engagement.createdAt || call.engagement.timestamp
        }));
    } catch (error) {
      console.error(`Error fetching calls for contact ${contactId}:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get meetings for a contact using engagements API
   */
  async getContactMeetings(contactId) {
    try {
      const response = await axios.get(
        `https://api.hubapi.com/engagements/v1/engagements/associated/contact/${contactId}/paged`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`
          },
          params: {
            limit: 100
          }
        }
      );

      const engagements = response.data.results || [];
      return engagements
        .filter(eng => eng.engagement && eng.engagement.type === 'MEETING')
        .map(meeting => ({
          id: meeting.engagement.id,
          title: meeting.metadata?.title || 'Meeting',
          notes: meeting.metadata?.body || '',
          timestamp: meeting.engagement.createdAt || meeting.engagement.timestamp
        }));
    } catch (error) {
      console.error(`Error fetching meetings for contact ${contactId}:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get notes for a contact using engagements API
   */
  async getContactNotes(contactId) {
    try {
      const response = await axios.get(
        `https://api.hubapi.com/engagements/v1/engagements/associated/contact/${contactId}/paged`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`
          },
          params: {
            limit: 100
          }
        }
      );

      const engagements = response.data.results || [];
      return engagements
        .filter(eng => eng.engagement && eng.engagement.type === 'NOTE')
        .map(note => ({
          id: note.engagement.id,
          body: note.metadata?.body || '',
          timestamp: note.engagement.createdAt || note.engagement.timestamp
        }));
    } catch (error) {
      console.error(`Error fetching notes for contact ${contactId}:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Create a task in HubSpot
   */
  async createTask(contactId, taskData) {
    try {
      const taskProperties = {
        hs_timestamp: Date.now().toString(),
        hs_task_subject: taskData.subject,
        hs_task_body: taskData.body || '',
        hs_task_status: 'NOT_STARTED',
        hs_task_priority: taskData.priority || 'HIGH',
        hs_task_type: taskData.type || 'FOLLOW_UP'
      };

      const task = await this.client.crm.objects.basicApi.create('tasks', {
        properties: taskProperties,
        associations: [{
          to: { id: contactId },
          types: [{
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 1 // Contact to Task association
          }]
        }]
      });

      return {
        id: task.id,
        properties: task.properties,
        associations: task.associations,
        type: taskData.type
      };
    } catch (error) {
      console.error('Error creating task:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get contact details
   */
  async getContact(contactId) {
    try {
      const contact = await this.client.crm.contacts.basicApi.getById(
        contactId,
        ['email', 'firstname', 'lastname', 'company', 'phone', 'lastcontactdate', 'lifecyclestage', 'hubspot_owner_id']
      );
      return contact;
    } catch (error) {
      console.error(`Error fetching contact ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Update contact properties
   */
  async updateContact(contactId, properties) {
    try {
      const contact = await this.client.crm.contacts.basicApi.update(
        contactId,
        { properties }
      );
      return contact;
    } catch (error) {
      console.error(`Error updating contact ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  async getTask(taskId) {
    try {
      const task = await this.client.crm.objects.basicApi.getById('tasks', taskId);
      return task;
    } catch (error) {
      console.error(`Error fetching task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Update task status
   */
  async updateTask(taskId, status) {
    try {
      const task = await this.client.crm.objects.basicApi.update('tasks', taskId, {
        properties: {
          hs_task_status: status
        }
      });
      return task;
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      throw error;
    }
  }
}

module.exports = HubSpotService;

