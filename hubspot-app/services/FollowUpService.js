const HubSpotService = require('./HubSpotService');
const EmailDraftingService = require('./EmailDraftingService');

class FollowUpService {
  constructor() {
    this.hubspotService = new HubSpotService();
    this.emailDraftingService = new EmailDraftingService();
    this.followUpDays = parseInt(process.env.FOLLOW_UP_DAYS) || 7;
    this.taskPriority = process.env.TASK_PRIORITY || 'HIGH';
    this.enableEmailDrafting = process.env.ENABLE_EMAIL_DRAFTING === 'true';
    this.enableCallTasks = process.env.ENABLE_CALL_TASKS !== 'false';
    this.enableLinkedInTasks = process.env.ENABLE_LINKEDIN_TASKS !== 'false';
  }

  /**
   * Check all assigned contacts and create follow-up tasks
   */
  async checkContactsAndCreateTasks() {
    try {
      console.log('Starting daily contact check...');
      
      const contacts = await this.hubspotService.getAssignedContacts();
      console.log(`Found ${contacts.length} assigned contacts`);

      const tasksCreated = [];
      const skipped = [];

      for (const contact of contacts) {
        try {
          const shouldFollowUp = await this.shouldCreateFollowUp(contact);
          
          if (shouldFollowUp.should) {
            const tasks = await this.createFollowUpTasks(contact, shouldFollowUp.reason);
            tasksCreated.push(...tasks);
            console.log(`Created ${tasks.length} tasks for ${contact.properties.email}`);
          } else {
            skipped.push({
              contact: contact.properties.email,
              reason: shouldFollowUp.reason
            });
          }
        } catch (error) {
          console.error(`Error processing contact ${contact.id}:`, error);
        }
      }

      return {
        totalContacts: contacts.length,
        tasksCreated: tasksCreated.length,
        contactsSkipped: skipped.length,
        tasks: tasksCreated,
        skipped: skipped
      };
    } catch (error) {
      console.error('Error in daily contact check:', error);
      throw error;
    }
  }

  /**
   * Determine if a follow-up task should be created for a contact
   */
  async shouldCreateFollowUp(contact) {
    const lastContactDate = contact.properties.lastcontactdate;
    const lifecycleStage = contact.properties.lifecyclestage;

    // Skip if no last contact date
    if (!lastContactDate) {
      return {
        should: false,
        reason: 'No last contact date'
      };
    }

    // Calculate days since last contact
    const daysSinceLastContact = this.daysSinceDate(lastContactDate);

    // Check if follow-up is needed
    if (daysSinceLastContact >= this.followUpDays) {
      return {
        should: true,
        reason: `Last contact was ${daysSinceLastContact} days ago`
      };
    }

    return {
      should: false,
      reason: `Last contact was only ${daysSinceLastContact} days ago (threshold: ${this.followUpDays})`
    };
  }

  /**
   * Create follow-up tasks for a contact
   */
  async createFollowUpTasks(contact, reason) {
    const tasks = [];
    const contactName = `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim() || 'Contact';

    // Create email follow-up task
    if (this.enableEmailDrafting) {
      try {
        // Draft email first
        const emailDraft = await this.emailDraftingService.draftEmail(contact.id);
        
        const emailTask = await this.hubspotService.createTask(contact.id, {
          subject: `Follow up via email: ${contactName}`,
          body: `Reason: ${reason}\n\nDrafted Email:\nSubject: ${emailDraft.subject}\n\n${emailDraft.body}`,
          priority: this.taskPriority,
          type: 'EMAIL'
        });
        tasks.push({ ...emailTask, type: 'email', draft: emailDraft });
      } catch (error) {
        console.error(`Error creating email task for ${contact.id}:`, error);
        // Create task without draft if drafting fails
        const emailTask = await this.hubspotService.createTask(contact.id, {
          subject: `Follow up via email: ${contactName}`,
          body: `Reason: ${reason}`,
          priority: this.taskPriority,
          type: 'EMAIL'
        });
        tasks.push({ ...emailTask, type: 'email' });
      }
    }

    // Create call task
    if (this.enableCallTasks) {
      const callTask = await this.hubspotService.createTask(contact.id, {
        subject: `Follow up via call: ${contactName}`,
        body: `Reason: ${reason}\n\nPrepare talking points based on recent communications.`,
        priority: this.taskPriority,
        type: 'CALL'
      });
      tasks.push({ ...callTask, type: 'call' });
    }

    // Create LinkedIn message task
    if (this.enableLinkedInTasks) {
      const linkedInTask = await this.hubspotService.createTask(contact.id, {
        subject: `Follow up via LinkedIn: ${contactName}`,
        body: `Reason: ${reason}\n\nSend a personalized LinkedIn message to reconnect.`,
        priority: this.taskPriority,
        type: 'LINKEDIN'
      });
      tasks.push({ ...linkedInTask, type: 'linkedin' });
    }

    return tasks;
  }

  /**
   * Calculate days since a given date
   */
  daysSinceDate(dateString) {
    if (!dateString) return Infinity;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
}

module.exports = FollowUpService;


