# Simple Explanation - What's Happening Here

## The Problem (What You Told Me)

Your Google Apps Script is trying to call BuckyDrop API, but it keeps failing because:
- Google Apps Script runs on Google's servers
- Those servers have IP addresses that change all the time
- BuckyDrop requires you to whitelist specific IP addresses
- You can't whitelist Google's IPs because they keep changing

## The Solution (What I Built)

I created a **middleman server** (called a "proxy") that:

1. **Runs on YOUR server** (with a fixed IP address)
2. **Receives requests** from your Google Apps Script
3. **Calls BuckyDrop** on your behalf (using the fixed IP)
4. **Returns the results** back to Google Apps Script

```
Google Apps Script → Your Proxy Server → BuckyDrop API
     (dynamic IP)      (fixed IP ✅)      (whitelisted)
```

## What I Actually Built

### 1. The Proxy Server Code
- `services/BuckyDropService.js` - Does the actual work of calling BuckyDrop
- `routes/buckydrop.js` - The web endpoint your Google Apps Script will call
- Updated `server.js` - Added the new route

### 2. Updated Google Apps Script
- `google-apps-script-buckydrop-proxy.gs` - Your new script that calls the proxy instead of BuckyDrop directly

### 3. Deployment Files
- Docker, PM2, Heroku configs - Different ways to run the server

## What You Need To Do (3 Steps)

### Step 1: Put the Server Somewhere with a Fixed IP

You need to run this code on a server that has a **fixed IP address**. Options:

**Easiest Options:**
- **Railway.app** (free tier, very easy)
- **Render.com** (free tier, very easy)
- **Heroku** (free tier, but need addon for static IP)

**More Control:**
- **AWS EC2** (you get a fixed IP called "Elastic IP")
- **DigitalOcean** (you reserve a static IP)

### Step 2: Get Your Server's IP Address

Once your server is running, you'll get an IP address like `203.0.113.42`

### Step 3: Tell BuckyDrop About That IP

Go to BuckyDrop's settings and add that IP address to their whitelist.

## The Flow (After Setup)

1. You run the script in Google Sheets
2. Google Apps Script calls: `https://your-server.com/api/buckydrop/shipping-rates`
3. Your server calls BuckyDrop (using the whitelisted IP)
4. BuckyDrop returns shipping rates
5. Your server sends rates back to Google Apps Script
6. Google Sheets shows the rates

## What's Confusing You?

Let me know what part is unclear:
- [ ] How to deploy the server?
- [ ] Where to get a server?
- [ ] How the code works?
- [ ] What files to use?
- [ ] Something else?

## Quick Test (See It Work Locally)

Want to see it work on your computer first?

```bash
# 1. Create a .env file
cat > .env << EOF
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481
PORT=3001
EOF

# 2. Start the server
npm start

# 3. In another terminal, test it
curl http://localhost:3001/api/buckydrop/health
```

This will show you it's working, but you still need to deploy it somewhere with a fixed IP for BuckyDrop to accept it.


