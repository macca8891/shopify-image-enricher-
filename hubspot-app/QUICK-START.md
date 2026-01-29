# Quick Start Guide

Get your HubSpot Follow-Up Assistant running in 5 minutes!

## 1. Install Dependencies

```bash
cd hubspot-app
npm install
```

## 2. Set Up Environment Variables

Create a `.env` file:

```bash
# Required: HubSpot Private App Token
HUBSPOT_ACCESS_TOKEN=pat-na1-xxxxx-xxxxx-xxxxx

# Required: Your HubSpot User ID (find in Settings > Users & Teams)
HUBSPOT_USER_ID=12345678

# Required: OpenAI API Key
OPENAI_API_KEY=sk-xxxxx

# Optional: MongoDB (defaults to localhost)
MONGODB_URI=mongodb://localhost:27017/hubspot-followup

# Optional: Server Port (defaults to 3002)
PORT=3002
```

## 3. Get Your HubSpot Credentials

### Access Token
1. Go to HubSpot → Settings → Integrations → Private Apps
2. Create a new private app
3. Grant these scopes:
   - `contacts.read`, `contacts.write`
   - `tasks.read`, `tasks.write`
   - `timeline.read`, `timeline.write`
4. Copy the access token to `.env`

### User ID
1. Go to HubSpot → Settings → Users & Teams
2. Click your profile
3. Copy the user ID from the URL or profile page

## 4. Start MongoDB

**Local MongoDB:**
```bash
# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

**Or use MongoDB Atlas** (cloud):
- Sign up at mongodb.com/cloud/atlas
- Create a free cluster
- Copy connection string to `.env`

## 5. Start the App

```bash
npm start
```

Visit `http://localhost:3002` to see the dashboard!

## 6. Test It

Run a manual follow-up check:
```bash
npm run daily-check
```

Or click "Run Follow-Up Check" in the web UI.

## What Happens Next?

- **Daily at 9 AM**: The app automatically checks your contacts and creates follow-up tasks
- **Tasks Created**: Email, call, and LinkedIn follow-up tasks in HubSpot
- **AI Email Drafts**: Personalized email drafts based on previous communications
- **Web Dashboard**: View and manage all tasks at `http://localhost:3002`

## Troubleshooting

**"MongoDB connection error"**
- Make sure MongoDB is running
- Check your `MONGODB_URI` in `.env`

**"HubSpot API error"**
- Verify your access token is correct
- Check that your private app has the right scopes

**"No tasks created"**
- Make sure contacts are assigned to you in HubSpot
- Check that contacts have a `lastcontactdate` property
- Verify your `HUBSPOT_USER_ID` matches your actual user ID

## Next Steps

- Customize follow-up settings in `.env`:
  - `FOLLOW_UP_DAYS=7` (days since last contact)
  - `TASK_PRIORITY=HIGH` (task priority)
  - `ENABLE_EMAIL_DRAFTING=true` (AI email drafting)
  - `ENABLE_CALL_TASKS=true` (create call tasks)
  - `ENABLE_LINKEDIN_TASKS=true` (create LinkedIn tasks)

- Add your sales process data:
  ```bash
  curl -X PUT http://localhost:3002/api/sales-process \
    -H "Content-Type: application/json" \
    -d '{"bestPractices": "Your sales best practices here"}'
  ```

See `SETUP.md` for detailed configuration options!


