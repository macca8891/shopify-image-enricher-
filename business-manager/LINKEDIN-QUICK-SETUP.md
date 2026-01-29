# LinkedIn Quick Setup Guide

## Step-by-Step Setup (5 minutes)

### 1. Create LinkedIn App

1. Go to https://www.linkedin.com/developers/apps
2. Click **"Create app"**
3. Fill in:
   - **App name**: Business Manager (or your choice)
   - **LinkedIn Page**: Select your company page (or create one)
   - **Privacy policy URL**: Your website or GitHub repo
   - **App logo**: Upload a logo (optional)
4. Click **"Create app"**

### 2. Configure OAuth Settings

1. In your app, go to **"Auth"** tab
2. Under **"Redirect URLs"**, add:
   ```
   http://localhost:3002/api/linkedin/callback
   ```
   (For production, also add your production URL)

3. Under **"Products"**, request access to:
   - ✅ **Sign In with LinkedIn using OpenID Connect**
   - ✅ **Marketing Developer Platform** (for messaging)

### 3. Request Permissions

1. Go to **"Auth"** → **"Products"**
2. Request these scopes:
   - `r_liteprofile` - Basic profile info
   - `r_emailaddress` - Email address  
   - `r_messages` - Messaging API (requires approval)

**Note:** `r_messages` requires LinkedIn approval (2-4 weeks). The system will work without it, but won't sync messages.

### 4. Get Your Credentials

1. Go to **"Auth"** tab
2. Copy:
   - **Client ID**
   - **Client Secret**

### 5. Add to .env File

Add these to your `.env` file:

```bash
# LinkedIn OAuth Credentials
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here
LINKEDIN_REDIRECT_URI=http://localhost:3002/api/linkedin/callback
```

### 6. Start the Server

```bash
npm run business-manager
```

### 7. Authorize LinkedIn

1. Open dashboard: http://localhost:3002
2. Click **"Check LinkedIn"** button
3. Click **"Connect LinkedIn"** link
4. You'll be redirected to LinkedIn
5. Authorize the app
6. You'll see a success page with tokens
7. Copy the `LINKEDIN_ACCESS_TOKEN` to your `.env` file
8. Restart the server

### 8. Verify Connection

1. Click **"Check LinkedIn"** again
2. You should see: ✅ **LinkedIn Connected**

## Troubleshooting

### "Redirect URI mismatch"

**Problem:** LinkedIn says redirect URI doesn't match

**Solution:**
- Make sure redirect URI in LinkedIn app matches exactly:
  - `http://localhost:3002/api/linkedin/callback`
- No trailing slashes
- Use `http` not `https` for localhost

### "r_messages permission denied"

**Problem:** Can't access messaging API

**Solution:**
- This is normal! `r_messages` requires LinkedIn approval
- System will work without it (HubSpot only)
- Submit your app for review to get messaging access
- See `LINKEDIN-SETUP.md` for approval process

### "Invalid client credentials"

**Problem:** OAuth fails with invalid credentials

**Solution:**
- Double-check `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`
- Make sure there are no extra spaces
- Regenerate credentials in LinkedIn app if needed

### Token Expired

**Problem:** Access token expires (usually after 60 days)

**Solution:**
- Re-run OAuth flow: Visit `/api/linkedin/auth`
- Or use refresh token to get new access token
- Add new token to `.env` and restart

## What Works Without Approval

Even without `r_messages` approval, you can:
- ✅ Connect to LinkedIn
- ✅ Get your profile info
- ✅ Get contact email addresses
- ✅ Match LinkedIn profiles to HubSpot contacts
- ✅ Use HubSpot for all messaging

## Getting Messaging API Approval

To sync LinkedIn messages, you need approval:

1. **Submit Use Case**
   - In LinkedIn app, request `r_messages` permission
   - Describe: "Business communication management tool"
   - Explain: "Help users manage LinkedIn messages and follow-ups"

2. **Wait for Review**
   - Usually takes 2-4 weeks
   - LinkedIn may ask for more info

3. **Once Approved**
   - System will automatically start syncing messages
   - No code changes needed!

## Next Steps

- ✅ LinkedIn connected → Start using HubSpot + LinkedIn
- ⚠️ Messaging not approved → Use HubSpot for now, LinkedIn later
- 📚 See `LINKEDIN-SETUP.md` for detailed API docs


