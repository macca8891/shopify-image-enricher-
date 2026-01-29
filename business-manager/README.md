# Business Manager Assistant

An AI-powered business manager that monitors your contacts, emails, and LinkedIn messages, suggests follow-ups, and recommends personalized responses that learn your communication style.

## Features

- **Daily Contact Review**: Automatically scans all contacts, recent emails, and LinkedIn messages
- **Follow-up Suggestions**: Identifies contacts that need follow-up based on conversation history
- **AI Response Recommendations**: Generates personalized response suggestions using AI
- **Learning System**: Learns your communication style from your past emails and messages
- **Multi-platform Integration**: Gmail, LinkedIn, and contact management systems

## Architecture

```
business-manager/
├── server.js                 # Main server for the business manager
├── config/
│   └── integrations.js      # API credentials and configuration
├── services/
│   ├── EmailService.js      # Gmail API integration
│   ├── LinkedInService.js   # LinkedIn API integration
│   ├── ContactService.js    # Contact management
│   └── AIService.js         # AI response generation & learning
├── models/
│   ├── Contact.js           # Contact schema
│   ├── Conversation.js      # Email/LinkedIn conversation history
│   └── ResponseTemplate.js  # Learned response patterns
├── routes/
│   ├── dashboard.js         # Daily follow-up dashboard
│   ├── contacts.js          # Contact management endpoints
│   └── ai.js                # AI response endpoints
└── public/
    └── dashboard.html       # Web dashboard UI
```

## Setup

### Quick Start (HubSpot Only)

1. Add to `.env`:
```bash
HUBSPOT_ACCESS_TOKEN=your_token
OPENAI_API_KEY=your_key
BUSINESS_MANAGER_PORT=3002
```

2. Run:
```bash
npm run business-manager
```

3. Open: http://localhost:3002

### Full Setup (HubSpot + LinkedIn)

**LinkedIn requires OAuth and app approval.** See `LINKEDIN-SETUP.md` for details.

**Recommended:** Start with HubSpot only, add LinkedIn later.

1. Configure HubSpot (see `SETUP.md`)
2. Configure LinkedIn OAuth (optional, see `LINKEDIN-SETUP.md`)
3. Add OpenAI API key
4. Run the server

## Usage

Access the dashboard at `http://localhost:3002` to:
- View daily follow-up suggestions
- See recommended responses for each contact
- Train the AI on your communication style
- Send responses directly from the dashboard

