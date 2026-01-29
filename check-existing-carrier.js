// Check if carrier service already exists and update database
const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const { shopifyApi, ApiVersion } = require('@shopify/shopify-api');
require('@shopify/shopify-api/adapters/node');
require('dotenv').config();

async function checkExisting() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify-image-enricher');
        
        const shopData = await Shop.findOne({ domain: 'app-test-1111231295.myshopify.com' });
        if (!shopData || !shopData.accessToken) {
            console.log('❌ Shop not authenticated');
            process.exit(1);
        }

        const shopify = shopifyApi({
            apiKey: process.env.SHOPIFY_API_KEY,
            apiSecretKey: process.env.SHOPIFY_API_SECRET,
            scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
            hostName: process.env.SHOPIFY_APP_URL?.replace(/^https?:\/\//, '') || 'localhost:3001',
            apiVersion: ApiVersion.April23,
        });

        const client = new shopify.clients.Rest({ 
            session: {
                shop: 'app-test-1111231295.myshopify.com',
                accessToken: shopData.accessToken
            }
        });

        console.log('Checking existing carrier services...');
        const response = await client.get({ path: 'carrier_services' });
        const services = response.body.carrier_services || [];
        
        console.log(`Found ${services.length} carrier service(s):`);
        services.forEach(cs => {
            console.log(`  - ID: ${cs.id}, Name: ${cs.name}, Callback: ${cs.callback_url}`);
        });

        // Find BuckyDrop
        const buckyDrop = services.find(cs => 
            cs.name?.toLowerCase().includes('buckydrop') ||
            cs.callback_url?.includes('buckydrop')
        );

        if (buckyDrop) {
            console.log(`\n✅ Found BuckyDrop carrier service!`);
            console.log(`   ID: ${buckyDrop.id}`);
            console.log(`   Name: ${buckyDrop.name}`);
            console.log(`   Callback: ${buckyDrop.callback_url}`);
            
            shopData.carrierServiceId = buckyDrop.id.toString();
            await shopData.save();
            console.log(`\n✅ Updated database with carrier service ID: ${buckyDrop.id}`);
        } else {
            console.log('\n❌ BuckyDrop carrier service not found');
            console.log('You may need to register it manually in Shopify Admin');
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        if (error.message.includes('merchant approval')) {
            console.error('\n⚠️ Shipping scopes need approval.');
            console.error('Visit: https://cynthia-vaccinial-teisha.ngrok-free.dev/api/auth/shopify?shop=app-test-1111231295.myshopify.com');
        }
        process.exit(1);
    }
}

checkExisting();

