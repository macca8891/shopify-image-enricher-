# 🖼️ Shopify Image Enricher

> **AI-Powered Product Image Discovery, Analysis & Management for Shopify**

Transform your Shopify store with professional product images powered by Google Vision AI, OpenAI GPT-4, and advanced image processing. Automatically discover, analyze, and enhance product images at scale.

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-5.0+-green.svg)](https://www.mongodb.com/)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![Shopify Image Enricher Dashboard](https://via.placeholder.com/800x400/667eea/ffffff?text=Shopify+Image+Enricher+Dashboard)

---

## ✨ Key Features

### 🤖 **AI Image Analysis** (Google Vision API)
- **Label Detection** - Identify products, objects, and scenes with 95%+ accuracy
- **Text Recognition** - Detect watermarks, overlays, and product text
- **Color Analysis** - Extract dominant colors and palettes
- **Safe Search** - Automatically filter inappropriate content
- **Quality Scoring** - Rate images for e-commerce suitability (0-100)

### 🔍 **Smart Image Discovery** (OpenAI + Google Search)
- **AI-Generated Search Terms** - GPT-4 creates 8-12 optimized queries
- **Intelligent Web Search** - Find high-quality images from across the web
- **Advanced Filtering** - Size, format, quality, and license filtering
- **Relevance Ranking** - Automatic scoring and sorting by quality

### 🚀 **Automated Workflows**
- **Complete Processing** - Analyze → Search → Select → Upload
- **Batch Operations** - Process up to 100 products simultaneously
- **Auto-Selection** - AI picks the best images automatically
- **Shopify Sync** - Direct upload to your store

### 🖼️ **Professional Image Pipeline** (Remove.bg)
- **Background Removal** - AI-powered cutouts
- **Canvas Creation** - Custom sizes and brand colors
- **Watermarking** - Text and logo overlays
- **Bulk Processing** - CSV-based batch operations
- **Image Enhancement** - Sharpening, optimization, format conversion

### 📊 **Modern Dashboard**
- **Real-time Statistics** - Track progress and usage
- **Product Management** - Search, filter, and organize
- **Activity Logging** - Monitor all operations
- **Settings Control** - Fine-tune every feature

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Node.js 16+ 
- MongoDB 5.0+
- Shopify Partner Account (free)
- API Keys (Google Cloud, OpenAI, Remove.bg)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/shopify-image-enricher.git
cd shopify-image-enricher

# 2. Install dependencies
npm run setup

# 3. Start MongoDB
brew services start mongodb-community  # macOS
sudo systemctl start mongodb           # Linux

# 4. Create .env file (see below)
cp env.example .env
# Edit .env with your credentials

# 5. Start the server
npm run dev
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=3001
NODE_ENV=development
SESSION_SECRET=your_random_secret_key

# Database
MONGODB_URI=mongodb://localhost:27017/shopify-image-enricher

# Shopify
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=http://localhost:3001
SHOPIFY_SCOPES=read_products,write_products,read_files,write_files

# Google Cloud
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
GOOGLE_VISION_API_KEY=your_vision_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Remove.bg (optional)
REMOVE_BG_API_KEY=your_removebg_api_key
```

### Access the Dashboard

```
http://localhost:3001/dashboard.html
```

The app will run in **demo mode** without credentials, so you can explore the interface immediately!

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [**Quick Start Guide**](QUICK-START-GUIDE.md) | Get running in 5 minutes |
| [**Setup Guide**](SETUP-GUIDE.md) | Detailed installation & configuration |
| [**Features**](FEATURES.md) | Complete feature documentation |
| [**API Documentation**](API-DOCS.md) | REST API reference |

---

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js + Express.js
- MongoDB + Mongoose
- Google Cloud Vision API
- Google Custom Search API
- OpenAI GPT-4 API
- Remove.bg API
- Shopify Admin API

**Frontend:**
- Vanilla JavaScript (ES6+)
- Modern CSS3 (Grid, Flexbox, Animations)
- Responsive Design
- Real-time Updates

**Image Processing:**
- Python 3.8+
- Pillow (PIL)
- Sharp (Node.js)
- Remove.bg SDK

### Project Structure

```
shopify-image-enricher/
├── server.js                 # Main Express server
├── models/
│   ├── Product.js           # Product schema & methods
│   └── Shop.js              # Shop schema & settings
├── routes/
│   ├── auth.js              # Shopify OAuth & authentication
│   ├── products.js          # Product management endpoints
│   ├── images.js            # Image processing endpoints
│   ├── pipeline.js          # Bulk processing endpoints
│   └── buckydrop.js         # Shipping calculator proxy
├── services/
│   ├── ImageAnalysisService.js   # Google Vision integration
│   ├── ImageSearchService.js     # Google Search + OpenAI
│   └── BuckyDropService.js       # Shipping calculator
├── public/
│   ├── dashboard.html       # Main dashboard UI
│   ├── css/styles.css       # Stylesheet
│   └── js/app.js            # Frontend JavaScript
├── image-pipeline/
│   ├── process_images.py    # Python image processor
│   ├── requirements.txt     # Python dependencies
│   └── assets/              # Logos, watermarks
└── utils/
    └── logger.js            # Winston logger
```

---

## 🎯 Usage Examples

### 1. Import Products from Shopify

```javascript
// From the dashboard
1. Click "📥 Import Products"
2. Products load automatically
3. View in Products tab
```

### 2. Process Individual Product

```javascript
// Automatic workflow
1. Go to Products tab
2. Click on a product card
3. Click "🚀 Process"
4. Watch real-time progress in Activity Log
```

### 3. Bulk Process Multiple Products

```javascript
// Select and process in batch
1. Go to Products tab
2. Check products to process
3. Configure options (analyze, search, auto-select)
4. Click "🚀 Start Bulk Processing"
```

### 4. Use Image Pipeline

```javascript
// CSV-based bulk processing
1. Go to Bulk Process tab
2. Click "📋 Generate Sample CSV"
3. Edit CSV with your products
4. Upload and configure settings
5. Click "🚀 Start Processing"
```

### 5. Configure Settings

```javascript
// Fine-tune behavior
1. Go to Settings tab
2. Adjust image search preferences
3. Configure AI analysis options
4. Set auto-processing rules
5. Click "💾 Save Settings"
```

---

## 🔑 Getting API Keys

### Shopify API

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Create account → Apps → Create app
3. Copy API key and secret
4. Add redirect URL: `http://localhost:3001/api/auth/shopify/callback`

[Detailed Shopify Setup →](SETUP-GUIDE.md#step-3-setup-shopify-app)

### Google Cloud (Vision + Search)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable billing
3. Enable Vision API and Custom Search API
4. Create API key
5. Create Custom Search Engine

[Detailed Google Setup →](SETUP-GUIDE.md#step-4-setup-google-cloud-platform)

### OpenAI API

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create account → API keys
3. Create new key
4. Add credits to account

[Detailed OpenAI Setup →](SETUP-GUIDE.md#step-5-setup-openai-api)

### Remove.bg API

1. Go to [remove.bg/api](https://www.remove.bg/api)
2. Sign up → Dashboard
3. Copy API key

[Detailed Remove.bg Setup →](SETUP-GUIDE.md#step-6-setup-removebg-api-optional)

---

## 🎨 Screenshots

### Dashboard
![Dashboard](https://via.placeholder.com/800x500/667eea/ffffff?text=Dashboard+View)

### Products Management
![Products](https://via.placeholder.com/800x500/764ba2/ffffff?text=Products+Management)

### Bulk Processing
![Bulk Process](https://via.placeholder.com/800x500/667eea/ffffff?text=Bulk+Processing)

### Settings
![Settings](https://via.placeholder.com/800x500/764ba2/ffffff?text=Settings+Panel)

---

## 📊 API Endpoints

### Authentication
```
GET  /api/auth/shopify          - Initiate OAuth
GET  /api/auth/shopify/callback - OAuth callback
GET  /api/auth/verify           - Verify authentication
GET  /api/auth/shop             - Get shop info
PUT  /api/auth/shop/settings    - Update settings
```

### Products
```
GET    /api/products              - List products
GET    /api/products/:id          - Get product
POST   /api/products/import       - Import from Shopify
PUT    /api/products/:id          - Update product
DELETE /api/products/:id          - Delete product
GET    /api/products/stats/overview - Get statistics
```

### Image Processing
```
POST /api/images/analyze/:id       - Analyze images
POST /api/images/search/:id        - Search for images
POST /api/images/select/:id        - Select images
POST /api/images/process/:id       - Complete workflow
POST /api/images/batch-process     - Batch processing
```

### Pipeline
```
POST /api/pipeline/bulk-process        - Start pipeline
GET  /api/pipeline/bulk-process/:id    - Get status
GET  /api/pipeline/pipeline-settings   - Get settings
PUT  /api/pipeline/pipeline-settings   - Update settings
POST /api/pipeline/generate-sample-csv - Generate CSV
```

[Full API Documentation →](API-DOCS.md)

---

## 🧪 Testing

```bash
# Run in demo mode (no credentials needed)
npm run dev
# Open http://localhost:3001/dashboard.html

# Test Python setup
npm run test-python

# Check environment variables
npm run check-env

# Test BuckyDrop proxy (if configured)
npm run test-proxy
```

---

## 🚢 Deployment

### Railway (Recommended)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Add environment variables in Railway dashboard
```

### Heroku

```bash
# Install Heroku CLI
heroku login

# Create app
heroku create your-app-name

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Deploy
git push heroku main
```

### Docker

```bash
# Build and run
docker-compose up -d

# Or build manually
docker build -t shopify-image-enricher .
docker run -p 3001:3001 --env-file .env shopify-image-enricher
```

[Full Deployment Guide →](DEPLOYMENT-GUIDE.md)

---

## 🛡️ Security

- ✅ Shopify OAuth 2.0 authentication
- ✅ Encrypted token storage
- ✅ Rate limiting (configurable)
- ✅ CORS protection
- ✅ Helmet.js security headers
- ✅ Input validation
- ✅ MongoDB injection protection

---

## 📈 Performance

- **Concurrent Processing**: Configurable (1-10 simultaneous operations)
- **Rate Limiting**: Respects API limits automatically
- **Caching**: Efficient data caching
- **Batch Operations**: Process up to 100 products at once
- **Database Indexing**: Optimized queries
- **Lazy Loading**: Efficient frontend rendering

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Keep commits atomic and descriptive

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Shopify** - E-commerce platform and APIs
- **Google Cloud** - Vision AI and Custom Search
- **OpenAI** - GPT-4 for intelligent search terms
- **Remove.bg** - AI background removal
- **MongoDB** - Database solution
- **Express.js** - Web framework
- **All Contributors** - Thank you! 🎉

---

## 📞 Support

### Documentation
- [Quick Start Guide](QUICK-START-GUIDE.md)
- [Setup Guide](SETUP-GUIDE.md)
- [Features](FEATURES.md)
- [API Documentation](API-DOCS.md)

### Need Help?
- 📧 Email: support@example.com
- 💬 Discord: [Join our community](#)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/shopify-image-enricher/issues)
- 📖 Wiki: [Project Wiki](https://github.com/yourusername/shopify-image-enricher/wiki)

---

## 🗺️ Roadmap

### v2.1 (Coming Soon)
- [ ] AI-generated product descriptions
- [ ] Image similarity search
- [ ] A/B testing for images
- [ ] Multi-language support

### v2.2 (Future)
- [ ] Integration with Unsplash/Pexels
- [ ] Advanced watermark detection
- [ ] Shopify Theme Preview
- [ ] Mobile app

### v3.0 (Vision)
- [ ] Machine learning for custom image ranking
- [ ] Automated SEO optimization
- [ ] Real-time collaboration features
- [ ] Advanced analytics dashboard

[View Full Roadmap →](ROADMAP.md)

---

## ⭐ Star History

If you find this project useful, please consider giving it a star! ⭐

---

<div align="center">

**Built with ❤️ for the Shopify community**

[Website](#) · [Documentation](SETUP-GUIDE.md) · [Report Bug](issues) · [Request Feature](issues)

</div>





