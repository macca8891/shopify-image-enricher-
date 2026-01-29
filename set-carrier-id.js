// Simple script to manually set carrier service ID if already registered
const mongoose = require('mongoose');
const Shop = require('./models/Shop');
require('dotenv').config();

async function setCarrierId() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify-image-enricher');
        
        const shop = await Shop.findOne({ domain: 'app-test-1111231295.myshopify.com' });
        
        if (!shop) {
            console.log('❌ Shop not found');
            process.exit(1);
        }

        // If you know the carrier service ID from Shopify Admin, set it here
        // You can find it in Shopify Admin → Settings → Shipping → Carrier services
        const carrierServiceId = process.argv[2];
        
        if (!carrierServiceId) {
            console.log('Usage: node set-carrier-id.js <carrier-service-id>');
            console.log('\nTo find the ID:');
            console.log('1. Go to Shopify Admin → Settings → Shipping & delivery');
            console.log('2. Click "Manage rates" for your shipping zone');
            console.log('3. Find "BuckyDrop Shipping" in the list');
            console.log('4. The ID is in the URL or you can inspect the page');
            process.exit(1);
        }

        shop.carrierServiceId = carrierServiceId;
        await shop.save();
        
        console.log(`✅ Set carrier service ID to: ${carrierServiceId}`);
        console.log('Now refresh your app page - it should show as active!');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

setCarrierId();

