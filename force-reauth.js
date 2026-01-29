// Script to clear shop authentication and force re-authentication
const mongoose = require('mongoose');
const Shop = require('./models/Shop');
require('dotenv').config();

async function forceReauth() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify-image-enricher');
        
        const shop = await Shop.findOne({ domain: 'app-test-1111231295.myshopify.com' });
        
        if (shop) {
            console.log('Current scopes:', shop.scope || 'none');
            console.log('Deleting shop record to force re-authentication...');
            
            // Delete the shop record to force re-auth
            await Shop.deleteOne({ domain: 'app-test-1111231295.myshopify.com' });
            
            console.log('✅ Deleted shop record');
            console.log('\nNow visit this URL to re-authenticate:');
            console.log('https://cynthia-vaccinial-teisha.ngrok-free.dev/api/auth/shopify?shop=app-test-1111231295.myshopify.com');
            console.log('\nMake sure to APPROVE ALL PERMISSIONS including shipping scopes!');
        } else {
            console.log('Shop not found in database');
        }
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

forceReauth();

