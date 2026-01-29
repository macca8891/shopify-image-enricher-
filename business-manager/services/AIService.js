const OpenAI = require('openai');
const logger = require('../../utils/logger');
const Conversation = require('../models/Conversation');
const DraftResponse = require('../models/DraftResponse');

class AIService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Analyze conversation history and draft a response
   */
  async draftResponse(contactId, conversationId, platform) {
    try {
      // Get conversation history for this contact
      const conversations = await Conversation.find({ contactId })
        .sort({ date: -1 })
        .limit(10)
        .lean();

      const currentConversation = conversations.find(c => c._id.toString() === conversationId);
      if (!currentConversation) {
        throw new Error('Conversation not found');
      }

      // Build context from conversation history
      const conversationContext = conversations
        .slice(0, 5) // Last 5 conversations
        .map(c => ({
          date: c.date,
          direction: c.direction,
          subject: c.subject,
          body: c.body.substring(0, 500) // Truncate long messages
        }));

      // Create prompt for AI
      const prompt = this.buildResponsePrompt(currentConversation, conversationContext, platform);

      // Generate response using OpenAI
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a professional business communication assistant. Analyze the conversation history and draft a personalized, professional response. Match the tone and style of previous communications. Be concise but warm and professional.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const draftText = completion.choices[0].message.content.trim();

      // Extract key points and summary
      const context = {
        previousMessages: conversationContext.map(c => `${c.direction}: ${c.body.substring(0, 200)}`),
        conversationSummary: this.summarizeConversations(conversations),
        suggestedTone: this.detectTone(conversations),
        keyPoints: this.extractKeyPoints(currentConversation, conversations)
      };

      // Save draft response
      const draftResponse = new DraftResponse({
        contactId,
        conversationId,
        platform,
        draftText,
        context,
        status: 'draft'
      });

      await draftResponse.save();

      return draftResponse;
    } catch (error) {
      logger.error('Error drafting AI response:', error);
      throw error;
    }
  }

  /**
   * Build prompt for AI response generation
   */
  buildResponsePrompt(currentConversation, conversationHistory, platform) {
    const historyText = conversationHistory
      .map((c, i) => {
        const direction = c.direction === 'inbound' ? 'THEM' : 'YOU';
        return `${i + 1}. [${direction}] ${c.date.toISOString().split('T')[0]}\n   Subject: ${c.subject || 'N/A'}\n   ${c.body}`;
      })
      .join('\n\n');

    return `Analyze this conversation history and draft a response to the most recent message.

PLATFORM: ${platform.toUpperCase()}

CONVERSATION HISTORY:
${historyText}

CURRENT MESSAGE TO RESPOND TO:
Subject: ${currentConversation.subject || 'N/A'}
${currentConversation.body}

INSTRUCTIONS:
1. Review the conversation history to understand the context and relationship
2. Match the tone and communication style from previous messages
3. Draft a professional, personalized response
4. Address any questions or points raised in the current message
5. Keep it concise but warm and professional
6. If this is a follow-up, acknowledge the previous conversation appropriately

Draft the response now:`;
  }

  /**
   * Summarize conversation history
   */
  summarizeConversations(conversations) {
    if (conversations.length === 0) return 'No previous conversations';
    
    const inboundCount = conversations.filter(c => c.direction === 'inbound').length;
    const outboundCount = conversations.filter(c => c.direction === 'outbound').length;
    const lastContact = conversations[0].date;
    
    return `${conversations.length} total conversations (${inboundCount} inbound, ${outboundCount} outbound). Last contact: ${lastContact.toISOString().split('T')[0]}`;
  }

  /**
   * Detect tone from conversation history
   */
  detectTone(conversations) {
    if (conversations.length === 0) return 'professional';
    
    // Simple tone detection based on keywords
    const allText = conversations.map(c => c.body.toLowerCase()).join(' ');
    
    if (allText.includes('thanks') || allText.includes('thank you') || allText.includes('appreciate')) {
      return 'appreciative';
    }
    if (allText.includes('urgent') || allText.includes('asap') || allText.includes('immediately')) {
      return 'urgent';
    }
    if (allText.includes('excited') || allText.includes('great') || allText.includes('awesome')) {
      return 'enthusiastic';
    }
    
    return 'professional';
  }

  /**
   * Extract key points from conversation
   */
  extractKeyPoints(currentConversation, conversations) {
    const points = [];
    
    // Extract questions from current conversation
    const questionMatches = currentConversation.body.match(/\?/g);
    if (questionMatches) {
      points.push(`${questionMatches.length} question(s) to address`);
    }
    
    // Check for action items
    if (currentConversation.body.toLowerCase().includes('follow up') || 
        currentConversation.body.toLowerCase().includes('next steps')) {
      points.push('Action items mentioned');
    }
    
    // Check for deadlines
    const deadlineMatches = currentConversation.body.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/g);
    if (deadlineMatches) {
      points.push(`Deadline mentioned: ${deadlineMatches[0]}`);
    }
    
    return points.length > 0 ? points : ['General response needed'];
  }

  /**
   * Learn from user feedback to improve future responses
   */
  async learnFromFeedback(draftResponseId, userFeedback, finalResponse) {
    try {
      const draft = await DraftResponse.findById(draftResponseId).populate('conversationId');
      if (!draft) return;

      // Update draft with feedback
      draft.userFeedback = userFeedback;
      draft.status = finalResponse ? 'sent' : 'rejected';
      await draft.save();

      // In a production system, you would:
      // 1. Store feedback patterns
      // 2. Adjust prompts based on feedback
      // 3. Build a fine-tuned model over time
      
      logger.info(`Learned from feedback for draft ${draftResponseId}`);
    } catch (error) {
      logger.error('Error learning from feedback:', error);
    }
  }

  /**
   * Improve draft based on user edits
   */
  async improveDraft(draftResponseId, userEdits) {
    try {
      const draft = await DraftResponse.findById(draftResponseId);
      if (!draft) return null;

      // Analyze what changed and why
      const prompt = `The user edited this AI-generated draft. Analyze what changed and why to improve future responses.

ORIGINAL DRAFT:
${draft.draftText}

USER EDITED VERSION:
${userEdits}

What patterns can you identify? What should be changed in future drafts?`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are analyzing user edits to improve AI response generation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      });

      // Store learning insights (in production, save to a learning database)
      const insights = completion.choices[0].message.content;
      logger.info(`Learning insights: ${insights}`);

      return insights;
    } catch (error) {
      logger.error('Error improving draft:', error);
      return null;
    }
  }
}

module.exports = AIService;


