// Import a single product to debug
const axios = require('axios');
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Shop = require('./models/Shop');

const SHOP_DOMAIN = process.env.SHOP_DOMAIN || 'app-test-1111231295.myshopify.com';
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const PRODUCT_ID = '9359570010337';

async function importProduct() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify-image-enricher');
        console.log('✅ Connected to MongoDB');

        const response = await axios.get(
            `https://${SHOP_DOMAIN}/admin/api/2025-01/products/${PRODUCT_ID}.json`,
            {
                headers: {
                    'X-Shopify-Access-Token': ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );

        const shopifyProduct = response.data.product;
        console.log(`\n📦 Product: ${shopifyProduct.title}`);
        console.log(`   ID: ${shopifyProduct.id}`);
        console.log(`   Variants: ${shopifyProduct.variants.length}`);
        console.log(`   Variant IDs: ${shopifyProduct.variants.map(v => v.id).join(', ')}`);

        // Fetch metafields
        try {
            const metafieldsResponse = await axios.get(
                `https://${SHOP_DOMAIN}/admin/api/2025-01/products/${PRODUCT_ID}/metafields.json`,
                {
                    headers: {
                        'X-Shopify-Access-Token': ACCESS_TOKEN
                    }
                }
            );
            shopifyProduct.metafields = metafieldsResponse.data.metafields || [];
            console.log(`   Metafields: ${shopifyProduct.metafields.length}`);
        } catch (err) {
            console.warn(`   ⚠️ Could not fetch metafields: ${err.message}`);
            shopifyProduct.metafields = [];
        }

        const productData = {
            shopifyId: shopifyProduct.id.toString(),
            shopDomain: SHOP_DOMAIN,
            title: shopifyProduct.title,
            handle: shopifyProduct.handle,
            description: shopifyProduct.body_html || '',
            vendor: shopifyProduct.vendor || '',
            productType: shopifyProduct.product_type || '',
            tags: shopifyProduct.tags ? shopifyProduct.tags.split(',').map(t => t.trim()) : [],
            status: shopifyProduct.status || 'active',
            variants: shopifyProduct.variants.map(v => ({
                id: v.id.toString(),
                title: v.title,
                price: v.price,
                sku: v.sku || '',
                weight: v.weight || 0,
                weight_unit: v.weight_unit || 'kg',
                inventory_quantity: v.inventory_quantity || 0
            })),
            originalImages: shopifyProduct.images.map(img => ({
                url: img.src,
                altText: img.alt || shopifyProduct.title,
                position: img.position || 0,
                shopifyId: img.id.toString(),
                source: 'shopify'
            })),
            metafields: (shopifyProduct.metafields || []).map(m => ({
                id: m.id ? m.id.toString() : '',
                namespace: m.namespace || '',
                key: m.key || '',
                value: m.value ? String(m.value) : '',
                type: m.type || '',
                description: m.description || ''
            })),
            shopifyCreatedAt: new Date(shopifyProduct.created_at),
            shopifyUpdatedAt: new Date(shopifyProduct.updated_at),
            lastSyncedAt: new Date()
        };

        console.log(`\n💾 Saving product...`);
        console.log(`   Variant IDs in productData: ${productData.variants.map(v => v.id).join(', ')}`);

        const existing = await Product.findOne({
            shopifyId: productData.shopifyId,
            shopDomain: SHOP_DOMAIN
        });

        console.log(`   ProductData keys: ${Object.keys(productData)}`);
        console.log(`   title: ${productData.title}`);
        console.log(`   shopDomain: ${productData.shopDomain}`);
        console.log(`   shopifyId: ${productData.shopifyId}`);

        if (existing) {
            console.log(`   Product exists, updating...`);
            const updated = await Product.findOneAndUpdate(
                { _id: existing._id },
                productData,
                { new: true, runValidators: false, upsert: false }
            );
            console.log(`   ✅ Updated: ${updated ? updated.title : 'null'}`);
        } else {
            console.log(`   Product new, creating...`);
            // Try using new Product() instead of create()
            const newProduct = new Product(productData);
            await newProduct.save({ validateBeforeSave: false });
            console.log(`   ✅ Created: ${newProduct.title}`);
        }

        // Verify it's saved
        const saved = await Product.findOne({
            shopifyId: PRODUCT_ID,
            shopDomain: SHOP_DOMAIN
        });
        
        if (saved) {
            console.log(`\n✅ Product saved successfully!`);
            console.log(`   Title: ${saved.title}`);
            console.log(`   Variants: ${saved.variants.length}`);
            console.log(`   Variant IDs: ${saved.variants.map(v => v.id).join(', ')}`);
        } else {
            console.log(`\n❌ Product not found after save!`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        console.error('   Stack:', error.stack);
        process.exit(1);
    }
}

importProduct();

