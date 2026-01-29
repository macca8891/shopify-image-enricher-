const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Upload processed images to Shopify
const uploadProcessedImages = async () => {
  try {
    console.log('🔄 Starting bulk upload of processed images to Shopify...');
    
    // Read all processed image files
    const uploadsDir = 'uploads';
    const files = await fs.readdir(uploadsDir);
    const processedFiles = files.filter(file => file.startsWith('processed-'));
    
    console.log(`📁 Found ${processedFiles.length} processed images`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of processedFiles) {
      try {
        // Extract product ID from filename
        const match = file.match(/processed-(\d+)-/);
        if (!match) {
          console.log(`❌ Could not extract product ID from ${file}`);
          continue;
        }
        
        const productId = match[1];
        const filePath = path.join(uploadsDir, file);
        
        console.log(`📤 Uploading ${file} for product ${productId}...`);
        
        // Read the image file
        const imageBuffer = await fs.readFile(filePath);
        const base64Image = imageBuffer.toString('base64');
        
        // Upload to Shopify
        const uploadResponse = await fetch(`https://${process.env.SHOP_DOMAIN}/admin/api/2024-01/products/${productId}/images.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: {
              attachment: base64Image,
              filename: file
            }
          })
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          console.log(`✅ Successfully uploaded ${file} to product ${productId}`);
          successCount++;
        } else {
          const errorText = await uploadResponse.text();
          console.log(`❌ Failed to upload ${file}: ${errorText}`);
          errorCount++;
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ Error uploading ${file}: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Upload completed!`);
    console.log(`✅ Successfully uploaded: ${successCount} images`);
    console.log(`❌ Failed uploads: ${errorCount} images`);
    
  } catch (error) {
    console.error('❌ Bulk upload error:', error);
  }
};

// Run the upload
uploadProcessedImages();




