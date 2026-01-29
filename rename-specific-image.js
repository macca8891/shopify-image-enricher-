require('dotenv').config();
const fetch = require('node-fetch');

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

async function renameSpecificImage(productId, imageId, customTitle = null) {
  try {
    console.log(`🔄 Renaming image ${imageId} for product ${productId}`);
    
    // 1. Get product title
    const productResponse = await makeShopifyRequest(
      `https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}.json`
    );
    
    if (!productResponse.ok) {
      throw new Error(`Failed to get product: HTTP ${productResponse.status}`);
    }
    
    const productData = await productResponse.json();
    const productTitle = customTitle || productData.product.title;
    
    // 2. Get the image details
    const imageResponse = await makeShopifyRequest(
      `https://${SHOP_DOMAIN}/admin/api/${SHOPIFY_API_VERSION}/products/${productId}/images/${imageId}.json`
    );
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to get image: HTTP ${imageResponse.status}`);
    }
    
    const imageData = await imageResponse.json();
    const imageUrl = imageData.image.src;
    
    // 3. Download the image
    console.log(`📥 Downloading: ${imageUrl}`);
    const downloadResponse = await fetch(imageUrl);
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download image: HTTP ${downloadResponse.status}`);
    }
    
    const imageBuffer = await downloadResponse.buffer();
    
    // 4. Create new filename
    const sanitizedTitle = sanitizeFilename(productTitle);
    const timestamp = Date.now();
    const newFilename = `${sanitizedTitle}_${timestamp}.jpeg`;
    
    console.log(`📝 New filename: ${newFilename}`);
    
    // 5. Upload with new filename
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
    
    // 6. Delete the old image
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
    
    return { 
      success: true, 
      newImageId, 
      newFilename,
      newImageUrl: uploadData.image.src
    };
    
  } catch (error) {
    console.log(`❌ Failed to rename image ${imageId}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Example usage:
async function example() {
  // Rename a specific image
  const result = await renameSpecificImage(
    '9734606487852', // Product ID
    '51566064894252', // Image ID
    'Custom Title Here' // Optional custom title
  );
  
  console.log('Result:', result);
}

if (require.main === module) {
  console.log('📝 Usage examples:');
  console.log('1. Rename specific image:');
  console.log('   const result = await renameSpecificImage("productId", "imageId");');
  console.log('2. Rename with custom title:');
  console.log('   const result = await renameSpecificImage("productId", "imageId", "Custom Title");');
  console.log('');
  console.log('Run example():');
  example().catch(console.error);
}

module.exports = { renameSpecificImage, sanitizeFilename };


