// Simple script to register carrier service using access token directly
const axios = require('axios');
require('dotenv').config();

const SHOP_DOMAIN = process.env.SHOP_DOMAIN || 'app-test-1111231295.myshopify.com';
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const APP_URL = process.env.SHOPIFY_APP_URL || 'http://localhost:3001';

if (!ACCESS_TOKEN) {
    console.error('❌ SHOPIFY_ACCESS_TOKEN not set in .env');
    console.error('\nTo get your access token:');
    console.error('1. Go to Shopify Admin → Settings → Apps and sales channels');
    console.error('2. Click "Develop apps" → Create app');
    console.error('3. Give it a name, click Create');
    console.error('4. Go to "Configuration" → Add scopes: read_shipping, write_shipping, read_orders');
    console.error('5. Click "Save" → "Install app"');
    console.error('6. Copy the "Admin API access token"');
    console.error('7. Add to .env: SHOPIFY_ACCESS_TOKEN=your_token_here');
    process.exit(1);
}

async function registerCarrierService() {
    try {
        // CRITICAL: Callback URL should NOT include query parameters
        // Shopify sends shop domain in X-Shopify-Shop-Domain header
        const callbackUrl = `${APP_URL}/api/shipping/carrier-service`;
        
        console.log(`Registering carrier service for ${SHOP_DOMAIN}...`);
        console.log(`Callback URL: ${callbackUrl}`);
        
        const response = await axios.post(
            `https://${SHOP_DOMAIN}/admin/api/2025-01/carrier_services.json`,
            {
                carrier_service: {
                    name: 'BuckyDrop Shipping',
                    callback_url: callbackUrl,
                    service_discovery: false,
                    format: 'json' // Use JSON format (matching our implementation)
                }
            },
            {
                headers: {
                    'X-Shopify-Access-Token': ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const carrierService = response.data.carrier_service;
        console.log(`\n✅ Carrier service registered!`);
        console.log(`   ID: ${carrierService.id}`);
        console.log(`   Name: ${carrierService.name}`);
        console.log(`\nNow go to Shopify Admin → Settings → Shipping & delivery`);
        console.log(`→ Manage rates → Add rate → Use carrier or app → Select "BuckyDrop Shipping"`);
        
    } catch (error) {
        if (error.response) {
            console.error(`\n❌ Error: ${error.response.status} ${error.response.statusText}`);
            console.error(`   ${JSON.stringify(error.response.data, null, 2)}`);
            
            if (error.response.status === 401) {
                console.error('\n⚠️ Invalid access token. Make sure SHOPIFY_ACCESS_TOKEN is correct.');
            } else if (error.response.status === 403) {
                console.error('\n⚠️ Missing scopes. Make sure your app has:');
                console.error('   - read_shipping');
                console.error('   - write_shipping');
                console.error('   - read_orders');
            }
        } else {
            console.error(`\n❌ Error: ${error.message}`);
        }
        process.exit(1);
    }
}

registerCarrierService();

