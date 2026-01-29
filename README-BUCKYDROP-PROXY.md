# BuckyDrop Shipping Rate Proxy

This proxy service solves the IP whitelisting problem when calling BuckyDrop API from Google Apps Script. Since Google Apps Script uses dynamic IP addresses that change frequently, you cannot whitelist them directly with BuckyDrop. This proxy runs on a server with a fixed IP address that can be whitelisted.

## How It Works

1. **Google Apps Script** → Calls your proxy server (fixed IP)
2. **Proxy Server** → Handles HMAC authentication and calls BuckyDrop API
3. **BuckyDrop API** → Returns shipping rates
4. **Proxy Server** → Formats and returns results to Google Apps Script

## Setup Instructions

### Step 1: Deploy the Proxy Server

#### Option A: Deploy to a Cloud Service (Recommended)

Deploy this Node.js application to a service with a fixed IP:

- **Heroku**: Free tier available, but IP changes. Use a paid dyno or addon for static IP
- **AWS EC2**: Launch an instance and assign an Elastic IP
- **DigitalOcean**: Create a droplet and assign a reserved IP
- **Google Cloud Run**: Use Cloud Run with a static IP (requires VPC connector)
- **Railway/Render**: Deploy and get a static IP

#### Option B: Use ngrok for Testing (Development Only)

For local testing, you can use ngrok:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start your server
npm start

# In another terminal, start ngrok
ngrok http 3001

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this URL in your Google Apps Script PROXY_URL
```

**Note**: ngrok URLs change each time you restart, so this is only for testing.

### Step 2: Configure Environment Variables

Create a `.env` file or set environment variables on your hosting platform:

```bash
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481
PORT=3001
NODE_ENV=production
```

### Step 3: Get Your Server's IP Address

Once deployed, get your server's public IP address:

1. Visit: `https://your-server.com/api/buckydrop/ip`
2. Or use: `curl https://your-server.com/api/buckydrop/ip`
3. The response will show your `publicIp` - this is what you need to whitelist

Example response:
```json
{
  "clientIp": "123.456.789.0",
  "publicIp": "203.0.113.42",
  "note": "Add the publicIp to your BuckyDrop IP whitelist"
}
```

### Step 4: Whitelist IP with BuckyDrop

1. Log into your BuckyDrop account
2. Navigate to API settings / Address Configuration
3. Add your server's public IP address to the whitelist
4. Save the configuration

### Step 5: Update Google Apps Script

1. Open your Google Sheet
2. Go to **Extensions** → **Apps Script**
3. Replace the existing code with the contents of `google-apps-script-buckydrop-proxy.gs`
4. Update the `PROXY_URL` in the CONFIG section:

```javascript
const CONFIG = {
  PROXY_URL: "https://your-server.com/api/buckydrop/shipping-rates",
  // ... rest of config
};
```

5. Save and run the script

## API Endpoints

### POST `/api/buckydrop/shipping-rates`

Main endpoint for getting shipping rates.

**Request Body:**
```json
{
  "destination": {
    "lang": "en",
    "country": "Australia",
    "countryCode": "AU",
    "provinceCode": "VIC",
    "province": "Victoria",
    "detailAddress": "18 Joan St Moorabbin",
    "postCode": "3189"
  },
  "productList": [
    {
      "length": 10.5,
      "width": 10.5,
      "height": 15.2,
      "weight": 1.234,
      "count": 1,
      "categoryCode": "other"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "rates": "Service Name (5-7 days): ¥123.45 | Another Service (3-5 days): ¥98.76",
  "rawData": {
    "success": true,
    "data": {
      "records": [...]
    }
  }
}
```

### GET `/api/buckydrop/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "BuckyDrop Proxy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET `/api/buckydrop/ip`

Returns the server's public IP address for whitelisting.

**Response:**
```json
{
  "clientIp": "123.456.789.0",
  "publicIp": "203.0.113.42",
  "headers": {
    "x-forwarded-for": "...",
    "x-real-ip": "..."
  },
  "note": "Add the publicIp to your BuckyDrop IP whitelist"
}
```

## Testing

### Test the Proxy Locally

```bash
# Start the server
npm start

# Test the health endpoint
curl http://localhost:3001/api/buckydrop/health

# Test shipping rates (replace with your actual data)
curl -X POST http://localhost:3001/api/buckydrop/shipping-rates \
  -H "Content-Type: application/json" \
  -d '{
    "destination": {
      "lang": "en",
      "country": "Australia",
      "countryCode": "AU",
      "provinceCode": "VIC",
      "province": "Victoria",
      "detailAddress": "18 Joan St Moorabbin",
      "postCode": "3189"
    },
    "productList": [{
      "length": 10.5,
      "width": 10.5,
      "height": 15.2,
      "weight": 1.234,
      "count": 1,
      "categoryCode": "other"
    }]
  }'
```

### Test from Google Apps Script

1. Update the `PROXY_URL` in your Google Apps Script
2. Run the `calculateBuckyDropRates()` function
3. Check the "Debug Log" sheet for detailed logs

## Troubleshooting

### Error: "Network failed"

- Check that your proxy server is running and accessible
- Verify the `PROXY_URL` in Google Apps Script is correct
- Check firewall rules allow incoming connections

### Error: "BuckyDrop Error: appCode 不能为空"

- Your server's IP is not whitelisted with BuckyDrop
- Get your IP using `/api/buckydrop/ip` endpoint
- Add it to BuckyDrop's IP whitelist

### Error: "HTTP Code 500"

- Check server logs for detailed error messages
- Verify `BUCKY_DROP_APPCODE` and `BUCKY_DROP_APPSECRET` are set correctly
- Check that the request body format matches BuckyDrop's requirements

### Rates not appearing

- Check the "Debug Log" sheet in Google Sheets
- Verify product dimensions and weights are valid
- Check that category codes are correct
- Review the `rawData` in the API response for more details

## Security Considerations

1. **API Keys**: Never commit your `BUCKY_DROP_APPSECRET` to version control
2. **HTTPS**: Always use HTTPS in production
3. **Rate Limiting**: Consider adding rate limiting to prevent abuse
4. **Authentication**: Consider adding API key authentication to your proxy endpoints
5. **CORS**: The proxy currently allows all origins - restrict in production if needed

## Deployment Examples

### Heroku

```bash
# Install Heroku CLI
heroku create your-app-name

# Set environment variables
heroku config:set BUCKY_DROP_APPCODE=your_appcode
heroku config:set BUCKY_DROP_APPSECRET=your_secret

# Deploy
git push heroku main

# Get your app URL
heroku info
# Use: https://your-app-name.herokuapp.com/api/buckydrop/shipping-rates
```

### AWS EC2

1. Launch an EC2 instance
2. Assign an Elastic IP
3. Install Node.js and PM2
4. Clone and deploy your code
5. Set environment variables
6. Start with PM2: `pm2 start server.js --name buckydrop-proxy`
7. Configure nginx as reverse proxy (optional)

### DigitalOcean

1. Create a droplet
2. Reserve a static IP
3. Install Node.js
4. Deploy your application
5. Use PM2 or systemd to keep it running

## Support

For issues or questions:
1. Check the "Debug Log" sheet in Google Sheets
2. Review server logs
3. Test the `/api/buckydrop/health` endpoint
4. Verify IP whitelisting with BuckyDrop


