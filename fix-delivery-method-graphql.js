const axios = require('axios');
require('dotenv').config();

const SHOP_DOMAIN = process.env.SHOP_DOMAIN || 'app-test-1111231295.myshopify.com';
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
    console.error('❌ SHOPIFY_ACCESS_TOKEN not found in .env');
    process.exit(1);
}

async function fixWithGraphQL() {
    try {
        console.log('🔧 Fixing delivery method using GraphQL...\n');
        
        // Query to get delivery method definitions
        const query = `
            query {
                deliveryMethodDefinitions(first: 50) {
                    edges {
                        node {
                            id
                            name
                            carrierService {
                                id
                                name
                            }
                        }
                    }
                }
            }
        `;
        
        const response = await axios.post(
            `https://${SHOP_DOMAIN}/admin/api/2025-01/graphql.json`,
            { query },
            {
                headers: {
                    'X-Shopify-Access-Token': ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        if (response.data.errors) {
            console.error('GraphQL Errors:', JSON.stringify(response.data.errors, null, 2));
            throw new Error('GraphQL query failed');
        }
        
        const definitions = response.data.data.deliveryMethodDefinitions.edges || [];
        console.log(`Found ${definitions.length} delivery method definitions`);
        
        const brokenId = 'gid://shopify/DeliveryMethodDefinition/814522433761';
        const brokenMethod = definitions.find(d => d.node.id === brokenId);
        
        if (brokenMethod) {
            console.log(`\nFound broken method: ${brokenMethod.node.name}`);
            console.log('This method needs to be removed from shipping profiles.');
        } else {
            console.log('\n✅ Broken delivery method not found (might already be removed)');
        }
        
        console.log('\n📋 SOLUTION:');
        console.log('The delivery method definition is stuck in a shipping profile.');
        console.log('You need to fix this manually in Shopify Admin:');
        console.log('');
        console.log('1. Go to Settings → Shipping & delivery');
        console.log('2. Click "Manage rates"');
        console.log('3. Look for any shipping profile that has an error');
        console.log('4. Click on that profile');
        console.log('5. Remove any broken/old "BuckyDrop Shipping" entries');
        console.log('6. Click "Add rate" → "Use carrier or app"');
        console.log('7. Select "BuckyDrop Shipping"');
        console.log('8. Save');
        console.log('');
        console.log('OR:');
        console.log('1. Go to Settings → Shipping & delivery');
        console.log('2. Click "Manage rates"');
        console.log('3. Delete the entire shipping profile with the error');
        console.log('4. Create a new profile');
        console.log('5. Add "BuckyDrop Shipping" as a rate');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Response:`, JSON.stringify(error.response.data, null, 2));
        }
        
        console.log('\n📋 MANUAL FIX REQUIRED:');
        console.log('Shopify Admin doesn\'t expose an API to fix this directly.');
        console.log('You need to:');
        console.log('');
        console.log('1. Go to Settings → Shipping & delivery');
        console.log('2. Click "Manage rates"');
        console.log('3. Find the shipping profile with the error');
        console.log('4. Delete any old "BuckyDrop Shipping" entries');
        console.log('5. Add new rate → Use carrier or app → Select "BuckyDrop Shipping"');
    }
}

fixWithGraphQL();

