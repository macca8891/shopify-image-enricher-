const axios = require('axios');
require('dotenv').config();

const SHOP_DOMAIN = process.env.SHOP_DOMAIN || 'app-test-1111231295.myshopify.com';
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
    console.error('❌ SHOPIFY_ACCESS_TOKEN not found in .env');
    process.exit(1);
}

async function forceRefresh() {
    try {
        console.log('🔄 Force refreshing carrier service to clear Shopify cache...\n');
        
        // Step 1: Get current carrier services
        console.log('1. Fetching current carrier services...');
        const listResponse = await axios.get(
            `https://${SHOP_DOMAIN}/admin/api/2025-01/carrier_services.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const services = listResponse.data.carrier_services || [];
        const buckyDrop = services.find(s => s.name === 'BuckyDrop Shipping');
        
        if (!buckyDrop) {
            console.log('❌ BuckyDrop Shipping not found. Registering new service...');
            // Register new service
            const appUrl = process.env.SHOPIFY_APP_URL || 'https://cynthia-vaccinial-teisha.ngrok-free.dev';
            const callbackUrl = `${appUrl}/api/shipping/carrier-service?shop=${SHOP_DOMAIN}`;
            
            const createResponse = await axios.post(
                `https://${SHOP_DOMAIN}/admin/api/2025-01/carrier_services.json`,
                {
                    carrier_service: {
                        name: 'BuckyDrop Shipping',
                        callback_url: callbackUrl,
                        service_discovery: false,
                        format: 'xml'
                    }
                },
                {
                    headers: {
                        'X-Shopify-Access-Token': ACCESS_TOKEN,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log('✅ Carrier service registered!');
            console.log(`   ID: ${createResponse.data.carrier_service.id}`);
            console.log(`   Callback: ${callbackUrl}`);
            return;
        }
        
        console.log(`   Found BuckyDrop Shipping (ID: ${buckyDrop.id})`);
        
        // Step 2: Delete the service
        console.log('\n2. Unregistering carrier service...');
        await axios.delete(
            `https://${SHOP_DOMAIN}/admin/api/2025-01/carrier_services/${buckyDrop.id}.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': ACCESS_TOKEN
                }
            }
        );
        console.log('   ✅ Deleted');
        
        // Step 3: Wait a moment
        console.log('\n3. Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Step 4: Re-register
        console.log('\n4. Re-registering carrier service...');
        const appUrl = process.env.SHOPIFY_APP_URL || 'https://cynthia-vaccinial-teisha.ngrok-free.dev';
        const callbackUrl = `${appUrl}/api/shipping/carrier-service?shop=${SHOP_DOMAIN}`;
        
        const createResponse = await axios.post(
            `https://${SHOP_DOMAIN}/admin/api/2025-01/carrier_services.json`,
            {
                carrier_service: {
                    name: 'BuckyDrop Shipping',
                    callback_url: callbackUrl,
                    service_discovery: false,
                    format: 'xml'
                }
            },
            {
                headers: {
                    'X-Shopify-Access-Token': ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('   ✅ Re-registered!');
        console.log(`   New ID: ${createResponse.data.carrier_service.id}`);
        console.log(`   Callback: ${callbackUrl}`);
        
        console.log('\n✅ Carrier service refreshed!');
        console.log('\n📋 Next steps:');
        console.log('1. Go to Shopify Admin → Settings → Shipping & delivery');
        console.log('2. Click "Manage rates"');
        console.log('3. Make sure "BuckyDrop Shipping" is enabled');
        console.log('4. Try checkout again - you should now see 10 rates!');
        console.log('\n💡 The cheapest rate should be EUB-HB at 14.63 AUD (not 12.78!)');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Response:`, JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

forceRefresh();

