const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

async function testActiveFilter() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify-image-enricher', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Connected to MongoDB\n');

        const shop = 'spare-part-mart.myshopify.com';

        // Test 1: Count all products
        const total = await Product.countDocuments({ shopDomain: shop });
        console.log(`Total products: ${total}\n`);

        // Test 2: Count by status
        const byStatus = await Product.aggregate([
            { $match: { shopDomain: shop } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        console.log('Products by status:');
        byStatus.forEach(item => {
            console.log(`  ${item._id || 'null/undefined'}: ${item.count}`);
        });
        console.log('');

        // Test 3: Query for active products
        const activeQuery = { shopDomain: shop, status: 'active' };
        const activeCount = await Product.countDocuments(activeQuery);
        console.log(`Products with status='active': ${activeCount}`);

        // Test 4: Get a few active products
        const activeProducts = await Product.find(activeQuery).limit(5).select('title status');
        console.log(`\nSample active products:`);
        activeProducts.forEach(p => {
            console.log(`  - ${p.title}: status=${p.status}`);
        });

        // Test 5: Get a few non-active products to see their status
        const nonActiveProducts = await Product.find({ 
            shopDomain: shop, 
            status: { $ne: 'active' } 
        }).limit(5).select('title status');
        console.log(`\nSample non-active products:`);
        nonActiveProducts.forEach(p => {
            console.log(`  - ${p.title}: status=${p.status || 'null/undefined'}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testActiveFilter();





