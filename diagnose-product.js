/**
 * Diagnostic script to check why a product is failing to get shipping rates
 * Usage: node diagnose-product.js <productId>
 */

const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

async function diagnoseProduct(productId) {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify-enricher');
        console.log('✅ Connected to MongoDB');

        const product = await Product.findById(productId);
        if (!product) {
            console.error(`❌ Product ${productId} not found`);
            process.exit(1);
        }

        console.log(`\n📦 Product: ${product.title}`);
        console.log(`   ID: ${product._id}`);
        console.log(`   Shopify ID: ${product.shopifyId}`);
        console.log(`   Status: ${product.status}`);
        console.log(`   Shipping Processed: ${product.shippingProcessed || false}`);

        // Check weight
        const variant = product.variants?.[0];
        console.log(`\n⚖️ Weight Info:`);
        console.log(`   Variant weight: ${variant?.weight || 'N/A'} ${variant?.weight_unit || 'kg'}`);

        // Check metafields
        console.log(`\n📋 Metafields:`);
        if (product.metafields && product.metafields.length > 0) {
            const weightMeta = product.metafields.find(m => 
                m.key === 'weight_raw_kg_' || m.key === 'weight_raw_kg'
            );
            const diameterMeta = product.metafields.find(m => 
                m.key === 'largest_diameter_raw' || m.key === 'largest_diameter_raw_mm_'
            );
            const heightMeta = product.metafields.find(m => 
                m.key === 'height_raw' || m.key === 'height_raw_mm_'
            );

            if (weightMeta) {
                console.log(`   ✓ Weight: ${weightMeta.value} kg (${weightMeta.namespace}.${weightMeta.key})`);
            } else {
                console.log(`   ✗ Weight metafield not found`);
            }

            if (diameterMeta) {
                console.log(`   ✓ Diameter: ${diameterMeta.value} mm (${diameterMeta.namespace}.${diameterMeta.key})`);
            } else {
                console.log(`   ✗ Diameter metafield not found`);
            }

            if (heightMeta) {
                console.log(`   ✓ Height: ${heightMeta.value} mm (${heightMeta.namespace}.${heightMeta.key})`);
            } else {
                console.log(`   ✗ Height metafield not found`);
            }

            console.log(`\n   All metafields (${product.metafields.length}):`);
            product.metafields.forEach(m => {
                console.log(`     - ${m.namespace}.${m.key}: ${m.value}`);
            });
        } else {
            console.log(`   ✗ No metafields found`);
        }

        // Check shipping rates
        console.log(`\n🚚 Shipping Rates:`);
        if (product.shippingRates && product.shippingRates.length > 0) {
            console.log(`   Found ${product.shippingRates.length} address calculations`);
            const addressesWithRates = product.shippingRates.filter(sr => 
                (sr.cheapPriceUSD > 0 || sr.expressPriceUSD > 0)
            );
            const addressesWithoutRates = product.shippingRates.filter(sr => 
                (sr.cheapPriceUSD === 0 && sr.expressPriceUSD === 0)
            );
            console.log(`   - ${addressesWithRates.length} addresses with rates`);
            console.log(`   - ${addressesWithoutRates.length} addresses without rates`);

            if (addressesWithoutRates.length > 0) {
                console.log(`\n   Sample address without rates:`);
                const sample = addressesWithoutRates[0];
                console.log(`     - ${sample.countryName} (${sample.countryCode})`);
                console.log(`     - Cheap: ${sample.cheapService || 'none'} ($${sample.cheapPriceUSD})`);
                console.log(`     - Express: ${sample.expressService || 'none'} ($${sample.expressPriceUSD})`);
                console.log(`     - Routes received: ${sample.allRoutes?.length || 0}`);
            }
        } else {
            console.log(`   ✗ No shipping rates calculated`);
        }

        // Calculate what the adjusted values would be
        console.log(`\n🔧 Calculated Values (if metafields exist):`);
        const rawW = variant?.weight || 0;
        const weightAdd = Math.max(rawW * 0.15, 0.2);
        const adjW = Number((rawW + weightAdd).toFixed(3));
        console.log(`   Raw weight: ${rawW} kg`);
        console.log(`   Weight adjustment: +${weightAdd.toFixed(3)} kg`);
        console.log(`   Adjusted weight: ${adjW} kg`);

        await mongoose.disconnect();
        console.log(`\n✅ Diagnosis complete`);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

const productId = process.argv[2];
if (!productId) {
    console.error('Usage: node diagnose-product.js <productId>');
    process.exit(1);
}

diagnoseProduct(productId);






