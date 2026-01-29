const express = require('express');
const router = express.Router();
const HubSpotService = require('../services/HubSpotService');
const EmailDraftingService = require('../services/EmailDraftingService');

const hubspotService = new HubSpotService();
const emailService = new EmailDraftingService();

/**
 * GET /api/contacts
 * Get all assigned contacts
 */
router.get('/', async (req, res) => {
  try {
    const contacts = await hubspotService.getAssignedContacts();
    
    res.json({
      success: true,
      count: contacts.length,
      contacts: contacts.map(contact => ({
        id: contact.id,
        email: contact.properties.email,
        firstName: contact.properties.firstname,
        lastName: contact.properties.lastname,
        company: contact.properties.company,
        lastContactDate: contact.properties.lastcontactdate,
        lifecycleStage: contact.properties.lifecyclestage
      }))
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contacts/:id
 * Get specific contact details
 */
router.get('/:id', async (req, res) => {
  try {
    const contact = await hubspotService.getContact(req.params.id);
    
    res.json({
      success: true,
      contact: {
        id: contact.id,
        properties: contact.properties
      }
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/contacts/:id/communications
 * Get communication history for a contact
 */
router.get('/:id/communications', async (req, res) => {
  try {
    const communications = await hubspotService.getContactCommunications(req.params.id);
    
    res.json({
      success: true,
      count: communications.length,
      communications
    });
  } catch (error) {
    console.error('Error fetching communications:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/contacts/:id/draft-email
 * Draft an email for a contact
 */
router.post('/:id/draft-email', async (req, res) => {
  try {
    const { purpose, keyPoints, tone } = req.body;
    
    const draft = await emailService.draftEmail(req.params.id, {
      purpose,
      keyPoints,
      tone
    });

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


