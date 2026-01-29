const express = require('express');
const router = express.Router();
const HubSpotService = require('../services/HubSpotService');
const Task = require('../models/Task');

const hubspotService = new HubSpotService();

/**
 * GET /api/tasks
 * Get all follow-up tasks
 */
router.get('/', async (req, res) => {
  try {
    const { status, type, limit = 50 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/tasks/:id
 * Get specific task
 */
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findOne({ hubspotTaskId: req.params.id });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Also fetch from HubSpot for latest status
    try {
      const hubspotTask = await hubspotService.getTask(req.params.id);
      res.json({
        success: true,
        task: {
          ...task.toObject(),
          hubspotData: hubspotTask
        }
      });
    } catch (error) {
      res.json({
        success: true,
        task
      });
    }
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tasks/:id/complete
 * Mark task as complete
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const task = await Task.findOne({ hubspotTaskId: req.params.id });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Update in HubSpot
    await hubspotService.updateTask(req.params.id, 'COMPLETED');

    // Update in database
    task.status = 'COMPLETED';
    task.completedAt = new Date();
    await task.save();

    res.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/tasks/:id/draft-email
 * Regenerate email draft for a task
 */
router.post('/:id/draft-email', async (req, res) => {
  try {
    const EmailDraftingService = require('../services/EmailDraftingService');
    const emailService = new EmailDraftingService();

    const task = await Task.findOne({ hubspotTaskId: req.params.id });
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    if (task.type !== 'email') {
      return res.status(400).json({
        success: false,
        error: 'Task is not an email task'
      });
    }

    const draft = await emailService.draftEmail(task.hubspotContactId, req.body.context || {});

    // Update task with new draft
    task.emailDraft = {
      subject: draft.subject,
      body: draft.body
    };
    await task.save();

    res.json({
      success: true,
      draft
    });
  } catch (error) {
    console.error('Error drafting email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;


