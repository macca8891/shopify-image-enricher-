#!/usr/bin/env python3
"""
Shopify Bulk Image Pipeline
Processes images with Remove.bg background removal and uploads to Shopify
"""

import os
import sys
import csv
import json
import time
import argparse
import logging
import asyncio
import aiohttp
import base64
import io
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class ProcessingConfig:
    """Configuration for image processing"""
    remove_bg_api_key: str
    shop_domain: str
    shop_admin_token: Optional[str] = None
    shopify_api_key: Optional[str] = None
    shopify_api_secret: Optional[str] = None
    shopify_password: Optional[str] = None
    default_bg_color: str = "#FFFFFF"
    default_target_size: int = 2048
    default_concurrency: int = 3
    max_retries: int = 5
    dry_run: bool = False
    limit: Optional[int] = None
    watermark_text: Optional[str] = None
    watermark_img_path: Optional[str] = None
    watermark_opacity: float = 0.12
    watermark_scale: float = 0.35

@dataclass
class ImageRow:
    """Represents a single row from the CSV input"""
    sku: str
    image_url: Optional[str] = None
    image_path: Optional[str] = None
    handle: Optional[str] = None
    product_id: Optional[str] = None
    overlay_text: Optional[str] = None
    overlay_logo_path: Optional[str] = None
    bg_color: Optional[str] = None
    target: Optional[int] = None
    text_position: str = "bottom-left"
    watermark_img: Optional[str] = None
    watermark_opacity: Optional[float] = None
    replace_strategy: str = "append"
    alt_text: Optional[str] = None
    is_featured: bool = False
    variant_sku: Optional[str] = None

class RemoveBgClient:
    """Client for Remove.bg API with retry logic"""
    
    def __init__(self, api_key: str, max_retries: int = 5):
        self.api_key = api_key
        self.max_retries = max_retries
        self.base_url = "https://api.remove.bg/v1.0"
    
    async def remove_background(self, image_url: str = None, image_path: str = None) -> bytes:
        """Remove background from image with exponential backoff retry"""
        if not image_url and not image_path:
            raise ValueError("Either image_url or image_path must be provided")
        
        headers = {
            'X-Api-Key': self.api_key,
            'Content-Type': 'application/json'
        }
        
        data = {}
        if image_url:
            data['image_url'] = image_url
        elif image_path:
            with open(image_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')
                data['image_file_b64'] = image_data
        
        for attempt in range(self.max_retries):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{self.base_url}/removebg",
                        headers=headers,
                        json=data,
                        timeout=aiohttp.ClientTimeout(total=60)
                    ) as response:
                        if response.status == 200:
                            return await response.read()
                        elif response.status == 429:
                            retry_after = int(response.headers.get('Retry-After', 60))
                            wait_time = min(retry_after * (2 ** attempt), 300)
                            logger.warning(f"⚠️ Rate limited, retrying in {wait_time}s (attempt {attempt + 1})")
                            await asyncio.sleep(wait_time)
                            continue
                        elif response.status >= 500:
                            wait_time = min(60 * (2 ** attempt), 300)
                            logger.warning(f"⚠️ Server error {response.status}, retrying in {wait_time}s (attempt {attempt + 1})")
                            await asyncio.sleep(wait_time)
                            continue
                        else:
                            error_text = await response.text()
                            raise Exception(f"Remove.bg API error {response.status}: {error_text}")
            
            except Exception as e:
                if attempt == self.max_retries - 1:
                    raise e
                wait_time = min(60 * (2 ** attempt), 300)
                logger.warning(f"⚠️ Request failed, retrying in {wait_time}s: {e}")
                await asyncio.sleep(wait_time)
        
        raise Exception("Max retries exceeded")

class ShopifyClient:
    """Client for Shopify API with Admin Access Token support"""
    
    def __init__(self, config: ProcessingConfig):
        self.config = config
        self.base_url = f"https://{config.shop_domain}/admin/api/2023-10"
        self.session = requests.Session()
        
        # Set up authentication
        if config.shop_admin_token:
            self.session.headers.update({
                'X-Shopify-Access-Token': config.shop_admin_token,
                'Content-Type': 'application/json'
            })
        elif config.shopify_api_key and config.shopify_password:
            self.session.auth = (config.shopify_api_key, config.shopify_password)
        else:
            raise ValueError("Either SHOP_ADMIN_TOKEN or SHOPIFY_API_KEY/PASSWORD must be provided")
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make API request with retry logic"""
        url = f"{self.base_url}/{endpoint}"
        
        for attempt in range(self.config.max_retries):
            try:
                response = self.session.request(method, url, **kwargs)
                
                if response.status_code == 200 or response.status_code == 201:
                    return response
                elif response.status_code == 429:
                    retry_after = int(response.headers.get('Retry-After', 60))
                    wait_time = min(retry_after * (2 ** attempt), 300)
                    logger.warning(f"⚠️ Shopify rate limited, retrying in {wait_time}s (attempt {attempt + 1})")
                    time.sleep(wait_time)
                    continue
                elif response.status_code >= 500:
                    wait_time = min(60 * (2 ** attempt), 300)
                    logger.warning(f"⚠️ Shopify server error {response.status_code}, retrying in {wait_time}s (attempt {attempt + 1})")
                    time.sleep(wait_time)
                    continue
                else:
                    response.raise_for_status()
                    
            except Exception as e:
                if attempt == self.config.max_retries - 1:
                    raise e
                wait_time = min(60 * (2 ** attempt), 300)
                logger.warning(f"⚠️ Shopify request failed, retrying in {wait_time}s: {e}")
                time.sleep(wait_time)
        
        raise Exception("Max retries exceeded")
    
    def get_product_by_id(self, product_id: str) -> Dict:
        """Get product by ID"""
        response = self._make_request('GET', f'products/{product_id}.json')
        return response.json()['product']
    
    def get_product_by_handle(self, handle: str) -> Optional[Dict]:
        """Get product by handle"""
        response = self._make_request('GET', f'products.json?handle={handle}')
        products = response.json()['products']
        return products[0] if products else None
    
    def get_variant_by_sku(self, sku: str) -> Optional[Dict]:
        """Get variant by SKU"""
        response = self._make_request('GET', f'products.json?limit=250')
        products = response.json()['products']
        
        for product in products:
            for variant in product['variants']:
                if variant['sku'] == sku:
                    return variant, product
        return None, None
    
    def upload_product_image(self, product_id: str, image_data: bytes, alt_text: str = None) -> Dict:
        """Upload image to product"""
        files = {
            'image': ('image.png', image_data, 'image/png')
        }
        
        data = {}
        if alt_text:
            data['alt'] = alt_text
        
        response = self._make_request('POST', f'products/{product_id}/images.json', files=files, data=data)
        return response.json()['image']
    
    def delete_product_images(self, product_id: str, image_ids: List[str] = None):
        """Delete product images"""
        if image_ids:
            for image_id in image_ids:
                self._make_request('DELETE', f'products/{product_id}/images/{image_id}.json')
        else:
            # Delete all images
            product = self.get_product_by_id(product_id)
            for image in product['images']:
                self._make_request('DELETE', f'products/{product_id}/images/{image["id"]}.json')
    
    def set_featured_image(self, product_id: str, image_id: str):
        """Set featured image by reordering"""
        # Get current product
        product = self.get_product_by_id(product_id)
        
        # Reorder images to put the new one first
        image_ids = [image_id]
        for image in product['images']:
            if image['id'] != image_id:
                image_ids.append(str(image['id']))
        
        # Update product with new image order
        data = {
            'product': {
                'id': product_id,
                'images': [{'id': img_id} for img_id in image_ids]
            }
        }
        
        self._make_request('PUT', f'products/{product_id}.json', json=data)
    
    def assign_image_to_variant(self, product_id: str, variant_id: str, image_id: str):
        """Assign image to specific variant"""
        data = {
            'image': {
                'id': image_id,
                'variant_ids': [variant_id]
            }
        }
        
        self._make_request('PUT', f'products/{product_id}/images/{image_id}.json', json=data)
    
    def add_product_metafield(self, product_id: str, namespace: str, key: str, value: str):
        """Add metafield to product"""
        data = {
            'metafield': {
                'namespace': namespace,
                'key': key,
                'value': value,
                'type': 'single_line_text_field'
            }
        }
        
        self._make_request('POST', f'products/{product_id}/metafields.json', json=data)

class ImageProcessor:
    """Handles image processing with Pillow"""
    
    def __init__(self, config: ProcessingConfig):
        self.config = config
    
    def process_image(self, image_data: bytes, row: ImageRow) -> bytes:
        """Process image with background removal, resizing, overlays, and watermark"""
        # Load image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGBA if not already
        if image.mode != 'RGBA':
            image = image.convert('RGBA')
        
        # Get target size
        target_size = row.target or self.config.default_target_size
        
        # Create square canvas with background color
        bg_color = row.bg_color or self.config.default_bg_color
        canvas = Image.new('RGBA', (target_size, target_size), bg_color)
        
        # Calculate position to center the image
        img_width, img_height = image.size
        scale = min(target_size / img_width, target_size / img_height)
        new_width = int(img_width * scale)
        new_height = int(img_height * scale)
        
        # Resize image maintaining aspect ratio
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Center on canvas
        x = (target_size - new_width) // 2
        y = (target_size - new_height) // 2
        canvas.paste(image, (x, y), image)
        
        # Add text overlay
        if row.overlay_text:
            self._add_text_overlay(canvas, row.overlay_text, row.text_position)
        
        # Add logo overlay
        if row.overlay_logo_path and os.path.exists(row.overlay_logo_path):
            self._add_logo_overlay(canvas, row.overlay_logo_path)
        
        # Add watermark
        watermark_img = row.watermark_img or self.config.watermark_img_path
        watermark_opacity = row.watermark_opacity or self.config.watermark_opacity
        
        if watermark_img and os.path.exists(watermark_img):
            self._add_watermark(canvas, watermark_img, watermark_opacity)
        elif self.config.watermark_text:
            self._add_text_watermark(canvas, self.config.watermark_text, watermark_opacity)
        
        # Convert to PNG bytes
        output = io.BytesIO()
        canvas.save(output, format='PNG')
        return output.getvalue()
    
    def _add_text_overlay(self, canvas: Image.Image, text: str, position: str):
        """Add text overlay to canvas"""
        draw = ImageDraw.Draw(canvas)
        
        # Try to load a font, fallback to default
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 48)
        except:
            font = ImageFont.load_default()
        
        # Calculate text position
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        if position == "bottom-left":
            x, y = 20, canvas.height - text_height - 20
        elif position == "bottom-right":
            x, y = canvas.width - text_width - 20, canvas.height - text_height - 20
        elif position == "top-left":
            x, y = 20, 20
        elif position == "top-right":
            x, y = canvas.width - text_width - 20, 20
        else:
            x, y = 20, canvas.height - text_height - 20  # default to bottom-left
        
        # Add white stroke for legibility
        stroke_width = 2
        for adj in range(-stroke_width, stroke_width + 1):
            for adj2 in range(-stroke_width, stroke_width + 1):
                draw.text((x + adj, y + adj2), text, font=font, fill=(255, 255, 255, 255))
        
        # Add main text
        draw.text((x, y), text, font=font, fill=(0, 0, 0, 255))
    
    def _add_logo_overlay(self, canvas: Image.Image, logo_path: str):
        """Add logo overlay to canvas"""
        logo = Image.open(logo_path)
        if logo.mode != 'RGBA':
            logo = logo.convert('RGBA')
        
        # Scale logo relative to canvas
        scale = 0.2  # 20% of canvas size
        logo_size = int(canvas.width * scale)
        logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        
        # Position in top-right corner
        x = canvas.width - logo_size - 20
        y = 20
        
        canvas.paste(logo, (x, y), logo)
    
    def _add_watermark(self, canvas: Image.Image, watermark_path: str, opacity: float):
        """Add image watermark to canvas"""
        watermark = Image.open(watermark_path)
        if watermark.mode != 'RGBA':
            watermark = watermark.convert('RGBA')
        
        # Scale watermark
        scale = self.config.watermark_scale
        watermark_size = int(canvas.width * scale)
        watermark = watermark.resize((watermark_size, watermark_size), Image.Resampling.LANCZOS)
        
        # Apply opacity
        watermark.putalpha(int(255 * opacity))
        
        # Center watermark
        x = (canvas.width - watermark_size) // 2
        y = (canvas.height - watermark_size) // 2
        
        canvas.paste(watermark, (x, y), watermark)
    
    def _add_text_watermark(self, canvas: Image.Image, text: str, opacity: float):
        """Add text watermark to canvas"""
        draw = ImageDraw.Draw(canvas)
        
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 72)
        except:
            font = ImageFont.load_default()
        
        # Calculate text position (center)
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (canvas.width - text_width) // 2
        y = (canvas.height - text_height) // 2
        
        # Apply opacity
        alpha = int(255 * opacity)
        draw.text((x, y), text, font=font, fill=(128, 128, 128, alpha))

class BulkImageProcessor:
    """Main processor class that orchestrates the entire pipeline"""
    
    def __init__(self, config: ProcessingConfig):
        self.config = config
        self.remove_bg = RemoveBgClient(config.remove_bg_api_key, config.max_retries)
        self.shopify = ShopifyClient(config)
        self.image_processor = ImageProcessor(config)
        self.errors = []
    
    def load_csv(self, csv_path: str) -> List[ImageRow]:
        """Load and parse CSV file"""
        rows = []
        with open(csv_path, 'r', newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for i, row_data in enumerate(reader):
                if self.config.limit and i >= self.config.limit:
                    break
                
                row = ImageRow(
                    sku=row_data.get('sku', ''),
                    image_url=row_data.get('image_url') or None,
                    image_path=row_data.get('image_path') or None,
                    handle=row_data.get('handle') or None,
                    product_id=row_data.get('product_id') or None,
                    overlay_text=row_data.get('overlay_text') or None,
                    overlay_logo_path=row_data.get('overlay_logo_path') or None,
                    bg_color=row_data.get('bg_color') or None,
                    target=int(row_data.get('target', 0)) or None,
                    text_position=row_data.get('text_position', 'bottom-left'),
                    watermark_img=row_data.get('watermark_img') or None,
                    watermark_opacity=float(row_data.get('watermark_opacity', 0)) or None,
                    replace_strategy=row_data.get('replace_strategy', 'append'),
                    alt_text=row_data.get('alt_text') or None,
                    is_featured=row_data.get('is_featured', '').lower() == 'true',
                    variant_sku=row_data.get('variant_sku') or None
                )
                rows.append(row)
        
        return rows
    
    async def process_row(self, row: ImageRow, output_dir: Path) -> bool:
        """Process a single row"""
        try:
            logger.info(f"🔄 Processing {row.sku}")
            
            # Remove background
            if row.image_url:
                image_data = await self.remove_bg.remove_background(image_url=row.image_url)
            elif row.image_path:
                image_data = await self.remove_bg.remove_background(image_path=row.image_path)
            else:
                raise ValueError("No image source provided")
            
            # Process image
            processed_data = self.image_processor.process_image(image_data, row)
            
            # Save processed image
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{row.sku}_{timestamp}.png"
            output_path = output_dir / filename
            
            with open(output_path, 'wb') as f:
                f.write(processed_data)
            
            logger.info(f"✅ Saved: {output_path}")
            
            # Upload to Shopify if not dry run
            if not self.config.dry_run:
                await self._upload_to_shopify(row, processed_data, filename)
            
            return True
            
        except Exception as e:
            error_msg = f"❌ Row {row.sku}: {str(e)}"
            logger.error(error_msg)
            self.errors.append({
                'sku': row.sku,
                'image_url': row.image_url,
                'image_path': row.image_path,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
            return False
    
    async def _upload_to_shopify(self, row: ImageRow, image_data: bytes, filename: str):
        """Upload processed image to Shopify"""
        # Resolve product ID
        product_id = None
        
        if row.product_id:
            product_id = row.product_id
        elif row.handle:
            product = self.shopify.get_product_by_handle(row.handle)
            if product:
                product_id = str(product['id'])
        elif row.sku:
            variant, product = self.shopify.get_variant_by_sku(row.sku)
            if product:
                product_id = str(product['id'])
        
        if not product_id:
            raise ValueError(f"Could not resolve product ID for SKU {row.sku}")
        
        # Handle replace strategies
        if row.replace_strategy == "replace_all":
            self.shopify.delete_product_images(product_id)
            logger.info(f"🧹 Replaced images (strategy=replace_all)")
        elif row.replace_strategy == "replace_featured":
            product = self.shopify.get_product_by_id(product_id)
            if product['images']:
                featured_image_id = product['images'][0]['id']
                self.shopify.delete_product_images(product_id, [featured_image_id])
        
        # Upload image
        alt_text = row.alt_text or row.overlay_text or row.sku
        image_response = self.shopify.upload_product_image(product_id, image_data, alt_text)
        image_id = image_response['id']
        
        logger.info(f"⬆️ Uploaded image to product_id={product_id} (image_id={image_id})")
        
        # Set as featured if requested
        if row.is_featured:
            self.shopify.set_featured_image(product_id, image_id)
            logger.info(f"⭐ Set as featured")
        
        # Assign to variant if specified
        if row.variant_sku:
            variant, _ = self.shopify.get_variant_by_sku(row.variant_sku)
            if variant:
                self.shopify.assign_image_to_variant(product_id, variant['id'], image_id)
                logger.info(f"🔗 Assigned to variant sku={row.variant_sku}")
        
        # Add metafield for tracking
        self.shopify.add_product_metafield(
            product_id, 
            'spm_processing', 
            'last_image_pipeline_at', 
            datetime.now().isoformat()
        )
    
    async def process_bulk(self, csv_path: str, output_dir: str):
        """Process all rows in CSV"""
        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        # Load CSV
        rows = self.load_csv(csv_path)
        logger.info(f"📊 Loaded {len(rows)} rows from CSV")
        
        # Process with concurrency control
        semaphore = asyncio.Semaphore(self.config.default_concurrency)
        
        async def process_with_semaphore(row):
            async with semaphore:
                return await self.process_row(row, output_path)
        
        # Process all rows
        tasks = [process_with_semaphore(row) for row in rows]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Log results
        successful = sum(1 for r in results if r is True)
        failed = len(results) - successful
        
        logger.info(f"🎉 Processing complete: {successful} successful, {failed} failed")
        
        # Save error log
        if self.errors:
            error_path = output_path / 'errors.csv'
            with open(error_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['sku', 'image_url', 'image_path', 'error', 'timestamp'])
                writer.writeheader()
                writer.writerows(self.errors)
            logger.info(f"📝 Error log saved: {error_path}")

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Shopify Bulk Image Pipeline')
    parser.add_argument('--input', required=True, help='Input CSV file path')
    parser.add_argument('--outdir', default='out', help='Output directory')
    parser.add_argument('--target', type=int, default=2048, help='Target canvas size')
    parser.add_argument('--bg-color', default='#FFFFFF', help='Background color')
    parser.add_argument('--dry-run', action='store_true', help='Process without uploading')
    parser.add_argument('--limit', type=int, help='Limit number of rows to process')
    parser.add_argument('--concurrency', type=int, default=3, help='Concurrent processing limit')
    parser.add_argument('--watermark-img', help='Path to watermark image')
    parser.add_argument('--watermark-text', help='Text watermark')
    parser.add_argument('--watermark-opacity', type=float, default=0.12, help='Watermark opacity')
    parser.add_argument('--watermark-scale', type=float, default=0.35, help='Watermark scale')
    
    args = parser.parse_args()
    
    # Load configuration
    config = ProcessingConfig(
        remove_bg_api_key=os.getenv('REMOVE_BG_API_KEY'),
        shop_domain=os.getenv('SHOP_DOMAIN'),
        shop_admin_token=os.getenv('SHOP_ADMIN_TOKEN'),
        shopify_api_key=os.getenv('SHOPIFY_API_KEY'),
        shopify_api_secret=os.getenv('SHOPIFY_API_SECRET'),
        shopify_password=os.getenv('SHOPIFY_PASSWORD'),
        default_bg_color=args.bg_color,
        default_target_size=args.target,
        default_concurrency=args.concurrency,
        dry_run=args.dry_run,
        limit=args.limit,
        watermark_text=args.watermark_text,
        watermark_img_path=args.watermark_img,
        watermark_opacity=args.watermark_opacity,
        watermark_scale=args.watermark_scale
    )
    
    # Validate configuration
    if not config.remove_bg_api_key:
        logger.error("❌ REMOVE_BG_API_KEY is required")
        sys.exit(1)
    
    if not config.shop_domain:
        logger.error("❌ SHOP_DOMAIN is required")
        sys.exit(1)
    
    if not config.shop_admin_token and not (config.shopify_api_key and config.shopify_password):
        logger.error("❌ Either SHOP_ADMIN_TOKEN or SHOPIFY_API_KEY/PASSWORD is required")
        sys.exit(1)
    
    # Create processor and run
    processor = BulkImageProcessor(config)
    
    try:
        asyncio.run(processor.process_bulk(args.input, args.outdir))
    except KeyboardInterrupt:
        logger.info("🛑 Processing interrupted by user")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()










