const express = require('express');
const router = express.Router();
const SalesProcess = require('../models/SalesProcess');

/**
 * GET /api/sales-process
 * Get sales process data
 */
router.get('/', async (req, res) => {
  try {
    const salesProcess = await SalesProcess.getOrCreate();
    
    res.json({
      success: true,
      salesProcess
    });
  } catch (error) {
    console.error('Error fetching sales process:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/sales-process
 * Update sales process data
 */
router.put('/', async (req, res) => {
  try {
    const { emailTemplates, bestPractices, commonQuestions, followUpGuidelines, valueProps } = req.body;
    
    let salesProcess = await SalesProcess.findOne();
    
    if (!salesProcess) {
      salesProcess = new SalesProcess();
    }

    if (emailTemplates) salesProcess.emailTemplates = emailTemplates;
    if (bestPractices) salesProcess.bestPractices = bestPractices;
    if (commonQuestions) salesProcess.commonQuestions = commonQuestions;
    if (followUpGuidelines) salesProcess.followUpGuidelines = followUpGuidelines;
    if (valueProps) salesProcess.valueProps = valueProps;

    salesProcess.updatedAt = new Date();
    await salesProcess.save();

    res.json({
      success: true,
      salesProcess
    });
  } catch (error) {
    console.error('Error updating sales process:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;


