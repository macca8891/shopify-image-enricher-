# HubSpot Follow-Up Assistant

An intelligent HubSpot app that automatically creates daily follow-up tasks and drafts AI-powered email responses based on previous communications and your sales process.

## Features

- **Daily Contact Review**: Automatically checks all contacts assigned to you daily
- **Smart Task Creation**: Creates follow-up tasks for email, call, and LinkedIn messages
- **AI Email Drafting**: Generates personalized email responses based on:
  - Previous communications with the contact
  - Your sales process and best practices
  - Contact's history and context
- **HubSpot Integration**: Fully integrated with HubSpot CRM (contacts, tasks, communications)

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Get HubSpot Access Token**
   - Go to HubSpot Settings > Integrations > Private Apps
   - Create a new private app with these scopes:
     - `contacts.read`
     - `contacts.write`
     - `tasks.read`
     - `tasks.write`
     - `timeline.read`
     - `timeline.write`
     - `crm.objects.contacts.read`
     - `crm.objects.contacts.write`
   - Copy the access token to `.env`

4. **Get Your HubSpot User ID**
   - Go to HubSpot Settings > Users & Teams
   - Find your user ID (in the URL or user details)
   - Add to `.env` as `HUBSPOT_USER_ID`

5. **Set Up OpenAI API Key**
   - Get an API key from OpenAI
   - Add to `.env` as `OPENAI_API_KEY`

6. **Start the Server**
   ```bash
   npm start
   ```

## Daily Check

The app runs a daily check at 9 AM (configurable) that:
1. Fetches all contacts assigned to you
2. Analyzes last contact date
3. Creates follow-up tasks based on your settings
4. Drafts email responses using AI

You can also run the check manually:
```bash
npm run daily-check
```

## API Endpoints

- `GET /api/tasks` - Get all follow-up tasks
- `GET /api/tasks/:id` - Get specific task
- `POST /api/tasks/:id/complete` - Mark task as complete
- `POST /api/contacts/:id/draft-email` - Draft email for a contact
- `GET /api/contacts` - Get assigned contacts
- `GET /api/contacts/:id/communications` - Get communication history

## Configuration

Edit `.env` to customize:
- `FOLLOW_UP_DAYS`: Days since last contact to trigger follow-up (default: 7)
- `TASK_PRIORITY`: Priority for created tasks (HIGH, MEDIUM, LOW)
- `ENABLE_EMAIL_DRAFTING`: Enable AI email drafting (true/false)
- `ENABLE_CALL_TASKS`: Create call tasks (true/false)
- `ENABLE_LINKEDIN_TASKS`: Create LinkedIn message tasks (true/false)


