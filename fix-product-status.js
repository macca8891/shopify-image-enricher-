const mongoose = require('mongoose');
const Product = require('./models/Product');
require('dotenv').config();

async function checkAndFixStatus() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify-image-enricher', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Connected to MongoDB\n');

        // Check products without status
        const productsWithoutStatus = await Product.find({
            $or: [
                { status: { $exists: false } },
                { status: null },
                { status: undefined }
            ]
        });

        console.log(`Found ${productsWithoutStatus.length} products without status field\n`);

        if (productsWithoutStatus.length > 0) {
            // Set default status to 'active' for products without status
            const result = await Product.updateMany(
                {
                    $or: [
                        { status: { $exists: false } },
                        { status: null }
                    ]
                },
                { $set: { status: 'active' } }
            );
            console.log(`✅ Updated ${result.modifiedCount} products to have status 'active'\n`);
        }

        // Check status distribution
        const statusCounts = await Product.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        console.log('Status distribution:');
        statusCounts.forEach(item => {
            console.log(`  ${item._id || 'null/undefined'}: ${item.count}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAndFixStatus();





