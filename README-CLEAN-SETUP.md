# Shopify Image Processor - Clean Setup

A clean, simplified Shopify image processor that imports products directly from Shopify and provides a foundation for image processing.

## Quick Setup

### 1. Environment Configuration
Copy the contents of `env-config.txt` to your `.env` file:
```bash
cp env-config.txt .env
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Server
```bash
node server-clean.js
```

### 4. Access the App
Open your browser to: http://localhost:5000

## What This Gives You

✅ **Clean import of products from Shopify** - Direct API integration  
✅ **Display product images** - Shows existing product images  
✅ **Foundation for image processing** - Ready for Remove.bg and Sharp integration  
✅ **No CSV confusion** - Direct Shopify integration  
✅ **Simple, clean interface** - Easy to understand and extend  

## Files Created

- `server-clean.js` - Simplified Express server with Shopify API integration
- `public/index-clean.html` - Clean HTML interface for product display
- `env-config.txt` - Environment configuration template
- Updated `package.json` - Added node-fetch dependency

## API Endpoints

- `GET /api/products` - Import products from Shopify
- `POST /api/process-images` - Process images (placeholder for your implementation)

## Next Steps

When you're ready to add image processing:

1. **Add Remove.bg integration** - Background removal
2. **Implement image processing with Sharp** - Resizing, watermarking
3. **Add watermarking functionality** - Brand your images
4. **Upload processed images back to Shopify** - Complete the workflow

## Your API Keys

- **Shopify Admin Token**: `YOUR_SHOPIFY_TOKEN`
- **Remove.bg API Key**: `YOUR_REMOVE_BG_KEY`
- **Shop Domain**: `your-shop.myshopify.com`

## Usage

1. Click "Import Products from Shopify" to load your products
2. Each product shows its title, image, and a "Process Images" button
3. The Process Images button is ready for your image processing logic

This setup provides a clean foundation that you can build upon without the complexity of the existing codebase.




