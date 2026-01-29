# 🖼️ Shopify Image Enricher

An AI-powered Shopify app that automatically discovers, analyzes, and enriches product images using Google Vision API and Custom Search API.

## ✨ Features

### 🔍 **AI Image Analysis**
- **Google Vision API integration** for comprehensive image analysis
- **Label detection** to identify products, objects, and scenes
- **Text recognition** to detect watermarks and overlays
- **Color analysis** to extract dominant colors
- **Safe search filtering** to ensure appropriate content
- **E-commerce suitability scoring** for product photos

### 🎯 **Smart Image Discovery**
- **AI-generated search terms** using OpenAI GPT-4
- **Google Custom Search API** for finding high-quality product images
- **Multiple search strategies** (brand, model, product type, lifestyle)
- **Automatic filtering** by size, format, and quality
- **Relevance scoring** to rank discovered images

### 🚀 **Automated Processing**
- **Complete workflow automation** from import to selection
- **Batch processing** for multiple products simultaneously
- **Smart image selection** based on AI analysis scores
- **Shopify integration** to update product images
- **Progress tracking** and detailed logging

### 🔄 **Bulk Image Pipeline**
- **Remove.bg integration** for automatic background removal
- **Custom canvas creation** with brand colors and sizing
- **Text and logo overlays** with flexible positioning
- **Watermark support** (image or text) with opacity control
- **CSV-based bulk processing** for hundreds of images
- **Replace strategies** (append, replace all, replace featured)
- **Variant image assignment** for specific product variants
- **Real-time progress tracking** with detailed logging

### 📊 **Professional Dashboard**
- **Real-time statistics** and progress monitoring
- **Product management** with filtering and search
- **Bulk operations** for efficient processing
- **Settings customization** for optimal results
- **Activity logging** for transparency

## 🛠️ Installation

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+ and pip
- MongoDB database
- Shopify Partner account
- Google Cloud Platform account
- OpenAI API account
- Remove.bg API account (for bulk image pipeline)

### 1. Clone and Setup
```bash
git clone <repository-url>
cd shopify-image-enricher
npm install

# Setup Python dependencies for bulk image pipeline
npm run setup-python
```

### 2. Environment Configuration
Copy `env.example` to `.env` and configure:

```env
# Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://your-app-url.com
SHOPIFY_SCOPES=read_products,write_products,read_files,write_files

# Database
MONGODB_URI=mongodb://localhost:27017/shopify-image-enricher

# Google APIs
GOOGLE_API_KEY=your_google_api_key
GOOGLE_SEARCH_ENGINE_ID=your_google_search_engine_id
GOOGLE_VISION_API_KEY=your_google_vision_api_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Remove.bg API (for bulk image pipeline)
REMOVE_BG_API_KEY=your_remove_bg_api_key

# Server
PORT=3001
NODE_ENV=development
SESSION_SECRET=your_session_secret_key
```

### 3. Shopify App Setup

1. **Create a Shopify Partner Account**: [partners.shopify.com](https://partners.shopify.com)

2. **Create a new app** in your Partner Dashboard

3. **Configure app settings**:
   - App URL: `https://your-domain.com`
   - Allowed redirection URLs: `https://your-domain.com/api/auth/shopify/callback`
   - Scopes: `read_products,write_products,read_files,write_files`

4. **Get your API credentials** and add them to `.env`

### 4. Google Cloud Setup

1. **Create a Google Cloud Project**: [console.cloud.google.com](https://console.cloud.google.com)

2. **Enable APIs**:
   - Vision API
   - Custom Search API

3. **Create API Key**:
   - Go to APIs & Services > Credentials
   - Create API Key
   - Restrict to Vision API and Custom Search API

4. **Setup Custom Search Engine**:
   - Go to [programmablesearchengine.google.com](https://programmablesearchengine.google.com)
   - Create a new search engine
   - Enable Image Search
   - Get your Search Engine ID

### 5. OpenAI Setup

1. **Get OpenAI API Key**: [platform.openai.com](https://platform.openai.com)
2. **Add to environment variables**

### 6. Start the Application

```bash
# Development
npm run dev

# Production
npm start
```

## 🎯 Usage

### 1. **Install the App**
- Visit your app URL with `?shop=your-shop.myshopify.com`
- Complete the OAuth process
- Grant required permissions

### 2. **Import Products**
- Go to Dashboard tab
- Click "📥 Import Products from Shopify"
- Wait for products to be imported

### 3. **Process Images**

**Single Product:**
1. Go to Products tab
2. Click on a product card
3. Use "🚀 Process" button for complete workflow
4. Or use individual actions (Analyze, Search)

**Bulk Processing:**
1. Go to Bulk Process tab
2. Configure processing options
3. Select products or use "Select All Pending"
4. Click "🚀 Start Bulk Processing"

### 4. **Configure Settings**
- Go to Settings tab
- Adjust image search parameters
- Configure AI analysis options
- Set up auto-processing rules

### 5. **Bulk Image Pipeline**
- Go to Bulk Process tab
- Configure pipeline settings (background color, canvas size, etc.)
- Upload CSV file with product data
- Set watermark and overlay options
- Start processing with real-time progress tracking

## 🏗️ Architecture

### Backend Services

- **ImageAnalysisService**: Google Vision API integration
- **ImageSearchService**: Google Custom Search + OpenAI integration
- **Product Management**: Shopify API integration
- **Shop Management**: Authentication and settings
- **Bulk Image Pipeline**: Python-based Remove.bg processing with Shopify upload

### Database Models

- **Product**: Stores product data and enrichment status
- **Shop**: Stores shop information and settings

### API Routes

- `/api/auth/*`: Authentication and shop management
- `/api/products/*`: Product CRUD operations
- `/api/images/*`: Image processing workflows
- `/api/pipeline/*`: Bulk image pipeline operations

## 🎨 Frontend

Modern, responsive web interface built with:
- **Vanilla JavaScript** for interactivity
- **CSS Grid/Flexbox** for layouts
- **Modern CSS** with gradients and blur effects
- **Real-time updates** and progress tracking

## 📊 Image Processing Workflow

1. **Import**: Fetch products from Shopify
2. **Analyze**: Use Google Vision API to analyze existing images
3. **Search**: Generate AI search terms and find new images
4. **Score**: Rank images by relevance and quality
5. **Select**: Choose best images (manual or automatic)
6. **Sync**: Update Shopify with selected images

## 🔧 Configuration Options

### Image Search Settings
- Max results per search (5-50)
- Safe search level (off/moderate/strict)
- Minimum image dimensions
- File type preferences

### AI Analysis Settings
- Label detection threshold
- Text detection enable/disable
- Color analysis enable/disable
- Safe search filtering

### Auto-Processing Settings
- Process new products automatically
- Auto-select best images
- Max images per product
- Batch processing limits

## 📈 Usage Limits

### Free Plan
- 100 API calls per month
- Basic image analysis
- Manual processing only

### Paid Plans
- Higher API limits
- Auto-processing features
- Priority support
- Advanced analytics

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check Shopify app credentials
   - Verify redirect URLs match exactly
   - Ensure scopes are correct

2. **API Limits Exceeded**
   - Check your Google Cloud usage
   - Monitor OpenAI API usage
   - Upgrade your plan if needed

3. **Image Processing Failures**
   - Verify Google Vision API is enabled
   - Check custom search engine setup
   - Ensure images are accessible

### Debug Mode
Set `NODE_ENV=development` for detailed logging.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: [Link to docs]
- **Issues**: [GitHub Issues]
- **Email**: support@example.com

## 🎉 What's Next?

This focused image enrichment app provides a clean, efficient solution for Shopify merchants who need better product images. Unlike the complex multi-attribute system we were building before, this app does one thing really well: **finding and managing product images**.

Perfect for e-commerce stores that want to:
- ✅ Improve their product image quality
- ✅ Discover new lifestyle and professional photos
- ✅ Automate tedious image management tasks
- ✅ Scale their image operations efficiently

Ready to enhance your Shopify store's visual appeal! 🚀
