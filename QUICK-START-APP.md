# ⚡ Quick Start - BuckyDrop Shipping App

## Your Setup
- **Shop**: spare-part-mart.myshopify.com  
- **App Name**: BuckyDrop Shipping
- **Partner Email**: sparepartmartsales@gmail.com

---

## 🚀 Step-by-Step Setup (5 minutes)

### 1. Start Your Server

```bash
cd /Users/michaelmchugh/shopify-image-enricher
npm start
```

Keep this terminal running. Server should start on port 3001.

### 2. Start ngrok (New Terminal)

Open a **new terminal window** and run:

```bash
cd /Users/michaelmchugh/shopify-image-enricher
./start-ngrok.sh
```

Or manually:
```bash
ngrok http 3001
```

**Copy the HTTPS URL** - it will look like:
```
https://abc123.ngrok-free.app
```

⚠️ **Keep ngrok running** - if you close it, you'll need to update URLs!

### 3. Create Shopify App

1. **Go to**: [partners.shopify.com](https://partners.shopify.com)
2. **Log in** with: sparepartmartsales@gmail.com
3. **Click**: Apps → Create app → **Custom app**
4. **Fill in**:
   - **App name**: `BuckyDrop Shipping`
   - **App URL**: `https://abc123.ngrok-free.app` ← Use your ngrok URL
   - **Allowed redirection URLs**: 
     ```
     https://abc123.ngrok-free.app/api/auth/shopify/callback
     ```
5. **Click**: Configure → **Scopes**
6. **Add these scopes**:
   - ✅ `read_products`
   - ✅ `write_products`
   - ✅ `read_orders` ⚠️ REQUIRED for carrier services
   - ✅ `read_shipping`
   - ✅ `write_shipping`
   - ✅ `read_files`
   - ✅ `write_files`
7. **Click**: Save
8. **Go to**: API credentials tab
9. **Copy**:
   - **Client ID** (this is your API Key)
   - **Client secret** (this is your API Secret)

### 4. Update .env File

Create or update `.env` file in the project root:

```env
# Shopify App Configuration
SHOPIFY_API_KEY=your_client_id_from_step_3
SHOPIFY_API_SECRET=your_client_secret_from_step_3
SHOPIFY_APP_URL=https://abc123.ngrok-free.app
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping,read_files,write_files

# MongoDB
MONGODB_URI=mongodb://localhost:27017/shopify-image-enricher

# BuckyDrop API
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481

# Server
PORT=3001
NODE_ENV=development
SESSION_SECRET=your_random_secret_here
```

**Replace**:
- `your_client_id_from_step_3` with your actual Client ID
- `your_client_secret_from_step_3` with your actual Client Secret  
- `abc123.ngrok-free.app` with your actual ngrok URL

### 5. Restart Your Server

Stop the server (Ctrl+C) and restart:

```bash
npm start
```

### 6. Install the App to Your Store

Visit this URL in your browser (replace with your ngrok URL):

```
https://abc123.ngrok-free.app/?shop=spare-part-mart.myshopify.com
```

You'll be redirected to Shopify to authorize the app. Click **Install**.

### 7. Enable Carrier Service

1. **Go to**: Your shipping rates page
2. **Click**: "Enable Carrier Service" button
3. **Check browser console** (F12) for success message
4. **Go to**: Shopify Admin → Settings → Shipping & delivery
5. **Click**: "Manage rates" for your shipping zone
6. **Click**: "Add rate" → "Use carrier or app to calculate rates"
7. **Look for**: "BuckyDrop Shipping" in the dropdown! 🎉

---

## ✅ Verification Checklist

- [ ] Server running on port 3001
- [ ] ngrok running and showing HTTPS URL
- [ ] Shopify app created in Partners dashboard
- [ ] App URL set to ngrok HTTPS URL
- [ ] Redirect URL configured correctly
- [ ] All scopes added (especially `read_orders`)
- [ ] API credentials copied to .env
- [ ] Server restarted with new .env values
- [ ] App installed via OAuth URL
- [ ] Carrier service enabled via button
- [ ] BuckyDrop Shipping appears in Shopify shipping settings

---

## 🐛 Troubleshooting

### "Carrier service not showing"
- Make sure Carrier Calculated Shipping is enabled in Shopify
- Requires Shopify Grow plan or higher
- Check that `read_orders` scope is added
- Verify callback URL is HTTPS (not HTTP)

### "ngrok URL changed"
- Free ngrok URLs change on restart
- Update `SHOPIFY_APP_URL` in .env
- Update App URL in Shopify Partners dashboard
- Restart server

### "Authentication failed"
- Check API key and secret are correct
- Verify redirect URLs match exactly
- Make sure server is running
- Check ngrok is still active

---

## 📞 Need Help?

Check the browser console (F12) and server logs for error messages.

