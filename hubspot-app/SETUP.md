# HubSpot Follow-Up Assistant - Setup Guide

## Prerequisites

- Node.js 16+ installed
- MongoDB installed and running (or MongoDB Atlas account)
- HubSpot account with admin access
- OpenAI API key (for email drafting)

## Step 1: Install Dependencies

```bash
cd hubspot-app
npm install
```

## Step 2: Set Up HubSpot Private App

1. Log in to your HubSpot account
2. Go to **Settings** → **Integrations** → **Private Apps**
3. Click **Create a private app**
4. Name it "Follow-Up Assistant" (or your preferred name)
5. Under **Scopes**, select the following permissions:
   - **Contacts**: `Read` and `Write`
   - **Tasks**: `Read` and `Write`
   - **Timeline**: `Read` and `Write`
   - **CRM Objects**: `Read` and `Write` for Contacts
6. Click **Create app**
7. Copy the **Access Token** - you'll need this for `.env`

## Step 3: Get Your HubSpot User ID

1. Go to **Settings** → **Users & Teams**
2. Click on your user profile
3. Look at the URL - it will contain your user ID (e.g., `https://app.hubspot.com/users/12345678/...`)
4. Copy the user ID number

Alternatively, you can use the HubSpot API:
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://api.hubapi.com/owners/v2/owners/current
```

## Step 4: Set Up OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to **API Keys** section
4. Create a new API key
5. Copy the key (you won't be able to see it again!)

## Step 5: Configure Environment Variables

Create a `.env` file in the `hubspot-app` directory:

```bash
# HubSpot API Configuration
HUBSPOT_ACCESS_TOKEN=your_hubspot_private_app_access_token_here
HUBSPOT_PORTAL_ID=your_hubspot_portal_id
HUBSPOT_USER_ID=your_hubspot_user_id

# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/hubspot-followup
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hubspot-followup

# Server Configuration
PORT=3002
NODE_ENV=development

# Follow-up Settings
FOLLOW_UP_DAYS=7
TASK_PRIORITY=HIGH
ENABLE_EMAIL_DRAFTING=true
ENABLE_CALL_TASKS=true
ENABLE_LINKEDIN_TASKS=true
```

### Configuration Options Explained

- `FOLLOW_UP_DAYS`: Number of days since last contact to trigger follow-up (default: 7)
- `TASK_PRIORITY`: Priority for created tasks (`HIGH`, `MEDIUM`, or `LOW`)
- `ENABLE_EMAIL_DRAFTING`: Enable AI email drafting (true/false)
- `ENABLE_CALL_TASKS`: Create call follow-up tasks (true/false)
- `ENABLE_LINKEDIN_TASKS`: Create LinkedIn message tasks (true/false)

## Step 6: Set Up MongoDB

### Option A: Local MongoDB

1. Install MongoDB locally
2. Start MongoDB service:
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   
   # Windows
   # Start MongoDB from Services
   ```

### Option B: MongoDB Atlas (Cloud)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster
4. Get your connection string
5. Update `MONGODB_URI` in `.env`

## Step 7: Start the Application

```bash
npm start
```

The server will start on `http://localhost:3002`

## Step 8: Test the Setup

1. **Test API Health**:
   ```bash
   curl http://localhost:3002/health
   ```

2. **Run Manual Follow-Up Check**:
   ```bash
   npm run daily-check
   ```

3. **Access Web UI**:
   Open `http://localhost:3002` in your browser

## Step 9: Configure Sales Process Data (Optional)

You can customize the AI email drafting by adding your sales process data:

```bash
curl -X PUT http://localhost:3002/api/sales-process \
  -H "Content-Type: application/json" \
  -d '{
    "bestPractices": "Always be consultative. Listen first, provide value before asking for anything.",
    "followUpGuidelines": "Follow up within 7 days. Personalize each message based on previous conversations.",
    "valueProps": [
      "We solve complex business problems",
      "We build long-term partnerships",
      "We provide expert guidance"
    ],
    "commonQuestions": {
      "pricing": "Our pricing is customized based on your needs. Let's schedule a call to discuss.",
      "timeline": "We typically implement solutions within 4-6 weeks."
    }
  }'
```

## Daily Automation

The app automatically runs a daily check at **9:00 AM** (configurable in `server.js`).

To change the schedule, edit the cron expression in `server.js`:
```javascript
cron.schedule('0 9 * * *', async () => {
  // Runs at 9 AM every day
});
```

Cron format: `minute hour day month day-of-week`

Examples:
- `'0 9 * * *'` - 9 AM daily
- `'0 9 * * 1-5'` - 9 AM weekdays only
- `'0 */6 * * *'` - Every 6 hours

## Troubleshooting

### "MongoDB connection error"
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`
- Verify MongoDB connection string format

### "HubSpot API error"
- Verify `HUBSPOT_ACCESS_TOKEN` is correct
- Check that private app has correct scopes
- Ensure token hasn't expired

### "OpenAI API error"
- Verify `OPENAI_API_KEY` is correct
- Check your OpenAI account has credits
- Ensure API key has proper permissions

### Tasks not being created
- Check `HUBSPOT_USER_ID` matches your actual user ID
- Verify contacts are assigned to you in HubSpot
- Check that contacts have a `lastcontactdate` property set

## API Endpoints

- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get specific task
- `POST /api/tasks/:id/complete` - Complete a task
- `POST /api/tasks/:id/draft-email` - Regenerate email draft
- `GET /api/contacts` - Get assigned contacts
- `GET /api/contacts/:id` - Get contact details
- `GET /api/contacts/:id/communications` - Get communication history
- `POST /api/contacts/:id/draft-email` - Draft email for contact
- `POST /api/followup/check` - Manually trigger follow-up check
- `GET /api/followup/stats` - Get statistics
- `GET /api/sales-process` - Get sales process data
- `PUT /api/sales-process` - Update sales process data

## Next Steps

1. Customize your sales process data via the API
2. Adjust follow-up settings in `.env`
3. Set up the daily cron job on a server for production
4. Integrate with your email client to send drafted emails
5. Add custom email templates to the sales process data

## Production Deployment

For production deployment:

1. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name hubspot-followup
   ```

2. Set up environment variables on your hosting platform

3. Configure MongoDB Atlas for cloud database

4. Set up SSL/HTTPS for secure API access

5. Configure firewall rules if needed

## Support

For issues or questions:
1. Check the logs in the console
2. Verify all environment variables are set correctly
3. Test API endpoints individually
4. Check HubSpot API status


