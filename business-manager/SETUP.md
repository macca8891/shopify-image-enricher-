# Business Manager Setup Guide

## Overview

This Business Manager integrates with HubSpot and LinkedIn to:
- Review your daily activity
- Identify contacts needing follow-up
- Generate AI-powered draft responses based on conversation history
- Learn from your communication style over time

## Prerequisites

1. **HubSpot Account** with API access
2. **LinkedIn Developer Account** with Messaging API access
3. **OpenAI API Key** for AI response generation
4. **MongoDB** (can use existing MongoDB from main app)

## Installation

### 1. Install Dependencies

The required packages (`openai`, `axios`, `mongoose`) are already in the main `package.json`. No additional installation needed.

### 2. Environment Variables

Add these to your `.env` file:

```bash
# Business Manager Port (default: 3002)
BUSINESS_MANAGER_PORT=3002

# HubSpot API Token
# Get from: https://app.hubspot.com/settings/integrations/api-key
HUBSPOT_ACCESS_TOKEN=your_hubspot_token_here

# LinkedIn API Token
# Get from: https://www.linkedin.com/developers/apps
# Requires: r_messages, r_emailaddress permissions
LINKEDIN_ACCESS_TOKEN=your_linkedin_token_here

# OpenAI API Key (already in use)
OPENAI_API_KEY=your_openai_key_here

# MongoDB (uses same as main app)
MONGODB_URI=mongodb://localhost:27017/shopify-image-enricher
```

## Getting API Credentials

### HubSpot Access Token

1. Go to https://app.hubspot.com
2. Navigate to **Settings** → **Integrations** → **Private Apps**
3. Create a new private app or use existing one
4. Grant these scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.emails.read`
   - `crm.objects.tasks.read`
   - `engagements.read`
5. Copy the access token

### LinkedIn Access Token

1. Go to https://www.linkedin.com/developers/apps
2. Create a new app or use existing one
3. Request these permissions:
   - `r_messages` (Messaging API)
   - `r_emailaddress` (Email address)
   - `r_liteprofile` (Basic profile)
4. Generate an access token (OAuth 2.0)
5. Copy the access token

**Note:** LinkedIn Messaging API requires approval from LinkedIn. You may need to:
- Submit your app for review
- Or use LinkedIn's OAuth flow to get user tokens

### OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (already configured if you're using OpenAI elsewhere)

## Running the Business Manager

### Start the Server

```bash
node business-manager/server.js
```

The dashboard will be available at: `http://localhost:3002`

### Run Daily Review

1. Click **"Run Daily Review"** button in the dashboard
2. Or use the API endpoint:
```bash
curl -X POST http://localhost:3002/api/dashboard/run-review
```

## How It Works

### Daily Review Process

1. **Sync Contacts**: Fetches all contacts from HubSpot
2. **Sync Conversations**: Retrieves recent emails from HubSpot and LinkedIn messages
3. **Identify Follow-ups**: Finds unresponded messages and overdue follow-ups
4. **Generate Drafts**: Uses AI to analyze conversation history and draft responses

### AI Response Generation

The AI service:
- Analyzes the last 5-10 conversations with each contact
- Matches your communication tone and style
- Generates personalized, context-aware responses
- Learns from your edits and feedback

### Learning System

When you:
- Edit a draft → AI learns what changes you make
- Send a response → AI learns from your final version
- Provide feedback → AI adjusts future suggestions

## API Endpoints

### Dashboard
- `GET /api/dashboard/summary` - Get daily summary
- `POST /api/dashboard/run-review` - Run daily review
- `GET /api/dashboard/follow-ups` - Get follow-ups list
- `GET /api/dashboard/drafts` - Get draft responses

### Drafts
- `GET /api/dashboard/draft/:id` - Get specific draft
- `PUT /api/dashboard/draft/:id` - Update draft
- `POST /api/dashboard/draft/:id/generate` - Regenerate draft
- `POST /api/dashboard/draft/:id/send` - Mark draft as sent

### Contacts
- `GET /api/dashboard/contacts/:id/conversations` - Get conversation history
- `POST /api/dashboard/contacts/:id/draft` - Create new draft

## Troubleshooting

### HubSpot API Errors

- Verify your access token is valid
- Check that required scopes are granted
- Ensure you're using a Private App token (not OAuth token)

### LinkedIn API Errors

- LinkedIn Messaging API requires special approval
- You may need to use OAuth flow instead of static token
- Check API permissions in LinkedIn Developer Portal

### MongoDB Connection

- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`
- Business Manager uses the same database as main app

### AI Response Issues

- Verify OpenAI API key is valid
- Check API quota/limits
- Review conversation history - AI needs context to generate good responses

## Next Steps

1. **Set up scheduled reviews**: Add a cron job to run daily review automatically
2. **Customize AI prompts**: Edit `AIService.js` to adjust response style
3. **Add more integrations**: Extend to other platforms (Slack, email providers, etc.)
4. **Improve learning**: Build a feedback system to continuously improve AI responses

## Scheduled Daily Reviews

To run daily reviews automatically, add to your crontab:

```bash
# Run daily review at 9 AM every day
0 9 * * * cd /path/to/shopify-image-enricher && curl -X POST http://localhost:3002/api/dashboard/run-review
```

Or use a Node.js scheduler like `node-cron`:

```javascript
const cron = require('node-cron');
const axios = require('axios');

cron.schedule('0 9 * * *', async () => {
  await axios.post('http://localhost:3002/api/dashboard/run-review');
});
```


