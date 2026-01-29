# Business Manager - Quick Start

## What It Does

Every day, the Business Manager:
1. ✅ Reviews all your HubSpot contacts and LinkedIn messages
2. ✅ Identifies who you should follow up with
3. ✅ Uses AI to analyze previous conversations
4. ✅ Generates personalized draft responses
5. ✅ Learns from your edits to improve over time

## Setup (5 minutes)

### 1. Add Environment Variables

Add to your `.env` file:

```bash
# Business Manager Port
BUSINESS_MANAGER_PORT=3002

# HubSpot API Token (get from HubSpot Settings → Integrations → Private Apps)
HUBSPOT_ACCESS_TOKEN=your_token_here

# LinkedIn API Token (get from LinkedIn Developers)
LINKEDIN_ACCESS_TOKEN=your_token_here

# OpenAI API Key (you probably already have this)
OPENAI_API_KEY=your_key_here
```

### 2. Start the Server

```bash
npm run business-manager
```

Or:

```bash
node business-manager/server.js
```

### 3. Open Dashboard

Go to: **http://localhost:3002**

## Daily Workflow

### Morning Routine

1. **Open the dashboard** → See who needs follow-up
2. **Click "Run Daily Review"** → Syncs contacts and conversations
3. **Review draft responses** → AI has already written them for you
4. **Edit if needed** → AI learns from your changes
5. **Send responses** → Mark as sent, AI learns your style

### Using Drafts

- **View Draft**: Click any draft to see full conversation history
- **Edit**: Modify the AI-generated text to match your style
- **Regenerate**: Ask AI to try again with different approach
- **Send**: Mark as sent (AI learns from your final version)

## Getting API Tokens

### HubSpot (2 minutes)

1. Go to https://app.hubspot.com
2. Settings → Integrations → Private Apps
3. Create app with these scopes:
   - `crm.objects.contacts.read`
   - `crm.objects.emails.read`
   - `engagements.read`
4. Copy the access token

### LinkedIn (5 minutes)

1. Go to https://www.linkedin.com/developers/apps
2. Create app or use existing
3. Request permissions:
   - `r_messages` (Messaging API)
   - `r_emailaddress`
4. Generate OAuth token
5. Copy the access token

**Note:** LinkedIn Messaging API may require approval. You can start with HubSpot only.

### OpenAI (1 minute)

1. Go to https://platform.openai.com/api-keys
2. Create new key
3. Copy it

## Features

### ✅ Smart Follow-up Detection
- Finds unresponded messages
- Identifies overdue follow-ups
- Prioritizes by urgency

### ✅ AI Response Generation
- Analyzes conversation history
- Matches your communication style
- Context-aware responses

### ✅ Learning System
- Learns from your edits
- Improves over time
- Adapts to your tone

### ✅ Multi-Platform
- HubSpot emails
- LinkedIn messages
- Unified dashboard

## Troubleshooting

**"No follow-ups found"**
- Run "Run Daily Review" first
- Check API tokens are valid
- Verify contacts exist in HubSpot

**"Error syncing LinkedIn"**
- LinkedIn API requires special permissions
- Can work with HubSpot only
- Check LinkedIn Developer Portal

**"AI responses seem generic"**
- Edit drafts to teach AI your style
- More conversations = better context
- AI improves over time

## Next Steps

- **Schedule daily reviews**: Set up cron job for automatic reviews
- **Customize AI prompts**: Edit `business-manager/services/AIService.js`
- **Add more platforms**: Extend to Slack, Gmail, etc.

## Support

See `SETUP.md` for detailed documentation.


