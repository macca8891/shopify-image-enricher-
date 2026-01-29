# 🔧 Fix MongoDB Connection Issue

## Problem
OAuth is working, but MongoDB isn't connected, so shop data can't be saved. Error: "Operation `shops.findOneAndUpdate()` buffering timed out after 10000ms"

## Steps to Fix

### 1. Check Railway Logs
In Railway → "web" → "Logs", look for:
- ✅ "Connected to MongoDB" = Success
- ❌ "MongoDB connection error" = Failure
- ⚠️ "MONGODB_URI not set" = Variable not configured

### 2. Verify MongoDB Atlas Network Access

1. Go to **MongoDB Atlas** → Your cluster
2. Click **"Network Access"** (left sidebar)
3. Make sure there's an entry for **"0.0.0.0/0"** (Allow from anywhere)
4. If not, click **"Add IP Address"** → **"Allow Access from Anywhere"**

### 3. Verify MongoDB Connection String

In Railway → "Variables" → `MONGODB_URI`, it should be:
```
mongodb+srv://shopify-app:macca.6576@cluster0.xgqh0d8.mongodb.net/shopify-image-enricher?appName=Clustero
```

**Check:**
- ✅ Includes `/shopify-image-enricher` before the `?`
- ✅ Password is correct (`macca.6576`)
- ✅ No quotes around the value
- ✅ No extra spaces

### 4. Test MongoDB Connection

You can test if MongoDB is reachable from Railway by checking the logs after deployment. Look for:
- "✅ Connected to MongoDB" = Working
- "❌ MongoDB connection error" = Check network access and connection string

### 5. Common Issues

**Issue:** "MongoDB connection error: getaddrinfo ENOTFOUND"
- **Fix:** Check the connection string is correct

**Issue:** "MongoDB connection error: Authentication failed"
- **Fix:** Verify password in connection string matches MongoDB Atlas database user password

**Issue:** "MongoDB connection error: IP not whitelisted"
- **Fix:** Add `0.0.0.0/0` to MongoDB Atlas Network Access

**Issue:** Connection times out
- **Fix:** Check MongoDB Atlas cluster is running (not paused)

### 6. After Fixing

1. Redeploy in Railway (or wait for auto-deploy)
2. Check logs for "✅ Connected to MongoDB"
3. Try OAuth again: `https://web-production-2e179.up.railway.app/api/auth/shopify?shop=spare-part-mart.myshopify.com`

