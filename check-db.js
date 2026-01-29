const mongoose = require('mongoose');
const Shop = require('./models/Shop');
const Product = require('./models/Product');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify-image-enricher', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(async () => {
    console.log('Connected to MongoDB');
    
    const shops = await Shop.find({});
    console.log('Shops found:', shops.length);
    shops.forEach(s => {
        console.log(`- Domain: ${s.domain}, AccessToken: ${s.accessToken ? 'Present' : 'Missing'}`);
    });

    const products = await Product.find({});
    console.log('Products found:', products.length);
    if (products.length > 0) {
        console.log('Sample product shopDomain:', products[0].shopDomain);
    }

    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});





