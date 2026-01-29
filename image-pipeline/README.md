# Shopify Bulk Image Pipeline

A production-ready Python pipeline for processing product images with Remove.bg background removal and uploading to Shopify with advanced features like watermarks, overlays, and bulk processing.

## 🚀 Features

- **Remove.bg Integration**: Automatic background removal with robust retry logic
- **Shopify Integration**: Full Admin API support with Admin Access Token authentication
- **Bulk Processing**: Process hundreds of images with concurrency control
- **Image Enhancement**: Square canvas, background colors, text overlays, logos, watermarks
- **Replace Strategies**: Append, replace all, or replace featured images
- **Variant Assignment**: Assign images to specific product variants
- **Error Handling**: Comprehensive error logging and retry mechanisms
- **Dry Run Mode**: Test processing without uploading to Shopify

## 📋 Requirements

- Python 3.8+
- Remove.bg API key
- Shopify Admin Access Token (preferred) or API credentials
- Pillow, requests, python-dotenv, aiohttp

## 🛠️ Installation

1. **Clone and setup**:
```bash
cd image-pipeline
pip install -r requirements.txt
cp env.example .env
```

2. **Configure environment**:
```bash
# Edit .env file with your credentials
REMOVE_BG_API_KEY=your_remove_bg_api_key_here
SHOP_DOMAIN=yourshop.myshopify.com
SHOP_ADMIN_TOKEN=your_admin_access_token_here
```

3. **Get Shopify Admin Access Token**:
   - Go to Shopify Admin → Apps → App and sales channel settings
   - Create a private app or use existing app
   - Generate Admin API access token
   - Copy the token to your `.env` file

## 📊 Input Format (CSV)

The pipeline accepts CSV files with the following columns:

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `sku` | ✅ | Product SKU | `SPM001` |
| `image_url` | ⚠️ | Image URL (or image_path) | `https://example.com/image.jpg` |
| `image_path` | ⚠️ | Local image path (or image_url) | `/path/to/image.jpg` |
| `handle` | ❌ | Product handle for lookup | `spare-part-001` |
| `product_id` | ❌ | Direct product ID | `12345` |
| `overlay_text` | ❌ | Text to overlay on image | `SPM Logo` |
| `overlay_logo_path` | ❌ | Path to logo image | `assets/logo.png` |
| `bg_color` | ❌ | Background color hex | `#FFD400` |
| `target` | ❌ | Canvas size (default: 2048) | `2048` |
| `text_position` | ❌ | Text position | `bottom-left` |
| `watermark_img` | ❌ | Watermark image path | `assets/watermark.png` |
| `watermark_opacity` | ❌ | Watermark opacity (0-1) | `0.12` |
| `replace_strategy` | ❌ | How to handle existing images | `append` |
| `alt_text` | ❌ | Alt text for uploaded image | `Spare Part Image` |
| `is_featured` | ❌ | Set as featured image | `true` |
| `variant_sku` | ❌ | Assign to specific variant | `SPM001-VAR1` |

### Replace Strategies

- `append` (default): Add new image(s) to existing ones
- `replace_all`: Delete all existing images before upload
- `replace_featured`: Replace only the featured image

### Text Positions

- `bottom-left` (default)
- `bottom-right`
- `top-left`
- `top-right`

## 🎯 Usage Examples

### 1. Dry Run (Test Processing)

```bash
python process_images.py \
  --input data/input.csv \
  --outdir out \
  --target 2048 \
  --bg-color "#FFFFFF" \
  --dry-run
```

### 2. Full Processing with Watermark

```bash
python process_images.py \
  --input data/input.csv \
  --outdir out \
  --target 2048 \
  --bg-color "#FFD400" \
  --watermark-img assets/watermark.png \
  --watermark-opacity 0.12 \
  --watermark-scale 0.35
```

### 3. Limited Processing with Concurrency

```bash
python process_images.py \
  --input data/input.csv \
  --outdir out \
  --limit 10 \
  --concurrency 2 \
  --watermark-text "SAMPLE" \
  --watermark-opacity 0.15
```

### 4. Replace Featured Images Only

```bash
python process_images.py \
  --input data/featured_replace.csv \
  --outdir out \
  --bg-color "#FFD400"
```

## 📁 Project Structure

```
image-pipeline/
├── process_images.py          # Main processing script
├── requirements.txt           # Python dependencies
├── env.example               # Environment template
├── data/
│   └── input.csv            # Sample CSV input
├── assets/
│   ├── logo.png             # Sample logo (placeholder)
│   └── watermark.png        # Sample watermark (placeholder)
└── README.md                # This file
```

## 🔧 Configuration Options

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REMOVE_BG_API_KEY` | ✅ | Remove.bg API key |
| `SHOP_DOMAIN` | ✅ | Your Shopify domain |
| `SHOP_ADMIN_TOKEN` | ⚠️ | Admin Access Token (preferred) |
| `SHOPIFY_API_KEY` | ⚠️ | API key (fallback) |
| `SHOPIFY_PASSWORD` | ⚠️ | App password (fallback) |

### CLI Arguments

| Argument | Default | Description |
|----------|--------|-------------|
| `--input` | Required | Input CSV file path |
| `--outdir` | `out` | Output directory |
| `--target` | `2048` | Target canvas size |
| `--bg-color` | `#FFFFFF` | Background color |
| `--dry-run` | `False` | Process without uploading |
| `--limit` | `None` | Limit number of rows |
| `--concurrency` | `3` | Concurrent processing limit |
| `--watermark-img` | `None` | Watermark image path |
| `--watermark-text` | `None` | Text watermark |
| `--watermark-opacity` | `0.12` | Watermark opacity |
| `--watermark-scale` | `0.35` | Watermark scale |

## 📈 Processing Flow

1. **Load CSV**: Parse input file and validate data
2. **Remove Background**: Call Remove.bg API with retry logic
3. **Process Image**: 
   - Create square canvas with background color
   - Resize and center image maintaining aspect ratio
   - Add text overlays and logos
   - Apply watermarks
4. **Save Locally**: Save processed PNG to output directory
5. **Upload to Shopify**: Upload with proper metadata and assignments
6. **Handle Replacements**: Apply replace strategy if specified
7. **Set Featured**: Reorder images if `is_featured=true`
8. **Assign Variants**: Link image to specific variant if specified
9. **Track Processing**: Add metafield for audit trail

## 🛡️ Error Handling

- **Exponential Backoff**: Automatic retry with increasing delays
- **Rate Limit Handling**: Respects API rate limits with proper waiting
- **Error Logging**: Comprehensive error tracking in `out/errors.csv`
- **Graceful Degradation**: Continues processing other rows if one fails
- **Validation**: Input validation and clear error messages

## 📝 Output

### Success Logs
```
✅ Saved: out/SPM001_20231201_143022.png
⬆️ Uploaded image to product_id=12345 (image_id=67890)
⭐ Set as featured
🔗 Assigned to variant sku=SPM001-VAR1
🧹 Replaced images (strategy=replace_all)
```

### Error Logs
```
⚠️ Rate limited, retrying in 60s (attempt 2)
❌ Row SPM002: Could not resolve product ID for SKU SPM002
```

### Error CSV (`out/errors.csv`)
```csv
sku,image_url,image_path,error,timestamp
SPM002,https://example.com/bad.jpg,,HTTP 404: Image not found,2023-12-01T14:30:22
```

## 🔍 Troubleshooting

### Common Issues

1. **"Could not resolve product ID"**
   - Ensure `handle`, `product_id`, or `sku` is valid
   - Check that products exist in your Shopify store

2. **"Remove.bg API error 429"**
   - Rate limit exceeded, script will retry automatically
   - Consider reducing `--concurrency` if persistent

3. **"Either SHOP_ADMIN_TOKEN or SHOPIFY_API_KEY/PASSWORD is required"**
   - Set up Admin Access Token in Shopify Admin
   - Or provide legacy API credentials

4. **"No image source provided"**
   - Ensure either `image_url` or `image_path` is provided in CSV

### Performance Tips

- Use `--concurrency 2-4` for optimal performance
- Process in batches with `--limit` for large datasets
- Use `--dry-run` to test before full processing
- Monitor Remove.bg API usage to avoid rate limits

## 🎨 Customization

### Adding Custom Fonts
Modify the `_add_text_overlay` method in `ImageProcessor` class:

```python
try:
    font = ImageFont.truetype("/path/to/your/font.ttf", 48)
except:
    font = ImageFont.load_default()
```

### Custom Watermark Positioning
Modify the `_add_watermark` method for different positions:

```python
# Diagonal watermark
x = int(canvas.width * 0.1)
y = int(canvas.height * 0.1)
```

### Brand Colors
Update default background colors in your CSV or use CLI flags:

```bash
--bg-color "#FFD400"  # SPM Yellow
--bg-color "#FFFFFF"   # White
--bg-color "#F0F0F0"   # Light Gray
```

## 📊 Sample CSV

```csv
sku,image_url,image_path,handle,product_id,overlay_text,overlay_logo_path,bg_color,target,text_position,watermark_img,watermark_opacity,replace_strategy,alt_text,is_featured,variant_sku
SPM001,https://example.com/image1.jpg,,spare-part-001,,SPM Logo,assets/logo.png,#FFD400,2048,bottom-left,assets/watermark.png,0.12,append,Spare Part 001 Image,true,SPM001-VAR1
SPM002,,/path/to/local/image2.jpg,spare-part-002,,SKU Text,,#FFFFFF,2048,bottom-right,,0.0,replace_featured,Spare Part 002 Image,false,
SPM003,https://example.com/image3.jpg,,,12345,Custom Text,,#FFD400,1024,top-left,,0.0,replace_all,Spare Part 003 Image,true,SPM003-VAR1
```

## 🚀 Production Deployment

1. **Environment Setup**:
   - Use production Shopify store credentials
   - Set up proper Remove.bg API limits
   - Configure monitoring and logging

2. **Batch Processing**:
   - Process in chunks of 50-100 images
   - Use `--limit` to control batch size
   - Monitor API usage and costs

3. **Error Monitoring**:
   - Check `out/errors.csv` after each run
   - Set up alerts for high error rates
   - Implement retry logic for failed batches

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review error logs in `out/errors.csv`
3. Test with `--dry-run` mode first
4. Ensure all API credentials are valid

---

**Happy Processing! 🎉**







