# LinkedIn Integration Setup Guide

## Important Notes

LinkedIn's Messaging API has **stricter requirements** than HubSpot:

1. **Requires OAuth 2.0** (not just API tokens)
2. **Requires app approval** for `r_messages` permission
3. **May require LinkedIn Partner Program** membership
4. **Limited API access** compared to HubSpot

## Two Options for LinkedIn Integration

### Option 1: OAuth Flow (Recommended)

This is the proper way to integrate LinkedIn. The system includes OAuth support.

#### Setup Steps

1. **Create LinkedIn App**
   - Go to https://www.linkedin.com/developers/apps
   - Create a new app
   - Note your **Client ID** and **Client Secret**

2. **Configure Redirect URI**
   - In LinkedIn app settings, add redirect URI:
   - `http://localhost:3002/api/linkedin/callback` (for development)
   - Or your production URL: `https://yourdomain.com/api/linkedin/callback`

3. **Request Permissions**
   - In your LinkedIn app, request these scopes:
     - `r_liteprofile` - Basic profile info
     - `r_emailaddress` - Email address
     - `r_messages` - Messaging API (requires approval)

4. **Add to .env**
   ```bash
   LINKEDIN_CLIENT_ID=your_client_id
   LINKEDIN_CLIENT_SECRET=your_client_secret
   LINKEDIN_REDIRECT_URI=http://localhost:3002/api/linkedin/callback
   ```

5. **Authorize Your App**
   - Start the business manager server
   - Visit: `http://localhost:3002/api/linkedin/auth`
   - You'll be redirected to LinkedIn to authorize
   - After authorization, you'll get an access token
   - Add the token to `.env` as `LINKEDIN_ACCESS_TOKEN`

### Option 2: Static Access Token (Limited)

If you already have a LinkedIn access token, you can use it directly:

```bash
LINKEDIN_ACCESS_TOKEN=your_token_here
```

**Limitations:**
- Token expires (usually 60 days)
- May not have messaging permissions
- Requires manual refresh

## LinkedIn API Permissions Explained

### Available Permissions

| Permission | What It Does | Approval Required |
|------------|--------------|-------------------|
| `r_liteprofile` | Get basic profile info | No |
| `r_emailaddress` | Get email address | No |
| `r_messages` | Read/send messages | **Yes** |
| `w_member_social` | Post updates | No |

### Getting `r_messages` Approval

1. **Submit Use Case**
   - Go to your LinkedIn app
   - Request `r_messages` permission
   - Describe your use case (business communication management)
   - Submit for review

2. **LinkedIn Review Process**
   - Can take 2-4 weeks
   - May require additional documentation
   - May require LinkedIn Partner Program

3. **Alternative: Use HubSpot Only**
   - The system works perfectly fine with just HubSpot
   - LinkedIn integration is optional
   - You can add LinkedIn later when approved

## Testing LinkedIn Integration

### Test Profile Access

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.linkedin.com/v2/me
```

### Test Messaging API

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.linkedin.com/v2/messaging/conversations
```

If you get `403 Forbidden`, messaging API is not approved yet.

## Troubleshooting

### "403 Forbidden" Error

**Cause:** `r_messages` permission not approved

**Solution:**
- Use HubSpot only for now
- Or submit app for LinkedIn review
- Or use LinkedIn's web interface manually

### "401 Unauthorized" Error

**Cause:** Access token expired or invalid

**Solution:**
- Re-run OAuth flow to get new token
- Or refresh token if you have refresh token

### "No conversations found"

**Possible causes:**
1. Messaging API not approved
2. No recent messages
3. Token doesn't have messaging permissions

**Solution:**
- Check token permissions in LinkedIn app dashboard
- Verify app approval status
- System will continue working with HubSpot data

## Current Implementation

The system is designed to **gracefully handle LinkedIn API limitations**:

- ✅ Works with HubSpot only (LinkedIn optional)
- ✅ Handles API errors gracefully
- ✅ Logs warnings instead of crashing
- ✅ Continues daily reviews even if LinkedIn fails

## Recommended Approach

1. **Start with HubSpot only** - Get the system working
2. **Set up LinkedIn OAuth** - When ready
3. **Request messaging approval** - Submit app for review
4. **Add LinkedIn gradually** - Once approved

## LinkedIn API Alternatives

If LinkedIn Messaging API is too restrictive, consider:

1. **LinkedIn Sales Navigator API** (if you have Sales Navigator)
2. **LinkedIn Webhooks** (for real-time updates)
3. **Manual Export** - Export LinkedIn messages and import to system
4. **HubSpot LinkedIn Integration** - Use HubSpot's native LinkedIn connector

## Next Steps

1. Set up HubSpot integration first (easier)
2. Test the system with HubSpot data
3. Then add LinkedIn OAuth when ready
4. Submit LinkedIn app for messaging approval
5. Enjoy full integration once approved

The system is designed to work incrementally - you don't need everything at once!


