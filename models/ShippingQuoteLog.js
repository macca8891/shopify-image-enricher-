const mongoose = require('mongoose');

/**
 * One shipping quote: a product page estimate, the cart page estimator or a checkout
 * rate request (Michael, 26 Nov 2026: "keep track of the products, the location, the prices").
 *
 * Destination is country, region, postcode and city only. Names, emails, phones,
 * companies and street addresses that Shopify sends at checkout are never stored.
 * Rows expire after 400 days.
 */
const ShippingQuoteLogSchema = new mongoose.Schema({
    at: { type: Date, default: Date.now },
    source: { type: String, index: true },      // pdp | cart | checkout | desk | other
    country: String,
    province: String,
    postal_code: String,
    city: String,
    currency: String,                            // currency Shopify asked in
    cart_value_cents: Number,                    // sum of item price x quantity, in `currency`
    items: [{
        _id: false,
        product_id: Number, variant_id: Number, sku: String, title: String,
        quantity: Number, grams: Number, price_cents: Number
    }],
    rates: [{
        _id: false,
        service: String, price_cents: Number, currency: String,
        usd: Number, min_date: String, max_date: String, note: String
    }],
    rate_count: Number,
    cached: Boolean,
    ms: Number,
    status: Number
});
ShippingQuoteLogSchema.index({ at: 1 }, { expireAfterSeconds: 400 * 86400, name: 'at_ttl' });

module.exports = mongoose.models.ShippingQuoteLog
    || mongoose.model('ShippingQuoteLog', ShippingQuoteLogSchema);
