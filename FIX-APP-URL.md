# 🔧 Fix "App URL is Invalid" Error

## The Problem
Shopify validates that your App URL is accessible. If your server isn't running or ngrok isn't active, Shopify will reject the URL.

## ✅ Solution - Follow These Steps in Order

### Step 1: Start Your Server

Open Terminal 1:
```bash
cd /Users/michaelmchugh/shopify-image-enricher
npm start
```

Wait until you see:
```
🚀 Shopify Image Enricher running on port 3001
```

**Keep this terminal open!**

### Step 2: Start ngrok

Open Terminal 2 (new terminal window):
```bash
cd /Users/michaelmchugh/shopify-image-enricher
ngrok http 3001
```

You should see:
```
Forwarding  https://abc123.ngrok-free.app -> http://localhost:3001
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok-free.app`)

**Keep this terminal open too!**

### Step 3: Test the URL

Open a browser and visit:
```
https://abc123.ngrok-free.app
```

You should see your app's homepage. If you see an error or "site can't be reached", ngrok isn't working properly.

### Step 4: Create Shopify App (Now that URL is accessible)

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Log in with: sparepartmartsales@gmail.com
3. Click **Apps** → **Create app** → **Custom app**
4. Fill in:
   - **App name**: `BuckyDrop Shipping`
   - **App URL**: `https://abc123.ngrok-free.app` ← Use your ngrok URL (NO trailing slash!)
   - **Allowed redirection URLs**: 
     ```
     https://abc123.ngrok-free.app/api/auth/shopify/callback
     ```
     (Make sure this matches exactly - no trailing slash)

5. Click **Save** (don't configure scopes yet - just save the URL first)

### Step 5: Verify URL Format

The URL must:
- ✅ Start with `https://` (not `http://`)
- ✅ Be publicly accessible (not `localhost`)
- ✅ Have NO trailing slash (`/`)
- ✅ Be reachable when Shopify checks it

### Step 6: If Still Getting Error

Try these:

1. **Check ngrok is still running** - if you closed it, restart it
2. **Verify server is running** - check Terminal 1
3. **Test URL in browser** - should load your app
4. **Check for typos** - copy/paste the URL, don't type it
5. **Try ngrok web interface** - visit `http://127.0.0.1:4040` to see ngrok status

### Common Mistakes

❌ **Wrong**: `http://localhost:3001`
❌ **Wrong**: `https://abc123.ngrok-free.app/` (trailing slash)
❌ **Wrong**: `https://abc123.ngrok.io` (wrong domain)
✅ **Correct**: `https://abc123.ngrok-free.app`

---

## 🎯 Quick Checklist

Before creating the app in Shopify:
- [ ] Server is running (`npm start`)
- [ ] ngrok is running (`ngrok http 3001`)
- [ ] You can visit the ngrok URL in browser and see your app
- [ ] URL starts with `https://`
- [ ] URL has NO trailing slash
- [ ] Both terminals are still open

Once all checked, try creating the app again!

