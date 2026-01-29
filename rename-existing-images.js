require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const SHOP_DOMAIN = process.env.SHOP_DOMAIN;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_API_VERSION = '2024-01';

// Rate limiting helper
async function makeShopifyRequest(url, options = {}) {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_TOKEN,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || Math.pow(2, attempt);
        console.log(`⏳ Rate limited, waiting ${retryAfter}s...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        attempt++;
        continue;
      }
      
      return response;
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

function sanitizeFilename(title) {
  return title
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters except spaces, hyphens, underscores
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single underscore
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .substring(0, 50) // Limit length to 50 characters
    .toLowerCase();
}

async function renameImage(productId, imageId, productTitle) {
  try {
    console.log(`🔄 Renaming image ${imageId} for product: ${productTitle}`);
    
    // 1. Get the image details
    const imageResponse = await makeShopifyRequest(
      `https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images/${imageId}.json`
    );
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to get image: HTTP ${imageResponse.status}`);
    }
    
    const imageData = await imageResponse.json();
    const imageUrl = imageData.image.src;
    
    // 2. Download the image
    console.log(`📥 Downloading: ${imageUrl}`);
    const downloadResponse = await fetch(imageUrl);
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download image: HTTP ${downloadResponse.status}`);
    }
    
    const imageBuffer = await downloadResponse.buffer();
    
    // 3. Create new filename
    const sanitizedTitle = sanitizeFilename(productTitle);
    const timestamp = Date.now();
    const newFilename = `${sanitizedTitle}_${timestamp}.jpeg`;
    
    console.log(`📝 New filename: ${newFilename}`);
    
    // 4. Upload with new filename
    const uploadResponse = await makeShopifyRequest(
      `https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images.json`,
      {
        method: 'POST',
        body: JSON.stringify({
          image: {
            attachment: imageBuffer.toString('base64'),
            filename: newFilename
          }
        })
      }
    );
    
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload new image: HTTP ${uploadResponse.status}`);
    }
    
    const uploadData = await uploadResponse.json();
    const newImageId = uploadData.image.id;
    
    console.log(`✅ Uploaded new image: ${newImageId}`);
    
    // 5. Delete the old image
    const deleteResponse = await makeShopifyRequest(
      `https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images/${imageId}.json`,
      {
        method: 'DELETE'
      }
    );
    
    if (!deleteResponse.ok) {
      console.log(`⚠️ Failed to delete old image ${imageId}, but new image uploaded successfully`);
    } else {
      console.log(`🗑️ Deleted old image: ${imageId}`);
    }
    
    return { success: true, newImageId, newFilename };
    
  } catch (error) {
    console.log(`❌ Failed to rename image ${imageId}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting image renaming process...');
  
  // Get all products
  console.log('📦 Fetching all products...');
  const productsResponse = await makeShopifyRequest(
    `https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250`
  );
  
  if (!productsResponse.ok) {
    throw new Error(`Failed to fetch products: HTTP ${productsResponse.status}`);
  }
  
  const productsData = await productsResponse.json();
  const products = productsData.products;
  
  console.log(`📦 Found ${products.length} products`);
  
  let renamedCount = 0;
  let errorCount = 0;
  
  for (const product of products) {
    if (!product.images || product.images.length === 0) continue;
    
    // Look for processed images (those with "processed" in filename)
    const processedImages = product.images.filter(img => 
      img.src.includes('processed') || img.src.includes('processed_')
    );
    
    if (processedImages.length === 0) continue;
    
    console.log(`\n🧵 Processing product: ${product.title} (${product.id})`);
    console.log(`📸 Found ${processedImages.length} processed images`);
    
    for (const image of processedImages) {
      const result = await renameImage(product.id, image.id, product.title);
      
      if (result.success) {
        renamedCount++;
      } else {
        errorCount++;
      }
      
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`\n🎉 Renaming complete!`);
  console.log(`✅ Successfully renamed: ${renamedCount} images`);
  console.log(`❌ Errors: ${errorCount} images`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { renameImage, sanitizeFilename };


