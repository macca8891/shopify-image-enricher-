const mongoose = require('mongoose');

/**
 * Per-shop control over which BuckyDrop shipping options reach checkout.
 *
 * One document per shop. `disabledServices` holds uppercase name fragments -
 * a route is hidden when its service_name contains any of them as a substring,
 * which also catches naming variants coming out of the BuckyDrop feed.
 *
 * `autoFiltersEnabled` toggles the five automatic dedup/domination rules. Turn
 * it off to see every raw route BuckyDrop offers, then re-enable once you have
 * chosen what to hide manually.
 */
const ShippingOptionSettingsSchema = new mongoose.Schema({
    shop: { type: String, required: true, unique: true, index: true },

    disabledServices: [{ type: String }],

    // Services force-shown even when the automatic rules would hide them.
    // `disabledServices` wins if a name somehow matches both.
    forcedServices: [{ type: String }],

    autoFiltersEnabled: { type: Boolean, default: true },

    updatedAt: { type: Date, default: Date.now }
});

ShippingOptionSettingsSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

/**
 * Fetch settings for a shop, falling back to permissive defaults when MongoDB
 * is unavailable or the shop has never been configured. Never throws - the
 * carrier service must keep quoting rates even if this lookup fails.
 */
ShippingOptionSettingsSchema.statics.forShop = async function (shop) {
    const defaults = { shop, disabledServices: [], forcedServices: [], autoFiltersEnabled: true };

    if (mongoose.connection.readyState !== 1) {
        return defaults;
    }

    try {
        const doc = await this.findOne({ shop }).lean();
        return doc || defaults;
    } catch (error) {
        return defaults;
    }
};

module.exports = mongoose.model('ShippingOptionSettings', ShippingOptionSettingsSchema);
