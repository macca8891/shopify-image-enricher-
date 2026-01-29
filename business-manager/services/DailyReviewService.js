const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const DraftResponse = require('../models/DraftResponse');
const HubSpotService = require('./HubSpotService');
const LinkedInService = require('./LinkedInService');
const AIService = require('./AIService');
const logger = require('../../utils/logger');

class DailyReviewService {
  constructor(hubspotToken, linkedinToken, openaiKey) {
    this.hubspot = new HubSpotService(hubspotToken);
    this.linkedin = new LinkedInService(linkedinToken);
    this.ai = new AIService(openaiKey);
  }

  /**
   * Run daily review - main entry point
   */
  async runDailyReview() {
    logger.info('Starting daily review...');
    
    try {
      // 1. Sync contacts from HubSpot and LinkedIn
      await this.syncContacts();
      
      // 2. Sync recent conversations
      await this.syncConversations();
      
      // 3. Identify follow-ups needed
      const followUps = await this.identifyFollowUps();
      
      // 4. Generate draft responses for follow-ups
      const drafts = await this.generateDraftResponses(followUps);
      
      logger.info(`Daily review complete. Found ${followUps.length} follow-ups, generated ${drafts.length} drafts.`);
      
      return {
        followUps,
        drafts,
        summary: {
          totalContacts: await Contact.countDocuments(),
          followUpsNeeded: followUps.length,
          draftsGenerated: drafts.length
        }
      };
    } catch (error) {
      logger.error('Error in daily review:', error);
      throw error;
    }
  }

  /**
   * Sync contacts from HubSpot and LinkedIn
   */
  async syncContacts() {
    logger.info('Syncing contacts from HubSpot...');
    
    try {
      let after = null;
      let totalSynced = 0;

      do {
        const result = await this.hubspot.getContacts(100, after);
        
        for (const hubspotContact of result.contacts) {
          const email = hubspotContact.properties?.email;
          if (!email) continue;

          const contactData = {
            hubspotContactId: hubspotContact.id,
            email: email,
            firstName: hubspotContact.properties?.firstname,
            lastName: hubspotContact.properties?.lastname,
            company: hubspotContact.properties?.company,
            title: hubspotContact.properties?.jobtitle,
            phone: hubspotContact.properties?.phone,
            lastContacted: hubspotContact.properties?.lastcontacteddate 
              ? new Date(hubspotContact.properties.lastcontacteddate) 
              : null
          };

          await Contact.findOneAndUpdate(
            { email },
            { $set: contactData, $setOnInsert: { createdAt: new Date() } },
            { upsert: true, new: true }
          );
          
          totalSynced++;
        }

        after = result.paging?.next?.after || null;
      } while (after);

      logger.info(`Synced ${totalSynced} contacts from HubSpot`);
    } catch (error) {
      logger.error('Error syncing HubSpot contacts:', error);
    }
  }

  /**
   * Sync recent conversations from HubSpot and LinkedIn
   */
  async syncConversations() {
    logger.info('Syncing conversations...');
    
    try {
      // Sync HubSpot emails
      const hubspotEmails = await this.hubspot.getRecentEmails(100, 30); // Last 30 days
      
      for (const email of hubspotEmails) {
        // Get associated contact ID from HubSpot email
        const contactId = email.associations?.contacts?.results?.[0]?.id;
        if (!contactId) continue;

        // Find contact by HubSpot contact ID
        let contact = await Contact.findOne({ hubspotContactId: contactId });
        
        // If not found, try to get contact details from HubSpot and create it
        if (!contact) {
          try {
            const contactDetails = await this.hubspot.getContactDetails(contactId);
            const email = contactDetails.properties?.email;
            if (email) {
              contact = await Contact.findOneAndUpdate(
                { email },
                {
                  hubspotContactId: contactId,
                  email: email,
                  firstName: contactDetails.properties?.firstname,
                  lastName: contactDetails.properties?.lastname,
                  company: contactDetails.properties?.company,
                  title: contactDetails.properties?.jobtitle,
                  phone: contactDetails.properties?.phone
                },
                { upsert: true, new: true }
              );
            }
          } catch (error) {
            logger.warn(`Could not fetch contact ${contactId} from HubSpot:`, error.message);
            continue;
          }
        }
        
        if (!contact) continue;

        const conversationData = {
          contactId: contact._id,
          platform: 'hubspot',
          platformMessageId: email.id,
          direction: email.properties?.hs_email_direction === 'INCOMING' ? 'inbound' : 'outbound',
          subject: email.properties?.hs_email_subject,
          body: email.properties?.hs_email_text || '',
          date: new Date(email.properties?.hs_timestamp),
          read: email.properties?.hs_email_status === 'READ',
          responded: email.properties?.hs_email_status === 'REPLIED',
          responseNeeded: email.properties?.hs_email_direction === 'INCOMING' && 
                         email.properties?.hs_email_status !== 'REPLIED'
        };

        await Conversation.findOneAndUpdate(
          { platformMessageId: email.id, platform: 'hubspot' },
          { $set: conversationData },
          { upsert: true }
        );
      }

      logger.info(`Synced ${hubspotEmails.length} HubSpot emails`);

      // Sync LinkedIn messages (if available)
      try {
        const linkedinConversations = await this.linkedin.getConversations(50);
        
        for (const conv of linkedinConversations) {
          const messages = await this.linkedin.getConversationMessages(conv.id);
          
          for (const message of messages) {
            // Extract contact info from LinkedIn message
            const participantId = message.from?.id || message.to?.id;
            if (!participantId) continue;

            let contact = await Contact.findOne({ linkedinProfileId: participantId });
            if (!contact) {
              // Try to find by email if available
              const profile = await this.linkedin.getProfileById(participantId);
              if (profile?.emailAddress) {
                contact = await Contact.findOne({ email: profile.emailAddress });
                if (contact) {
                  contact.linkedinProfileId = participantId;
                  await contact.save();
                }
              }
            }

            if (!contact) continue;

            const conversationData = {
              contactId: contact._id,
              platform: 'linkedin',
              platformMessageId: message.id,
              direction: message.from?.id === participantId ? 'inbound' : 'outbound',
              subject: null,
              body: message.body?.text || '',
              date: new Date(message.createdAt),
              read: message.read || false,
              responded: false, // LinkedIn doesn't provide this directly
              responseNeeded: message.from?.id === participantId && !message.read
            };

            await Conversation.findOneAndUpdate(
              { platformMessageId: message.id, platform: 'linkedin' },
              { $set: conversationData },
              { upsert: true }
            );
          }
        }

        logger.info(`Synced ${linkedinConversations.length} LinkedIn conversations`);
      } catch (error) {
        logger.warn('LinkedIn sync failed (may need API permissions):', error.message);
      }
    } catch (error) {
      logger.error('Error syncing conversations:', error);
    }
  }

  /**
   * Identify contacts that need follow-up
   */
  async identifyFollowUps() {
    logger.info('Identifying follow-ups...');
    
    const followUps = [];
    const now = new Date();
    const daysAgo = new Date(now);
    daysAgo.setDate(daysAgo.getDate() - 7); // Look back 7 days

    // Find conversations that need response
    const unrespondedConversations = await Conversation.find({
      responseNeeded: true,
      date: { $gte: daysAgo }
    })
      .populate('contactId')
      .sort({ date: -1 })
      .limit(50);

    for (const conv of unrespondedConversations) {
      if (!conv.contactId) continue;

      const contact = conv.contactId;
      
      // Check if we already have a draft for this conversation
      const existingDraft = await DraftResponse.findOne({
        conversationId: conv._id,
        status: { $in: ['draft', 'reviewed'] }
      });

      if (existingDraft) continue;

      // Determine priority
      const daysSince = Math.floor((now - conv.date) / (1000 * 60 * 60 * 24));
      let priority = 'medium';
      if (daysSince > 3) priority = 'high';
      if (daysSince > 7) priority = 'urgent';

      // Update contact follow-up flag
      contact.followUpNeeded = true;
      contact.followUpReason = `Unresponded ${conv.platform} message from ${daysSince} day(s) ago`;
      contact.followUpDate = now;
      contact.priority = priority;
      await contact.save();

      followUps.push({
        contact,
        conversation: conv,
        priority,
        daysSince,
        reason: contact.followUpReason
      });
    }

    // Also check for contacts with overdue follow-ups
    const overdueContacts = await Contact.find({
      followUpNeeded: true,
      followUpDate: { $lt: now }
    }).limit(20);

    for (const contact of overdueContacts) {
      const recentConversations = await Conversation.find({ contactId: contact._id })
        .sort({ date: -1 })
        .limit(1);

      if (recentConversations.length > 0) {
        followUps.push({
          contact,
          conversation: recentConversations[0],
          priority: contact.priority || 'medium',
          daysSince: Math.floor((now - contact.followUpDate) / (1000 * 60 * 60 * 24)),
          reason: contact.followUpReason || 'Overdue follow-up'
        });
      }
    }

    logger.info(`Identified ${followUps.length} follow-ups needed`);
    return followUps;
  }

  /**
   * Generate draft responses for follow-ups
   */
  async generateDraftResponses(followUps) {
    logger.info(`Generating draft responses for ${followUps.length} follow-ups...`);
    
    const drafts = [];

    for (const followUp of followUps) {
      try {
        const draft = await this.ai.draftResponse(
          followUp.contact._id,
          followUp.conversation._id,
          followUp.conversation.platform
        );
        
        drafts.push({
          draft,
          contact: followUp.contact,
          conversation: followUp.conversation,
          priority: followUp.priority
        });
      } catch (error) {
        logger.error(`Error generating draft for contact ${followUp.contact._id}:`, error);
      }
    }

    logger.info(`Generated ${drafts.length} draft responses`);
    return drafts;
  }

  /**
   * Get daily summary for dashboard
   */
  async getDailySummary() {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const followUps = await Contact.find({
      followUpNeeded: true
    })
      .sort({ priority: 1, followUpDate: 1 })
      .limit(50);

    const drafts = await DraftResponse.find({
      status: { $in: ['draft', 'reviewed'] },
      createdAt: { $gte: todayStart }
    })
      .populate('contactId conversationId')
      .sort({ createdAt: -1 });

    const recentConversations = await Conversation.find({
      date: { $gte: todayStart }
    })
      .populate('contactId')
      .sort({ date: -1 })
      .limit(20);

    return {
      followUps,
      drafts,
      recentConversations,
      stats: {
        totalFollowUps: followUps.length,
        urgentFollowUps: followUps.filter(f => f.priority === 'urgent').length,
        draftsPending: drafts.length,
        conversationsToday: recentConversations.length
      }
    };
  }
}

module.exports = DailyReviewService;

