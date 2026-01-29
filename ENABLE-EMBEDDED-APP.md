# 🔧 Enable Embedded App in Shopify Admin

## Current Issue
The app appears in Shopify admin but shows a broken/empty page because it's not configured as an embedded app.

## Solution: Enable Embedded App Mode

### Step 1: Update Shopify Partners Settings

1. Go to **Shopify Partners Dashboard**: https://partners.shopify.com
2. Find your app: **"BuckyDrop Shipping v3"**
3. Click on it → **"App setup"** tab

### Step 2: Enable Embedded App

1. Find **"Embed app in Shopify admin"** checkbox
2. **✅ Check this box** (enable it)
3. **App URL** should be: `https://web-production-2e179.up.railway.app`
4. Click **"Save"**

### Step 3: Verify App Bridge is Loaded

The embedded app HTML (`embedded-app.html`) includes App Bridge, but Shopify needs to inject the app configuration.

**Important:** When Shopify loads your app in the admin, it will automatically inject:
- Shop domain
- App API key
- Session token (for authenticated requests)

### Step 4: Test in Shopify Admin

1. Go to your Shopify admin
2. Click **"Apps"** → **"BuckyDrop Shipping v3"**
3. The app should now load properly inside the admin interface

---

## What Changed

### Code Changes Made:

1. **`routes/auth.js`**: Changed `isEmbeddedApp: false` → `isEmbeddedApp: true`
2. **`server.js`**: Added logic to detect embedded app requests and serve `embedded-app.html`
3. **`public/embedded-app.html`**: Created embedded app interface with App Bridge support

### How It Works:

- **Standalone mode**: Direct URL access → serves `app.html`
- **Embedded mode**: Access from Shopify admin → serves `embedded-app.html` with App Bridge

---

## Troubleshooting

### App Still Shows Blank Page

1. **Check Shopify Partners settings:**
   - "Embed app in Shopify admin" must be ✅ checked
   - App URL must match Railway URL exactly

2. **Check browser console:**
   - Open DevTools (F12)
   - Look for errors
   - Check if App Bridge is loading

3. **Verify OAuth completed:**
   - App needs to be authenticated
   - Check MongoDB for shop data

### App Loads But Shows Errors

1. **Check Railway logs** for errors
2. **Verify environment variables** are set correctly
3. **Check CORS settings** - should allow Shopify admin domains

---

## After Enabling

Once embedded app is enabled:
- ✅ App loads inside Shopify admin
- ✅ Uses App Bridge for navigation
- ✅ Can access Shopify admin context
- ✅ Better user experience

---

## Next Steps

After enabling embedded app:
1. Test the app in Shopify admin
2. Verify carrier service status shows correctly
3. Test enabling/disabling carrier service
4. Check that rates still work at checkout

