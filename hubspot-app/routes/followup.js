const express = require('express');
const router = express.Router();
const FollowUpService = require('../services/FollowUpService');
const Task = require('../models/Task');

const followUpService = new FollowUpService();

/**
 * POST /api/followup/check
 * Manually trigger daily contact check
 */
router.post('/check', async (req, res) => {
  try {
    console.log('Manual follow-up check triggered');
    
    const result = await followUpService.checkContactsAndCreateTasks();

    // Save tasks to database
    for (const task of result.tasks) {
      try {
        await Task.findOneAndUpdate(
          { hubspotTaskId: task.id },
          {
            hubspotTaskId: task.id,
            hubspotContactId: task.associations?.[0]?.to?.id || 'unknown',
            type: task.type || 'email',
            subject: task.properties?.hs_task_subject || 'Follow up',
            body: task.properties?.hs_task_body || '',
            priority: task.properties?.hs_task_priority || 'HIGH',
            status: task.properties?.hs_task_status || 'NOT_STARTED',
            emailDraft: task.draft || null
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error(`Error saving task ${task.id}:`, error);
      }
    }

    res.json({
      success: true,
      message: 'Follow-up check completed',
      result
    });
  } catch (error) {
    console.error('Error in follow-up check:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/followup/stats
 * Get follow-up statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: { $in: ['NOT_STARTED', 'IN_PROGRESS'] } });
    const completedTasks = await Task.countDocuments({ status: 'COMPLETED' });
    
    const tasksByType = await Task.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        totalTasks,
        pendingTasks,
        completedTasks,
        tasksByType: tasksByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;


