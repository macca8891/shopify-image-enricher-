// Emergency cleanup script to remove all BuckyDrop carrier services
const mongoose = require('mongoose');
const Shop = require('./models/Shop');
require('dotenv').config();

const { shopifyApi, ApiVersion } = require('@shopify/shopify-api');
const { restResources } = require('@shopify/shopify-api/rest/admin/2023-04');
require('@shopify/shopify-api/adapters/node');

async function emergencyCleanup() {
    try {
        console.log('🚨 Starting emergency cleanup...\n');
        
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify-image-enricher');
        console.log('✅ Connected to database\n');
        
        const shopData = await Shop.findOne({ domain: 'spare-part-mart.myshopify.com' });
        if (!shopData || !shopData.accessToken) {
            console.error('❌ Shop not authenticated');
            process.exit(1);
        }

        const shopify = shopifyApi({
            apiKey: process.env.SHOPIFY_API_KEY,
            apiSecretKey: process.env.SHOPIFY_API_SECRET,
            scopes: process.env.SHOPIFY_SCOPES?.split(',') || [],
            hostName: process.env.SHOPIFY_APP_URL || 'http://localhost:3001',
            apiVersion: ApiVersion.April23,
        });

        const session = {
            shop: 'spare-part-mart.myshopify.com',
            accessToken: shopData.accessToken,
        };

        const client = new shopify.clients.Rest({ session });

        // Get ALL carrier services
        console.log('📋 Fetching all carrier services...');
        const response = await client.get({ path: 'carrier_services' });
        const allServices = response.body.carrier_services || [];
        
        console.log(`Found ${allServices.length} carrier service(s):\n`);
        allServices.forEach(cs => {
            console.log(`  - ID: ${cs.id}, Name: ${cs.name}, Callback: ${cs.callback_url}`);
        });
        console.log('');

        // Delete ALL BuckyDrop services (by name or callback URL)
        const buckyDropServices = allServices.filter(cs => 
            cs.name?.toLowerCase().includes('buckydrop') ||
            cs.callback_url?.toLowerCase().includes('buckydrop') ||
            cs.callback_url?.toLowerCase().includes('carrier-service')
        );

        if (buckyDropServices.length === 0) {
            console.log('✅ No BuckyDrop carrier services found to delete\n');
        } else {
            console.log(`🗑️  Deleting ${buckyDropServices.length} BuckyDrop carrier service(s)...\n`);
            for (const service of buckyDropServices) {
                try {
                    await client.delete({ path: `carrier_services/${service.id}` });
                    console.log(`  ✅ Deleted: ${service.name} (ID: ${service.id})`);
                } catch (error) {
                    console.log(`  ⚠️  Could not delete ${service.name} (ID: ${service.id}): ${error.message}`);
                }
            }
            console.log('');
        }

        // Clear carrier service ID from database
        console.log('🧹 Clearing carrier service ID from database...');
        shopData.carrierServiceId = null;
        await shopData.save();
        console.log('✅ Database cleared\n');

        console.log('✅ Emergency cleanup complete!');
        console.log('\n📝 Next steps:');
        console.log('1. Wait 5-10 minutes for Shopify to clear its cache');
        console.log('2. Try accessing Settings > Shipping & delivery again');
        console.log('3. If still broken, uninstall the app from Apps page');
        
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        process.exit(1);
    }
}

emergencyCleanup();

