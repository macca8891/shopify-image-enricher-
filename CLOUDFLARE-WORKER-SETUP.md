# Cloudflare Worker Setup - Complete! ✅

You've already deployed your proxy to Cloudflare Workers! Here's what's set up and what to do next.

## ✅ What You Have

- **Cloudflare Worker URL**: `https://spm-shipping-rates.mpmchugh91.workers.dev`
- **Worker Code**: Handles HMAC authentication and proxies to BuckyDrop
- **Google Apps Script**: Updated to use your Cloudflare Worker

## 📋 Next Steps

### 1. Update Google Apps Script

The Google Apps Script file (`google-apps-script-buckydrop-proxy.gs`) is already updated with your Cloudflare Worker URL. Just:

1. Open your Google Sheet
2. Go to **Extensions** → **Apps Script**
3. Copy the entire contents of `google-apps-script-buckydrop-proxy.gs`
4. Paste it into your Apps Script editor
5. Save (Ctrl+S or Cmd+S)

### 2. Whitelist Cloudflare IPs with BuckyDrop

Cloudflare Workers run on Cloudflare's network. You need to whitelist Cloudflare's IP ranges with BuckyDrop.

**Add these IP ranges to BuckyDrop's whitelist:**

```
173.245.48.0/20
103.21.244.0/22
103.22.200.0/22
103.31.4.0/22
141.101.64.0/18
108.162.192.0/18
190.93.240.0/20
188.114.96.0/20
197.234.240.0/22
198.41.128.0/17
162.158.0.0/15
104.16.0.0/13
104.24.0.0/14
172.64.0.0/13
131.0.72.0/22
```

**Steps:**
1. Log into your BuckyDrop account
2. Navigate to **API Settings** → **Address Configuration** (IP Whitelist)
3. Add each IP range above (see `CLOUDFLARE-IP-RANGES.txt` for easy copy-paste)
4. Save the configuration

**Note:** If BuckyDrop's interface requires a different format (comma-separated, etc.), see `CLOUDFLARE-IP-RANGES-COMMA.txt` for alternative formats.

### 3. Test It!

1. In Google Sheets, go to **SPM Tools** → **Calculate Shipping Rates**
2. Check the "Debug Log" sheet for any errors
3. If you see IP whitelisting errors, make sure Cloudflare IPs are whitelisted

## 🔍 How It Works Now

```
Google Apps Script 
    ↓ (calls)
Cloudflare Worker (https://spm-shipping-rates.mpmchugh91.workers.dev)
    ↓ (handles HMAC auth, calls with Cloudflare IPs)
BuckyDrop API
    ↓ (returns rates)
Cloudflare Worker
    ↓ (returns raw response)
Google Apps Script
    ↓ (formats for display)
Google Sheets (Column AT)
```

## 🐛 Troubleshooting

### Error: "appCode 不能为空" or IP whitelisting errors

**Solution**: Whitelist Cloudflare IP ranges with BuckyDrop
- Get IP ranges from: https://www.cloudflare.com/ips-v4
- Add them to BuckyDrop's IP whitelist settings

### Error: "Method Not Allowed"

**Check**: Make sure Google Apps Script is sending POST requests (it should be)

### Error: "Failed to parse API response"

**Check**: Look at the "Debug Log" sheet to see the raw response
- The Cloudflare Worker returns BuckyDrop's raw response
- If BuckyDrop returns an error, you'll see it in the debug log

### No rates found

**Check**:
1. Product dimensions are valid (weight, height, diameter)
2. Category code is correct
3. Destination address is valid
4. Check the debug log for BuckyDrop's response

## 📝 Cloudflare Worker Code

Your Cloudflare Worker is already set up correctly! It:
- ✅ Handles POST requests
- ✅ Generates HMAC-SHA256 signatures
- ✅ Sorts JSON canonically
- ✅ Proxies to BuckyDrop API
- ✅ Returns raw BuckyDrop response

## 🎯 Testing the Worker Directly

You can test your Cloudflare Worker directly:

```bash
curl -X POST https://spm-shipping-rates.mpmchugh91.workers.dev \
  -H "Content-Type: application/json" \
  -d '{
    "lang": "en",
    "country": "Australia",
    "countryCode": "AU",
    "provinceCode": "VIC",
    "province": "Victoria",
    "detailAddress": "18 Joan St Moorabbin",
    "postCode": "3189",
    "productList": [{
      "length": 10.5,
      "width": 10.5,
      "height": 15.2,
      "weight": 1.234,
      "count": 1,
      "categoryCode": "other"
    }],
    "size": 10,
    "current": 1,
    "orderBy": "price",
    "orderType": "asc"
  }'
```

If this works, your worker is fine - you just need to whitelist Cloudflare IPs with BuckyDrop.

## ✅ You're All Set!

1. ✅ Cloudflare Worker deployed
2. ✅ Google Apps Script updated
3. ⏳ Whitelist Cloudflare IPs with BuckyDrop
4. ⏳ Test from Google Sheets

Once you whitelist the IPs, everything should work!

