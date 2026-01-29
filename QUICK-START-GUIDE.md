# ⚡ Quick Start Guide - 5 Minutes to Get Running

Get the Shopify Image Enricher up and running in just 5 minutes!

## 🎯 Prerequisites Checklist

Make sure you have these installed:
- [ ] Node.js 16+ ([download here](https://nodejs.org/))
- [ ] MongoDB ([download here](https://www.mongodb.com/try/download/community))
- [ ] Git

## 🚀 Setup in 5 Steps

### Step 1: Clone & Install (2 minutes)

```bash
# Clone the repository
git clone <your-repo-url>
cd shopify-image-enricher

# Install all dependencies
npm run setup
```

### Step 2: Start MongoDB (30 seconds)

```bash
# macOS
brew services start mongodb-community

# Windows - MongoDB should auto-start after installation

# Linux
sudo systemctl start mongodb
```

### Step 3: Create Environment File (1 minute)

Create a file named `.env` in the project root:

```env
# Minimum required configuration for testing
PORT=3001
NODE_ENV=development
SESSION_SECRET=my_secret_key_12345

# Database
MONGODB_URI=mongodb://localhost:27017/shopify-image-enricher

# Shopify (get these from partners.shopify.com)
SHOPIFY_API_KEY=your_key_here
SHOPIFY_API_SECRET=your_secret_here
SHOPIFY_APP_URL=http://localhost:3001
SHOPIFY_SCOPES=read_products,write_products,read_files,write_files

# AI Services (optional - add later for full features)
# GOOGLE_API_KEY=your_key
# GOOGLE_SEARCH_ENGINE_ID=your_id
# GOOGLE_VISION_API_KEY=your_key
# OPENAI_API_KEY=your_key
# REMOVE_BG_API_KEY=your_key
```

### Step 4: Start the Server (30 seconds)

```bash
npm run dev
```

You should see:
```
🚀 Shopify Image Enricher running on port 3001
Connected to MongoDB
🖼️ Ready to enrich product images!
```

### Step 5: Open Dashboard (30 seconds)

Open your browser and go to:
```
http://localhost:3001/dashboard.html
```

You should see the beautiful dashboard! 🎉

## 🧪 Test in Demo Mode

The app works in demo mode without Shopify credentials:

1. Visit `http://localhost:3001/dashboard.html`
2. The app will run in **demo mode** with sample data
3. Click around and explore the interface

## 🔑 Connect to Shopify (Optional)

To actually import and process products:

### 1. Create Shopify Partner Account
   - Go to [partners.shopify.com](https://partners.shopify.com)
   - Sign up (it's free!)

### 2. Create an App
   - Click "Apps" → "Create app" → "Public app"
   - **App name**: Shopify Image Enricher
   - **App URL**: `http://localhost:3001`
   - **Redirect URL**: `http://localhost:3001/api/auth/shopify/callback`

### 3. Get API Credentials
   - Copy **API key** → paste into `.env` as `SHOPIFY_API_KEY`
   - Copy **API secret** → paste into `.env` as `SHOPIFY_API_SECRET`
   - Restart server: `npm run dev`

### 4. Connect Your Store
   - Visit: `http://localhost:3001/?shop=your-store.myshopify.com`
   - Complete OAuth flow
   - You're connected! 🎉

## 🤖 Enable AI Features (Optional)

Add these services for full functionality:

### Google Cloud (Vision + Search)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable Vision API & Custom Search API
3. Create API key → Add to `.env`
4. Create Custom Search Engine → Add ID to `.env`

### OpenAI (Smart Search Terms)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create API key → Add to `.env`

### Remove.bg (Background Removal)
1. Go to [remove.bg/api](https://www.remove.bg/api)
2. Sign up → Get API key → Add to `.env`

## 📚 What's Next?

### Explore the Dashboard
- **📊 Dashboard Tab**: See statistics and quick actions
- **📦 Products Tab**: View and process individual products
- **🔄 Bulk Process Tab**: Upload CSV for batch processing
- **⚙️ Settings Tab**: Configure AI and search preferences

### Import Your First Products
1. Click **📥 Import Products** button
2. Products will load from your Shopify store
3. Click **🚀 Process** on any product to start enrichment

### Try Bulk Processing
1. Go to **Bulk Process** tab
2. Click **📋 Generate Sample CSV** to get started
3. Upload CSV and customize settings
4. Click **🚀 Start Processing**

## 🆘 Troubleshooting

### MongoDB Connection Error
```bash
# Make sure MongoDB is running
brew services list  # macOS
sudo systemctl status mongodb  # Linux

# Start if not running
brew services start mongodb-community
```

### Port Already in Use
```bash
# Change port in .env file
PORT=3002

# Or kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Can't Import Products
- Verify Shopify credentials in `.env`
- Make sure redirect URL is exact: `http://localhost:3001/api/auth/shopify/callback`
- Check server logs for errors

### Demo Mode Not Working
- Just refresh the page
- Clear browser cache
- Check browser console for errors (F12)

## 🎓 Learn More

- **Full Setup Guide**: See `SETUP-GUIDE.md` for detailed instructions
- **Features**: See `FEATURES.md` for complete feature list
- **Documentation**: Check `README.md` for architecture details

## ✅ Success Checklist

After setup, you should be able to:
- [ ] Access dashboard at `http://localhost:3001/dashboard.html`
- [ ] See demo data in demo mode
- [ ] Connect to Shopify (if credentials configured)
- [ ] Import products from Shopify
- [ ] Process individual products
- [ ] Upload CSV for bulk processing
- [ ] View activity log in bottom-right corner

## 🎉 You're Ready!

Congratulations! Your Shopify Image Enricher is now running. 

Start enriching your product images with AI! 🖼️✨

---

**Need Help?** 
- Check logs: `tail -f logs/combined.log`
- Check Activity Log in dashboard (bottom-right corner)
- Review error logs: `logs/error.log`

**Pro Tips:**
- Use demo mode to explore features without API costs
- Start with a small batch when testing
- Monitor API usage in the dashboard header
- Save your settings before processing





