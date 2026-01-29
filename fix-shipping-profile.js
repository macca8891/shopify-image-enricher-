const axios = require('axios');
require('dotenv').config();

const SHOP_DOMAIN = process.env.SHOP_DOMAIN || 'app-test-1111231295.myshopify.com';
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
    console.error('❌ SHOPIFY_ACCESS_TOKEN not found in .env');
    process.exit(1);
}

async function fixShippingProfile() {
    try {
        console.log('🔧 Fixing shipping profile...\n');
        
        // Step 1: Get all shipping profiles
        console.log('1. Fetching shipping profiles...');
        const profilesResponse = await axios.get(
            `https://${SHOP_DOMAIN}/admin/api/2025-01/shipping_profiles.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const profiles = profilesResponse.data.shipping_profiles || [];
        console.log(`   Found ${profiles.length} shipping profile(s)`);
        
        // Step 2: Find profile with the broken delivery method
        const brokenMethodId = '814522433761';
        let profileToFix = null;
        
        for (const profile of profiles) {
            if (profile.delivery_method_definitions) {
                const hasBrokenMethod = profile.delivery_method_definitions.some(
                    dm => dm.id === brokenMethodId || dm.id.toString() === brokenMethodId
                );
                if (hasBrokenMethod) {
                    profileToFix = profile;
                    console.log(`\n   Found profile with broken method: ${profile.name} (ID: ${profile.id})`);
                    break;
                }
            }
        }
        
        if (!profileToFix) {
            console.log('\n✅ No profile found with broken delivery method.');
            console.log('   The error might be from a different source.');
            console.log('\n   Try this instead:');
            console.log('   1. Go to Settings → Shipping & delivery');
            console.log('   2. Click "Manage rates"');
            console.log('   3. Delete any old "BuckyDrop Shipping" entries');
            console.log('   4. Add new rate → Use carrier or app → Select "BuckyDrop Shipping"');
            return;
        }
        
        // Step 3: Get current carrier services
        console.log('\n2. Fetching carrier services...');
        const carrierResponse = await axios.get(
            `https://${SHOP_DOMAIN}/admin/api/2025-01/carrier_services.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const buckyDrop = carrierResponse.data.carrier_services.find(
            s => s.name === 'BuckyDrop Shipping'
        );
        
        if (!buckyDrop) {
            console.log('   ❌ BuckyDrop Shipping not found!');
            return;
        }
        
        console.log(`   ✅ Found BuckyDrop Shipping (ID: ${buckyDrop.id})`);
        
        // Step 4: Update profile to remove broken method and add correct one
        console.log('\n3. Updating shipping profile...');
        
        // Filter out the broken method
        const validMethods = profileToFix.delivery_method_definitions.filter(
            dm => dm.id.toString() !== brokenMethodId
        );
        
        // Add BuckyDrop if not already present
        const hasBuckyDrop = validMethods.some(
            dm => dm.carrier_service_id === buckyDrop.id || 
                  (dm.carrier_service && dm.carrier_service.id === buckyDrop.id)
        );
        
        if (!hasBuckyDrop) {
            validMethods.push({
                carrier_service_id: buckyDrop.id
            });
            console.log('   Adding BuckyDrop Shipping to profile...');
        }
        
        // Update the profile
        const updateResponse = await axios.put(
            `https://${SHOP_DOMAIN}/admin/api/2025-01/shipping_profiles/${profileToFix.id}.json`,
            {
                shipping_profile: {
                    delivery_method_definitions: validMethods
                }
            },
            {
                headers: {
                    'X-Shopify-Access-Token': ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('   ✅ Profile updated successfully!');
        console.log(`\n✅ Fixed! Profile "${profileToFix.name}" has been updated.`);
        console.log('\n📋 Next steps:');
        console.log('1. Go to Settings → Shipping & delivery');
        console.log('2. Click "Manage rates"');
        console.log('3. You should now be able to enable BuckyDrop Shipping');
        console.log('4. Try checkout again!');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.response) {
            console.error(`   Status: ${error.response.status}`);
            console.error(`   Response:`, JSON.stringify(error.response.data, null, 2));
        }
        
        if (error.response?.status === 404) {
            console.log('\n💡 The profile might have been deleted. Try:');
            console.log('   1. Go to Settings → Shipping & delivery');
            console.log('   2. Click "Manage rates"');
            console.log('   3. Delete any old BuckyDrop entries');
            console.log('   4. Add new rate → Use carrier or app → Select "BuckyDrop Shipping"');
        }
    }
}

fixShippingProfile();

