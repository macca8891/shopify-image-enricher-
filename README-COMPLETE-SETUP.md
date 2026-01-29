# 🖼️ Shopify Image Processor - Complete Setup

A comprehensive image processing system that integrates with Shopify to automatically process product images using Remove.bg background removal, Sharp image manipulation, and custom watermarking.

## ✨ Features

### 🎯 Core Functionality
- **Remove.bg Integration** - Automatic background removal from product images
- **Sharp Image Processing** - Resize, format conversion, and canvas manipulation
- **Custom Watermarking** - Add text watermarks with customizable opacity and scale
- **Shopify Integration** - Direct upload of processed images back to Shopify
- **Batch Processing** - Process multiple products at once
- **File Upload** - Upload custom images for processing

### 🎨 Image Processing Options
- **Canvas Size** - Customizable width/height (512px - 4096px)
- **Background Color** - Choose any background color for transparent images
- **Output Format** - PNG, JPG, or WebP
- **Watermark Text** - Custom text with opacity and scale controls
- **Quality Settings** - High-quality output with optimized file sizes

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Copy environment configuration
cp env-config.txt .env

# Install dependencies
npm install
```

### 2. Run the Server
```bash
node server-clean.js
```

### 3. Access the Application
Open your browser to: **http://localhost:5000**

## 🔧 API Endpoints

### Product Management
- `GET /api/products` - Import products from Shopify
- `GET /api/processing-status/:productId` - Get processing status for a product

### Image Processing
- `POST /api/process-images` - Process existing product images
- `POST /api/upload-process` - Upload and process custom images

## 📋 Usage Instructions

### 1. Import Products
Click "📥 Import Products from Shopify" to load your products with their current images.

### 2. Configure Processing Settings
- **Canvas Size**: Set desired output dimensions
- **Background Color**: Choose background for transparent images
- **Watermark**: Add custom text watermark (optional)
- **Output Format**: Select PNG, JPG, or WebP

### 3. Process Images
Choose from two processing methods:

#### Method A: Process Existing Images
- Click "🖼️ Process Image" on any product card
- Uses the product's current image from Shopify

#### Method B: Upload Custom Images
- Select an image file using the upload area
- Click "📁 Upload & Process" on any product card
- Processes your custom image and uploads to Shopify

### 4. Batch Processing
- Click "🚀 Process All Products" to process all products with images
- Includes rate limiting to avoid API restrictions

## 🔑 API Configuration

Your API keys are already configured:

```env
SHOPIFY_TOKEN=YOUR_SHOPIFY_TOKEN
REMOVE_BG_API_KEY=YOUR_REMOVE_BG_KEY
SHOP_DOMAIN=your-shop.myshopify.com
PORT=5000
```

## 🛠️ Technical Details

### Image Processing Pipeline
1. **Background Removal** - Remove.bg API removes backgrounds
2. **Image Processing** - Sharp resizes and applies watermarks
3. **Format Conversion** - Convert to desired output format
4. **Shopify Upload** - Upload processed image to Shopify

### File Structure
```
├── server-clean.js          # Main server with full image processing
├── public/
│   └── index-clean.html    # Complete frontend interface
├── uploads/                 # Temporary file storage
├── .env                     # Environment configuration
└── README-CLEAN-SETUP.md   # This documentation
```

### Dependencies
- **express** - Web server framework
- **sharp** - High-performance image processing
- **multer** - File upload handling
- **node-fetch** - HTTP requests
- **form-data** - Form data handling for Shopify uploads

## 🎯 Processing Options

### Canvas Settings
- **Width/Height**: 512px - 4096px
- **Background Color**: Any hex color
- **Fit Mode**: Contain (preserves aspect ratio)

### Watermark Settings
- **Text**: Custom watermark text
- **Opacity**: 0.0 - 1.0 (transparent to opaque)
- **Scale**: 0.1 - 1.0 (size relative to canvas)
- **Position**: Centered with 45-degree rotation

### Output Formats
- **PNG**: Lossless, supports transparency
- **JPG**: Compressed, smaller file sizes
- **WebP**: Modern format, best compression

## 🔍 Monitoring & Logs

The application includes comprehensive logging:
- **Real-time Status** - See processing status for each product
- **Activity Log** - Detailed log of all operations
- **Error Handling** - Clear error messages and recovery

## 🚨 Rate Limiting

The system includes built-in rate limiting:
- **2-second delays** between batch processing requests
- **API call monitoring** to avoid Shopify limits
- **Error recovery** for failed requests

## 📈 Performance

- **Concurrent Processing** - Handles multiple requests efficiently
- **Memory Management** - Automatic cleanup of temporary files
- **Optimized Images** - High-quality output with reasonable file sizes

## 🎉 What You Get

✅ **Complete Image Processing Pipeline** - From background removal to Shopify upload  
✅ **Professional Interface** - Clean, intuitive web interface  
✅ **Batch Processing** - Handle multiple products efficiently  
✅ **Custom Watermarking** - Brand your images with custom text  
✅ **Multiple Formats** - PNG, JPG, and WebP support  
✅ **Real-time Monitoring** - Track processing status and logs  
✅ **Error Handling** - Robust error handling and recovery  

## 🔄 Next Steps

The system is ready for production use! You can:

1. **Customize Settings** - Adjust processing parameters for your needs
2. **Add More Features** - Extend with additional image effects
3. **Scale Up** - Process larger batches of products
4. **Monitor Usage** - Track API usage and costs

Your Shopify Image Processor is now fully functional and ready to enhance your product images! 🎉




