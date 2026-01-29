# 🆓 Free Production Deployment Options

## ✅ Best Free Options (2024)

### 1. **Railway** ⭐ RECOMMENDED
**Free Tier:**
- $5 credit/month (enough for small apps)
- Auto-deploys from GitHub
- HTTPS included
- MongoDB add-on available
- **Cost:** FREE (up to $5/month usage)

**Setup:**
1. Sign up: https://railway.app
2. Connect GitHub repo
3. Add MongoDB service
4. Set environment variables
5. Deploy!

**Limitations:**
- $5 credit/month (usually enough for low traffic)
- May need to upgrade if traffic grows

---

### 2. **Render** 
**Free Tier:**
- Free web service (sleeps after 15min inactivity)
- Free PostgreSQL (can use MongoDB Atlas instead)
- HTTPS included
- **Cost:** FREE

**Setup:**
1. Sign up: https://render.com
2. Connect GitHub repo
3. Choose "Web Service"
4. Set build/start commands
5. Deploy!

**Limitations:**
- ⚠️ **Sleeps after 15min inactivity** (wakes on first request - 30-60s delay)
- Not ideal for production (customers will experience delays)
- Good for testing/development

---

### 3. **Fly.io**
**Free Tier:**
- 3 shared-cpu VMs free
- 3GB persistent storage
- HTTPS included
- **Cost:** FREE

**Setup:**
1. Sign up: https://fly.io
2. Install flyctl CLI
3. Run `fly launch`
4. Deploy!

**Limitations:**
- More complex setup
- Shared resources (may be slower)

---

### 4. **MongoDB Atlas** (Database Only)
**Free Tier:**
- 512MB storage
- Shared cluster
- **Cost:** FREE forever

**Use with:** Railway, Render, Fly.io, or any hosting

**Setup:**
1. Sign up: https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Get connection string
4. Use in your app

---

## 🎯 Recommended Free Setup

### Option A: Railway + MongoDB Atlas (Best)
```
Railway (app) → FREE ($5 credit/month)
MongoDB Atlas (database) → FREE
Total: $0/month ✅
```

**Pros:**
- ✅ No sleep (always on)
- ✅ Auto-deploys
- ✅ Easy setup
- ✅ HTTPS included

**Cons:**
- ⚠️ Limited to $5/month credit (usually enough)

---

### Option B: Render + MongoDB Atlas (Budget)
```
Render (app) → FREE (sleeps after inactivity)
MongoDB Atlas (database) → FREE
Total: $0/month ✅
```

**Pros:**
- ✅ Completely free
- ✅ Easy setup

**Cons:**
- ⚠️ Sleeps after 15min (30-60s wake delay)
- ⚠️ Not ideal for production (customers see delays)

---

## 📋 Quick Setup Guide (Railway - Recommended)

### Step 1: Prepare Your Code

Make sure you have:
- ✅ `package.json` with start script
- ✅ `.env.example` file (for reference)
- ✅ Code pushed to GitHub

### Step 2: Deploy to Railway

1. **Sign up:** https://railway.app (use GitHub login)

2. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add MongoDB:**
   - Click "+ New" → "Database" → "MongoDB"
   - Railway will create MongoDB instance
   - Copy connection string (auto-set as `MONGO_URL`)

4. **Set Environment Variables:**
   - Go to your service → "Variables"
   - Add these:
     ```
     PORT=3001
     NODE_ENV=production
     MONGODB_URI=${{MongoDB.MONGO_URL}}
     SHOPIFY_API_KEY=your_key
     SHOPIFY_API_SECRET=your_secret
     SHOPIFY_APP_URL=https://your-app.railway.app
     BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
     BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481
     ```

5. **Deploy:**
   - Railway auto-deploys on push
   - Or click "Deploy" manually
   - Get your URL: `https://your-app.railway.app`

6. **Update Shopify:**
   - Update app URL in Shopify Partners Dashboard
   - Update redirect URL
   - Re-authenticate if needed

---

## 💰 Cost Comparison

| Platform | Free Tier | Always On? | Best For |
|----------|-----------|------------|----------|
| **Railway** | $5 credit/month | ✅ Yes | Production |
| **Render** | Free | ⚠️ Sleeps | Testing |
| **Fly.io** | 3 VMs free | ✅ Yes | Production |
| **MongoDB Atlas** | 512MB free | ✅ Yes | All |

---

## ⚠️ Important Notes

### Shopify Requirements:
- ✅ **HTTPS required** (all platforms provide this)
- ✅ **Public URL required** (all platforms provide this)
- ✅ **24/7 availability** (Railway/Fly.io provide this)

### Free Tier Limitations:
- **Railway:** $5/month credit (usually enough for low-medium traffic)
- **Render:** Sleeps after inactivity (not ideal for production)
- **Fly.io:** Shared resources (may be slower)

---

## 🚀 Migration from Local Setup

1. **Push code to GitHub** (if not already)
2. **Deploy to Railway** (follow steps above)
3. **Update Shopify app URL** to Railway URL
4. **Test at checkout** - rates should work!

---

## 📊 Monitoring Free Tier Usage

### Railway:
- Dashboard shows credit usage
- Get alerts when approaching limit
- Upgrade if needed ($5-20/month)

### Render:
- Check "Metrics" tab
- Monitor wake times
- Consider upgrading to paid ($7/month) for always-on

---

## 🎯 Recommendation

**For production:** Use **Railway** ($5 credit/month = effectively free for low traffic)

**For testing:** Use **Render** (completely free, but sleeps)

**Database:** Always use **MongoDB Atlas** (free tier is generous)

---

## Need Help?

See `PRODUCTION-DEPLOYMENT.md` for detailed deployment steps.

