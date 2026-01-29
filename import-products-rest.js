// Simple script to import products using REST API (works when GraphQL is denied)
const axios = require('axios');
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const Shop = require('./models/Shop');

const SHOP_DOMAIN = process.env.SHOP_DOMAIN || 'app-test-1111231295.myshopify.com';
const ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
    console.error('❌ SHOPIFY_ACCESS_TOKEN not set in .env');
    process.exit(1);
}

async function importProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify-image-enricher');
        console.log('✅ Connected to MongoDB');

        // Get or create shop
        let shopData = await Shop.findOne({ domain: SHOP_DOMAIN });
        if (!shopData) {
            shopData = await Shop.create({ domain: SHOP_DOMAIN, accessToken: ACCESS_TOKEN });
        } else if (!shopData.accessToken) {
            shopData.accessToken = ACCESS_TOKEN;
            await shopData.save();
        }

        console.log(`📦 Fetching products from ${SHOP_DOMAIN}...`);

        let allProducts = [];
        let url = `https://${SHOP_DOMAIN}/admin/api/2025-01/products.json?limit=250`;
        let hasMore = true;

        while (hasMore && url) {
            const response = await axios.get(url, {
                headers: {
                    'X-Shopify-Access-Token': ACCESS_TOKEN,
                    'Content-Type': 'application/json'
                }
            });

            const products = response.data.products || [];
            if (products.length === 0) {
                hasMore = false;
            } else {
                allProducts.push(...products);
                console.log(`  Fetched ${products.length} products (Total: ${allProducts.length})`);
                
                // Check for next page in Link header
                const linkHeader = response.headers.link;
                if (linkHeader && linkHeader.includes('rel="next"')) {
                    const nextMatch = linkHeader.match(/<([^>]+)>; rel="next"/);
                    url = nextMatch ? nextMatch[1] : null;
                } else {
                    url = null;
                    hasMore = false;
                }

                // Fetch metafields for each product
                for (const product of products) {
                    try {
                        const metafieldsResponse = await axios.get(
                            `https://${SHOP_DOMAIN}/admin/api/2025-01/products/${product.id}/metafields.json`,
                            {
                                headers: {
                                    'X-Shopify-Access-Token': ACCESS_TOKEN
                                }
                            }
                        );
                        product.metafields = metafieldsResponse.data.metafields || [];
                    } catch (err) {
                        console.warn(`  ⚠️ Could not fetch metafields for product ${product.id}: ${err.message}`);
                        product.metafields = [];
                    }
                }
            }
        }

        console.log(`\n✅ Fetched ${allProducts.length} products total`);

        // Save to database
        let imported = 0;
        let updated = 0;

        console.log(`\n💾 Saving ${allProducts.length} products to database...`);

        for (const shopifyProduct of allProducts) {
            if (!shopifyProduct.id || !shopifyProduct.title) {
                console.warn(`  ⚠️ Skipping invalid product:`, shopifyProduct.id, shopifyProduct.title);
                continue;
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

            const existing = await Product.findOne({
                shopifyId: productData.shopifyId,
                shopDomain: SHOP_DOMAIN
            });

            try {
                if (existing) {
                    await Product.findOneAndUpdate(
                        { _id: existing._id },
                        { $set: productData },
                        { new: true, runValidators: false }
                    );
                    updated++;
                } else {
                    await Product.create(productData, { runValidators: false });
                    imported++;
                }
            } catch (err) {
                console.error(`  ⚠️ Error saving "${shopifyProduct.title}" (ID: ${shopifyProduct.id}):`, err.message);
                // Continue with next product
                continue;
            }
        }

        console.log(`\n✅ Import complete!`);
        console.log(`   - Imported: ${imported}`);
        console.log(`   - Updated: ${updated}`);
        console.log(`   - Total: ${allProducts.length}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', JSON.stringify(error.response.data, null, 2));
        }
        process.exit(1);
    }
}

importProducts();

