# 🚀 Complete Setup Guide - Shopify Image Enricher

This guide will walk you through setting up the Shopify Image Enricher application from scratch.

## 📋 Prerequisites

Before you begin, make sure you have:

- ✅ Node.js 16+ and npm installed
- ✅ MongoDB installed and running locally (or MongoDB Atlas account)
- ✅ Python 3.8+ and pip installed
- ✅ Shopify Partner account
- ✅ Google Cloud Platform account
- ✅ OpenAI API account
- ✅ Remove.bg API account (optional, for bulk image pipeline)

## 🔧 Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd shopify-image-enricher

# Install Node.js dependencies
npm install

# Install Python dependencies for image pipeline
cd image-pipeline
pip install -r requirements.txt
cd ..
```

## 🔐 Step 2: Create Environment Variables

Create a `.env` file in the root directory with the following content:

```env
# Server Configuration
PORT=3001
NODE_ENV=development
SESSION_SECRET=your_random_session_secret_key_here

# MongoDB - Choose one option:
# Option 1: Local MongoDB
MONGODB_URI=mongodb://localhost:27017/shopify-image-enricher

# Option 2: MongoDB Atlas (cloud)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shopify-image-enricher?retryWrites=true&w=majority

# Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=http://localhost:3001
SHOPIFY_SCOPES=read_products,write_products,read_files,write_files

# Google Cloud APIs
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_google_search_engine_id
GOOGLE_VISION_API_KEY=your_google_vision_api_key

# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Remove.bg API (for bulk image pipeline)
REMOVE_BG_API_KEY=your_remove_bg_api_key

# BuckyDrop Shipping Calculator (optional)
BUCKY_DROP_APPCODE=your_buckydrop_appcode
BUCKY_DROP_APPSECRET=your_buckydrop_appsecret
```

## 🏪 Step 3: Setup Shopify App

### Create a Shopify Partner Account

1. Go to [partners.shopify.com](https://partners.shopify.com) and create an account
2. Click **Apps** in the left sidebar
3. Click **Create app** > **Public app**

### Configure Your App

1. **App name**: Shopify Image Enricher
2. **App URL**: `http://localhost:3001` (for development)
3. **Allowed redirection URLs**: `http://localhost:3001/api/auth/shopify/callback`
4. **API scopes**: Select the following:
   - `read_products` - Read products
   - `write_products` - Write products  
   - `read_files` - Read files
   - `write_files` - Write files

### Get Your API Credentials

1. In your app dashboard, find the **Client credentials** section
2. Copy the **API key** → paste as `SHOPIFY_API_KEY` in `.env`
3. Copy the **API secret** → paste as `SHOPIFY_API_SECRET` in `.env`

## ☁️ Step 4: Setup Google Cloud Platform

### Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable billing for your project

### Enable Required APIs

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for and enable:
   - **Cloud Vision API**
   - **Custom Search API**

### Create API Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **API Key**
3. Copy the API key → paste as `GOOGLE_API_KEY` and `GOOGLE_VISION_API_KEY` in `.env`
4. (Recommended) Click **Restrict key** and limit to:
   - Cloud Vision API
   - Custom Search API

### Setup Custom Search Engine

1. Go to [programmablesearchengine.google.com](https://programmablesearchengine.google.com/controlpanel/create)
2. Click **Add** to create a new search engine
3. **What to search**: Search the entire web
4. Click **Create**
5. In the **Overview** page, turn on **Image search**
6. Copy the **Search engine ID** → paste as `GOOGLE_SEARCH_ENGINE_ID` in `.env`

## 🤖 Step 5: Setup OpenAI API

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account or sign in
3. Go to **API keys**
4. Click **Create new secret key**
5. Copy the key → paste as `OPENAI_API_KEY` in `.env`
6. Add credits to your account (required for API usage)

## 🖼️ Step 6: Setup Remove.bg API (Optional)

This is required for the bulk image pipeline feature (background removal).

1. Go to [remove.bg/api](https://www.remove.bg/api)
2. Sign up for an account
3. Go to your dashboard and copy your API key
4. Paste as `REMOVE_BG_API_KEY` in `.env`

## 🗄️ Step 7: Setup MongoDB

### Option 1: Local MongoDB

```bash
# macOS with Homebrew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb

# Windows
# Download from mongodb.com and install
# MongoDB will start automatically
```

### Option 2: MongoDB Atlas (Cloud)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a free cluster (M0 Sandbox)
4. Click **Connect** > **Connect your application**
5. Copy the connection string and replace `<password>` with your database user password
6. Update `MONGODB_URI` in `.env` with this connection string

## ▶️ Step 8: Start the Application

### Start MongoDB (if using local)

```bash
# macOS
brew services start mongodb-community

# Ubuntu/Debian
sudo systemctl start mongodb

# Windows
# MongoDB service should already be running
```

### Start the Node.js Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server should start on `http://localhost:3001`

## 🧪 Step 9: Test the Application

### Access the Dashboard

1. Open your browser and go to: `http://localhost:3001/dashboard.html`
2. You should see the Shopify Image Enricher dashboard

### Test Shopify Authentication

1. In a new tab, go to your Shopify development store admin
2. Go to `http://localhost:3001/?shop=your-store.myshopify.com`
   (Replace `your-store` with your actual store name)
3. Complete the OAuth flow
4. You should be redirected to the dashboard

### Import Products

1. Click the **📥 Import Products** button in the dashboard
2. Products should start loading from your Shopify store
3. Check the Activity Log in the bottom-right corner for progress

## 🚀 Step 10: Deploy to Production (Optional)

### Using Railway (Recommended)

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login and deploy:
   ```bash
   railway login
   railway init
   railway up
   ```

3. Add environment variables in Railway dashboard
4. Set up MongoDB Atlas for production database

### Using Heroku

1. Install Heroku CLI and login:
   ```bash
   heroku login
   ```

2. Create a new app:
   ```bash
   heroku create your-app-name
   ```

3. Add MongoDB addon:
   ```bash
   heroku addons:create mongolab:sandbox
   ```

4. Set environment variables:
   ```bash
   heroku config:set SHOPIFY_API_KEY=your_key
   heroku config:set SHOPIFY_API_SECRET=your_secret
   # ... add all other env vars
   ```

5. Deploy:
   ```bash
   git push heroku main
   ```

## 📚 Additional Resources

### API Documentation

- [Shopify Admin API](https://shopify.dev/api/admin)
- [Google Vision API](https://cloud.google.com/vision/docs)
- [Google Custom Search API](https://developers.google.com/custom-search/v1/overview)
- [OpenAI API](https://platform.openai.com/docs)
- [Remove.bg API](https://www.remove.bg/api/documentation)

### Troubleshooting

#### MongoDB Connection Error

```bash
# Check if MongoDB is running
# macOS
brew services list

# Ubuntu/Debian
sudo systemctl status mongodb

# If not running, start it
brew services start mongodb-community  # macOS
sudo systemctl start mongodb  # Ubuntu/Debian
```

#### Shopify OAuth Error

- Make sure `SHOPIFY_APP_URL` matches your actual domain
- Ensure redirect URL is exactly: `http://localhost:3001/api/auth/shopify/callback`
- Check that API credentials are correct

#### Google Vision API Error

- Verify that Cloud Vision API is enabled in Google Cloud Console
- Check that API key has proper restrictions
- Ensure billing is enabled on your Google Cloud project

#### Import Products Shows Empty

- Verify Shopify authentication completed successfully
- Check that your store has products
- Look at server logs for error messages: `tail -f logs/combined.log`

## 🎉 Success!

Your Shopify Image Enricher is now set up and ready to use. Here's what you can do:

1. **Import Products** - Load products from Shopify
2. **Analyze Images** - Use Google Vision AI to analyze product images
3. **Search Images** - AI-powered image search with Google Custom Search
4. **Bulk Process** - Process multiple products at once
5. **Pipeline** - Upload CSV for custom image processing with Remove.bg

## 📞 Support

If you encounter any issues:

1. Check the logs in `logs/combined.log` and `logs/error.log`
2. Verify all environment variables are set correctly
3. Ensure all API services are enabled and have credits
4. Check the Activity Log in the dashboard for real-time status

Happy image enriching! 🖼️✨





