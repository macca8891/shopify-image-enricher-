# Setup GitHub Repository & Deploy

You have two options: **Push to GitHub** (recommended) or **Deploy directly** (faster).

## Option 1: Push to GitHub (Recommended)

### Step 1: Initialize Git

```bash
cd /Users/michaelmchugh/shopify-image-enricher
git init
git add .
git commit -m "Initial commit - BuckyDrop proxy service"
```

### Step 2: Create GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click **"New repository"** (green button)
3. Name it: `buckydrop-proxy` (or any name you like)
4. **Don't** initialize with README (we already have files)
5. Click **"Create repository"**

### Step 3: Push to GitHub

GitHub will show you commands. Run these (replace `YOUR_USERNAME` with your GitHub username):

```bash
git remote add origin https://github.com/YOUR_USERNAME/buckydrop-proxy.git
git branch -M main
git push -u origin main
```

### Step 4: Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Sign up/login
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Authorize Railway to access GitHub
5. Select your `buckydrop-proxy` repository
6. Railway will auto-deploy!

---

## Option 2: Deploy Directly (No GitHub Needed)

Railway also supports direct deployment without GitHub.

### Method A: Railway CLI

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Initialize project:
   ```bash
   cd /Users/michaelmchugh/shopify-image-enricher
   railway init
   ```

4. Deploy:
   ```bash
   railway up
   ```

### Method B: Railway Dashboard (Upload)

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Empty Project"**
4. Click **"Deploy Now"**
5. In the project, go to **Settings** → **Source**
6. You can connect via:
   - **GitHub** (if you set it up)
   - **Railway CLI** (see Method A above)

---

## Option 3: Use Render.com (Also Easy)

Render.com also supports direct deployment:

1. Go to [render.com](https://render.com)
2. Sign up
3. Click **"New"** → **"Web Service"**
4. Connect GitHub (if you set it up) OR use **"Public Git repository"**
5. Or use **"Manual Deploy"** and upload files

---

## Quickest Path (5 minutes)

**If you want the fastest option:**

1. **Initialize git locally:**
   ```bash
   cd /Users/michaelmchugh/shopify-image-enricher
   git init
   git add .
   git commit -m "BuckyDrop proxy"
   ```

2. **Create GitHub repo** (don't initialize with README)

3. **Push:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/buckydrop-proxy.git
   git push -u origin main
   ```

4. **Deploy to Railway:**
   - Go to railway.app
   - New Project → Deploy from GitHub
   - Select your repo
   - Done!

---

## What Files to Include

The `.gitignore` file is already set up to exclude:
- `node_modules/` (will be installed on Railway)
- `.env` (set as environment variables on Railway)
- `uploads/` (not needed for proxy)
- Logs (not needed)

Railway will automatically:
- Install dependencies (`npm install`)
- Start the server (`npm start`)

---

## After Deployment

1. Add environment variables in Railway:
   - `BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea`
   - `BUCKY_DROP_APPSECRET=8d8e3c046d6bf420b5999899786d8481`
   - `PORT=3001`
   - `NODE_ENV=production`

2. Get your URL from Railway

3. Put URL in BuckyDrop's "Public IP Address" field

4. Update Google Apps Script with the URL

Done! ✅


