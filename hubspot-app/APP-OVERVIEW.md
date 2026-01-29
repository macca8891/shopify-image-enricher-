# HubSpot Follow-Up Assistant - Application Overview

## What This App Does

The **HubSpot Follow-Up Assistant** is an intelligent automation tool that:

1. **Daily Contact Review**: Automatically checks all contacts assigned to you in HubSpot every day
2. **Smart Task Creation**: Creates follow-up tasks for email, phone calls, and LinkedIn messages based on when you last contacted each prospect
3. **AI Email Drafting**: Generates personalized email drafts using OpenAI GPT-4, analyzing:
   - Previous email conversations
   - Call notes and meeting summaries
   - Contact history and lifecycle stage
   - Your custom sales process guidelines
4. **Task Management**: Provides a web dashboard to view, manage, and complete follow-up tasks

## Key Features

### 🤖 Automated Daily Checks
- Runs automatically at 9 AM every day (configurable)
- Identifies contacts that need follow-up based on your threshold (default: 7 days)
- Creates tasks directly in HubSpot CRM

### 📧 AI-Powered Email Drafting
- Analyzes previous communications with each contact
- References your sales process and best practices
- Generates personalized, context-aware email drafts
- Includes subject lines and email bodies

### 📋 Multi-Channel Follow-Ups
- **Email Tasks**: With AI-drafted email content
- **Call Tasks**: With talking points based on recent communications
- **LinkedIn Tasks**: For social media follow-ups

### 📊 Dashboard & Management
- Web-based UI to view all tasks
- Filter by status (pending, completed)
- Complete tasks directly from the dashboard
- Regenerate email drafts on demand
- View statistics and task counts

## Architecture

### Tech Stack
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (stores tasks and sales process data)
- **APIs**: 
  - HubSpot API (contacts, tasks, communications)
  - OpenAI API (GPT-4 for email drafting)
- **Scheduling**: node-cron for daily automation

### Project Structure

```
hubspot-app/
├── server.js                 # Main Express server
├── services/
│   ├── HubSpotService.js     # HubSpot API integration
│   ├── EmailDraftingService.js  # AI email generation
│   └── FollowUpService.js    # Core follow-up logic
├── routes/
│   ├── tasks.js              # Task management endpoints
│   ├── contacts.js           # Contact endpoints
│   ├── followup.js           # Follow-up check endpoints
│   └── sales-process.js      # Sales process data endpoints
├── models/
│   ├── Task.js               # Task database model
│   └── SalesProcess.js       # Sales process data model
├── scripts/
│   └── daily-contact-check.js # Manual check script
└── public/
    └── index.html            # Web dashboard UI
```

## How It Works

### 1. Daily Check Process

```
Every Day at 9 AM:
├── Fetch all contacts assigned to you from HubSpot
├── For each contact:
│   ├── Check last contact date
│   ├── Calculate days since last contact
│   └── If >= threshold (7 days):
│       ├── Create email task (with AI draft)
│       ├── Create call task
│       └── Create LinkedIn task
└── Save tasks to database and HubSpot
```

### 2. Email Drafting Process

```
When drafting email:
├── Fetch contact details from HubSpot
├── Get communication history:
│   ├── Previous emails
│   ├── Call notes
│   ├── Meeting summaries
│   └── Notes
├── Load sales process data from database
├── Build AI prompt with context
├── Generate draft using GPT-4
└── Return subject + body
```

### 3. Task Creation

Tasks are created in HubSpot with:
- **Subject**: "Follow up via [email/call/LinkedIn]: [Contact Name]"
- **Body**: Reason for follow-up + AI-drafted content (for emails)
- **Priority**: Configurable (HIGH/MEDIUM/LOW)
- **Status**: NOT_STARTED
- **Association**: Linked to the contact

## Configuration

### Environment Variables

**Required:**
- `HUBSPOT_ACCESS_TOKEN`: Private app access token
- `HUBSPOT_USER_ID`: Your HubSpot user ID
- `OPENAI_API_KEY`: OpenAI API key

**Optional:**
- `MONGODB_URI`: MongoDB connection string
- `PORT`: Server port (default: 3002)
- `FOLLOW_UP_DAYS`: Days threshold (default: 7)
- `TASK_PRIORITY`: Task priority (HIGH/MEDIUM/LOW)
- `ENABLE_EMAIL_DRAFTING`: Enable AI drafting (true/false)
- `ENABLE_CALL_TASKS`: Create call tasks (true/false)
- `ENABLE_LINKEDIN_TASKS`: Create LinkedIn tasks (true/false)

### Sales Process Data

Customize AI email drafting by configuring:
- **Best Practices**: Your sales methodology
- **Follow-Up Guidelines**: When and how to follow up
- **Value Props**: Key value propositions
- **Common Questions**: FAQ responses

## API Endpoints

### Tasks
- `GET /api/tasks` - List all tasks
- `GET /api/tasks/:id` - Get task details
- `POST /api/tasks/:id/complete` - Complete a task
- `POST /api/tasks/:id/draft-email` - Regenerate email draft

### Contacts
- `GET /api/contacts` - List assigned contacts
- `GET /api/contacts/:id` - Get contact details
- `GET /api/contacts/:id/communications` - Get communication history
- `POST /api/contacts/:id/draft-email` - Draft email for contact

### Follow-Up
- `POST /api/followup/check` - Manually trigger check
- `GET /api/followup/stats` - Get statistics

### Sales Process
- `GET /api/sales-process` - Get sales process data
- `PUT /api/sales-process` - Update sales process data

## Integration Points

### HubSpot Integration
- **Contacts API**: Fetch assigned contacts
- **Tasks API**: Create and update tasks
- **Engagements API**: Get communication history (emails, calls, meetings, notes)
- **CRM Objects API**: Contact details and associations

### OpenAI Integration
- **GPT-4**: Email generation
- **Context**: Previous communications + sales process
- **Output**: Subject line + email body

## Data Flow

```
HubSpot CRM
    ↓
Daily Check (Cron)
    ↓
Fetch Contacts
    ↓
Analyze Last Contact Date
    ↓
Create Tasks in HubSpot
    ↓
Save to MongoDB
    ↓
Web Dashboard (View/Manage)
```

## Security Considerations

- **Access Tokens**: Stored in `.env` (never commit to git)
- **API Keys**: Secured via environment variables
- **MongoDB**: Use authentication in production
- **HTTPS**: Use SSL/TLS in production
- **Rate Limiting**: HubSpot API has rate limits (monitor usage)

## Future Enhancements

Potential improvements:
- Email sending integration (Outlook/Gmail)
- LinkedIn message drafting
- Calendar integration for call scheduling
- Custom follow-up rules per contact
- Multi-user support
- Analytics and reporting
- Email template library
- A/B testing for email drafts

## Support & Troubleshooting

See `SETUP.md` for detailed setup instructions and troubleshooting guide.

Common issues:
- MongoDB connection errors → Check MongoDB is running
- HubSpot API errors → Verify access token and scopes
- No tasks created → Check user ID and contact assignments
- Email drafts not generating → Verify OpenAI API key and credits

## License

MIT License - Feel free to modify and use as needed.


