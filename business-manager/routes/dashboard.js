const express = require('express');
const router = express.Router();
const DailyReviewService = require('../services/DailyReviewService');
const Contact = require('../models/Contact');
const Conversation = require('../models/Conversation');
const DraftResponse = require('../models/DraftResponse');
const AIService = require('../services/AIService');
const logger = require('../../utils/logger');

// Initialize services (tokens should come from environment or user session)
const hubspotToken = process.env.HUBSPOT_ACCESS_TOKEN;
const linkedinToken = process.env.LINKEDIN_ACCESS_TOKEN;
const openaiKey = process.env.OPENAI_API_KEY;

const dailyReview = new DailyReviewService(hubspotToken, linkedinToken, openaiKey);
const aiService = new AIService(openaiKey);

/**
 * GET /api/dashboard/summary
 * Get daily summary of follow-ups and drafts
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await dailyReview.getDailySummary();
    res.json(summary);
  } catch (error) {
    logger.error('Error fetching dashboard summary:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dashboard/run-review
 * Manually trigger daily review
 */
router.post('/run-review', async (req, res) => {
  try {
    const result = await dailyReview.runDailyReview();
    res.json(result);
  } catch (error) {
    logger.error('Error running daily review:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/follow-ups
 * Get all contacts needing follow-up
 */
router.get('/follow-ups', async (req, res) => {
  try {
    const { priority, limit = 50 } = req.query;
    
    const query = { followUpNeeded: true };
    if (priority) {
      query.priority = priority;
    }

    const followUps = await Contact.find(query)
      .sort({ priority: 1, followUpDate: 1 })
      .limit(parseInt(limit))
      .lean();

    // Get conversations for each follow-up
    const followUpsWithConversations = await Promise.all(
      followUps.map(async (contact) => {
        const conversations = await Conversation.find({ contactId: contact._id })
          .sort({ date: -1 })
          .limit(5)
          .lean();
        
        const latestUnresponded = conversations.find(c => c.responseNeeded);
        
        return {
          ...contact,
          conversations,
          latestUnresponded
        };
      })
    );

    res.json(followUpsWithConversations);
  } catch (error) {
    logger.error('Error fetching follow-ups:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/drafts
 * Get all draft responses
 */
router.get('/drafts', async (req, res) => {
  try {
    const { status, contactId } = req.query;
    
    const query = {};
    if (status) {
      query.status = status;
    }
    if (contactId) {
      query.contactId = contactId;
    }

    const drafts = await DraftResponse.find(query)
      .populate('contactId', 'firstName lastName email company')
      .populate('conversationId')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json(drafts);
  } catch (error) {
    logger.error('Error fetching drafts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/draft/:draftId
 * Get a specific draft response
 */
router.get('/draft/:draftId', async (req, res) => {
  try {
    const draft = await DraftResponse.findById(req.params.draftId)
      .populate('contactId')
      .populate('conversationId');

    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json(draft);
  } catch (error) {
    logger.error('Error fetching draft:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dashboard/draft/:draftId/generate
 * Regenerate a draft response
 */
router.post('/draft/:draftId/generate', async (req, res) => {
  try {
    const draft = await DraftResponse.findById(req.params.draftId);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    const newDraft = await aiService.draftResponse(
      draft.contactId,
      draft.conversationId,
      draft.platform
    );

    res.json(newDraft);
  } catch (error) {
    logger.error('Error regenerating draft:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/dashboard/draft/:draftId
 * Update a draft response (user edits)
 */
router.put('/draft/:draftId', async (req, res) => {
  try {
    const { draftText, status, feedback } = req.body;
    
    const draft = await DraftResponse.findById(req.params.draftId);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // If user edited the draft, learn from the changes
    if (draftText && draftText !== draft.draftText) {
      await aiService.improveDraft(req.params.draftId, draftText);
    }

    draft.draftText = draftText || draft.draftText;
    draft.status = status || draft.status;
    draft.userFeedback = feedback || draft.userFeedback;
    draft.updatedAt = new Date();
    
    await draft.save();

    res.json(draft);
  } catch (error) {
    logger.error('Error updating draft:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dashboard/draft/:draftId/send
 * Mark draft as sent and learn from it
 */
router.post('/draft/:draftId/send', async (req, res) => {
  try {
    const { finalResponse, feedback } = req.body;
    
    const draft = await DraftResponse.findById(req.params.draftId);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    draft.status = 'sent';
    draft.userFeedback = feedback;
    await draft.save();

    // Learn from the sent response
    await aiService.learnFromFeedback(req.params.draftId, feedback, finalResponse);

    // Update conversation as responded
    await Conversation.findByIdAndUpdate(draft.conversationId, {
      responded: true,
      responseNeeded: false
    });

    // Update contact follow-up status
    const contact = await Contact.findById(draft.contactId);
    if (contact) {
      contact.followUpNeeded = false;
      contact.lastContacted = new Date();
      await contact.save();
    }

    res.json({ success: true, draft });
  } catch (error) {
    logger.error('Error sending draft:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/dashboard/contacts/:contactId/conversations
 * Get conversation history for a contact
 */
router.get('/contacts/:contactId/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.find({ contactId: req.params.contactId })
      .sort({ date: -1 })
      .limit(50)
      .lean();

    res.json(conversations);
  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/dashboard/contacts/:contactId/draft
 * Create a new draft for a contact
 */
router.post('/contacts/:contactId/draft', async (req, res) => {
  try {
    const { conversationId, platform } = req.body;
    
    if (!conversationId || !platform) {
      return res.status(400).json({ error: 'conversationId and platform are required' });
    }

    const draft = await aiService.draftResponse(
      req.params.contactId,
      conversationId,
      platform
    );

    res.json(draft);
  } catch (error) {
    logger.error('Error creating draft:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


