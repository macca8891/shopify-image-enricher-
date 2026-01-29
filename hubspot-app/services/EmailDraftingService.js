const OpenAI = require('openai');
const HubSpotService = require('./HubSpotService');

class EmailDraftingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.hubspotService = new HubSpotService();
    this.model = process.env.OPENAI_MODEL || 'gpt-4';
  }

  /**
   * Draft an email response for a contact based on their communication history
   */
  async draftEmail(contactId, context = {}) {
    try {
      // Get contact details
      const contact = await this.hubspotService.getContact(contactId);
      
      // Get communication history
      const communications = await this.hubspotService.getContactCommunications(contactId);
      
      // Get sales process data from database
      const salesProcessData = await this.getSalesProcessData();

      // Build context for AI
      const prompt = this.buildEmailPrompt(contact, communications, salesProcessData, context);

      // Generate email draft
      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a professional sales email writer. Write concise, personalized emails that build relationships and move prospects through the sales process.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const draft = response.choices[0].message.content;

      return {
        subject: this.extractSubject(draft),
        body: this.extractBody(draft),
        draft: draft
      };
    } catch (error) {
      console.error(`Error drafting email for contact ${contactId}:`, error);
      throw error;
    }
  }

  /**
   * Build the prompt for email generation
   */
  buildEmailPrompt(contact, communications, salesProcessData, context) {
    const contactName = `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim() || 'the contact';
    const company = contact.properties.company || 'their company';
    const lifecycleStage = contact.properties.lifecyclestage || 'unknown';
    const lastContactDate = contact.properties.lastcontactdate || 'unknown';

    let prompt = `Draft a follow-up email for ${contactName} at ${company}.\n\n`;

    // Add contact context
    prompt += `Contact Information:\n`;
    prompt += `- Name: ${contactName}\n`;
    prompt += `- Company: ${company}\n`;
    prompt += `- Lifecycle Stage: ${lifecycleStage}\n`;
    prompt += `- Last Contact Date: ${lastContactDate}\n\n`;

    // Add communication history
    if (communications.length > 0) {
      prompt += `Recent Communication History:\n`;
      const recentComms = communications.slice(0, 10); // Last 10 communications
      recentComms.forEach((comm, index) => {
        prompt += `${index + 1}. ${comm.type.toUpperCase()} (${new Date(comm.timestamp).toLocaleDateString()}):\n`;
        if (comm.subject) prompt += `   Subject: ${comm.subject}\n`;
        if (comm.body) prompt += `   Content: ${comm.body.substring(0, 200)}...\n`;
        if (comm.notes) prompt += `   Notes: ${comm.notes.substring(0, 200)}...\n`;
        prompt += `\n`;
      });
    } else {
      prompt += `No previous communication history found.\n\n`;
    }

    // Add sales process context
    if (salesProcessData) {
      prompt += `Sales Process Guidelines:\n`;
      if (salesProcessData.emailTemplates) {
        prompt += `- Email Templates: ${JSON.stringify(salesProcessData.emailTemplates)}\n`;
      }
      if (salesProcessData.bestPractices) {
        prompt += `- Best Practices: ${salesProcessData.bestPractices}\n`;
      }
      if (salesProcessData.commonQuestions) {
        prompt += `- Common Questions/Responses: ${JSON.stringify(salesProcessData.commonQuestions)}\n`;
      }
      prompt += `\n`;
    }

    // Add specific context if provided
    if (context.purpose) {
      prompt += `Purpose of this email: ${context.purpose}\n\n`;
    }
    if (context.keyPoints) {
      prompt += `Key points to include: ${context.keyPoints.join(', ')}\n\n`;
    }
    if (context.tone) {
      prompt += `Tone: ${context.tone}\n\n`;
    } else {
      prompt += `Tone: Professional, friendly, and value-focused\n\n`;
    }

    prompt += `Please draft a personalized email that:\n`;
    prompt += `1. References previous conversations naturally\n`;
    prompt += `2. Provides value or addresses their needs\n`;
    prompt += `3. Includes a clear call-to-action\n`;
    prompt += `4. Is concise (under 150 words)\n`;
    prompt += `5. Includes both a subject line and email body\n\n`;
    prompt += `Format your response as:\n`;
    prompt += `SUBJECT: [subject line]\n\n`;
    prompt += `BODY:\n[email body]`;

    return prompt;
  }

  /**
   * Extract subject line from AI response
   */
  extractSubject(draft) {
    const subjectMatch = draft.match(/SUBJECT:\s*(.+?)(?:\n|$)/i);
    if (subjectMatch) {
      return subjectMatch[1].trim();
    }
    // Fallback: use first line or generate default
    return 'Following up';
  }

  /**
   * Extract body from AI response
   */
  extractBody(draft) {
    const bodyMatch = draft.match(/BODY:\s*([\s\S]+)/i);
    if (bodyMatch) {
      return bodyMatch[1].trim();
    }
    // Fallback: return entire draft
    return draft;
  }

  /**
   * Get sales process data from database
   */
  async getSalesProcessData() {
    try {
      const SalesProcess = require('../models/SalesProcess');
      const data = await SalesProcess.findOne();
      return data;
    } catch (error) {
      console.error('Error fetching sales process data:', error);
      return null;
    }
  }
}

module.exports = EmailDraftingService;


