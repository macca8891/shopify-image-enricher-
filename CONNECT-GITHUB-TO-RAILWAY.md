# 🔗 Connect GitHub to Railway

## Step 1: Configure GitHub App

1. **Click "Configure GitHub App"** button (the one with the gear icon)
2. You'll be redirected to GitHub
3. GitHub will ask you to authorize Railway

---

## Step 2: Authorize Railway on GitHub

1. **Select repositories:**
   - Choose **"All repositories"** (recommended)
   - OR select specific repositories (including `shopify-image-enricher`)
2. Click **"Install"** or **"Authorize"**
3. GitHub will redirect you back to Railway

---

## Step 3: Deploy Your Repository

1. **Back in Railway**, you should now see your repositories
2. **Search for:** `shopify-image-enricher` (or your repo name)
3. **Click on it** to select
4. Railway will start deploying automatically

---

## If You Still Don't See Repositories

**Check:**
1. ✅ Are you logged into GitHub with the correct account?
2. ✅ Is your code pushed to GitHub? (not just local)
3. ✅ Did you authorize Railway to access repositories?

**To verify your code is on GitHub:**
- Go to: https://github.com/your-username/shopify-image-enricher
- Make sure the repository exists and has code

**If repository doesn't exist on GitHub:**
```bash
# In your terminal, make sure you're in the project directory
cd /Users/michaelmchugh/shopify-image-enricher

# Check if you have a git remote
git remote -v

# If no remote, add GitHub remote and push:
git remote add origin https://github.com/your-username/shopify-image-enricher.git
git push -u origin main
```

---

## After Authorization

Once Railway is connected:
1. Your repositories will appear
2. Select `shopify-image-enricher`
3. Railway will auto-detect Node.js
4. Click **"Deploy"**
5. Wait 2-5 minutes
6. Get your URL from Settings → Networking → Domains

