const mongoose = require('mongoose');

const ShopSchema = new mongoose.Schema({
    domain: { type: String, required: true, unique: true, index: true },
    accessToken: { type: String, required: true },
    scope: String,
    
    // Shop information
    name: String,
    email: String,
    currency: String,
    timezone: String,
    country: String,
    
    // App settings
    settings: {
        // Image search preferences
        imageSearch: {
            enabled: { type: Boolean, default: true },
            maxResults: { type: Number, default: 20 },
            safeSearch: { type: String, enum: ['off', 'moderate', 'strict'], default: 'moderate' },
            fileTypes: [{ type: String, enum: ['jpg', 'jpeg', 'png', 'webp', 'gif'], default: ['jpg', 'jpeg', 'png', 'webp'] }],
            minWidth: { type: Number, default: 400 },
            minHeight: { type: Number, default: 400 }
        },
        
        // AI analysis preferences
        aiAnalysis: {
            enabled: { type: Boolean, default: true },
            detectLabels: { type: Boolean, default: true },
            detectText: { type: Boolean, default: true },
            detectFaces: { type: Boolean, default: false },
            detectColors: { type: Boolean, default: true },
            safeSearchFilter: { type: Boolean, default: true },
            confidenceThreshold: { type: Number, default: 0.7 }
        },
        
        // Auto-processing settings
        autoProcessing: {
            enabled: { type: Boolean, default: false },
            processNewProducts: { type: Boolean, default: false },
            autoSelectImages: { type: Boolean, default: false },
            maxImagesPerProduct: { type: Number, default: 5 }
        },
        
        // Notification preferences
        notifications: {
            email: { type: Boolean, default: true },
            webhook: { type: Boolean, default: false },
            webhookUrl: String
        },
        
        // Bulk image pipeline settings
        imagePipeline: {
            enabled: { type: Boolean, default: true },
            removeBgApiKey: String,
            defaultBgColor: { type: String, default: '#FFFFFF' },
            defaultTargetSize: { type: Number, default: 2048 },
            defaultConcurrency: { type: Number, default: 3 },
            watermarkEnabled: { type: Boolean, default: false },
            watermarkImage: String,
            watermarkText: String,
            watermarkOpacity: { type: Number, default: 0.12 },
            watermarkScale: { type: Number, default: 0.35 },
            autoUpload: { type: Boolean, default: true },
            replaceStrategy: { type: String, enum: ['append', 'replace_all', 'replace_featured'], default: 'append' }
        }
    },
    
    // Usage tracking
    usage: {
        totalProductsProcessed: { type: Number, default: 0 },
        totalImagesAnalyzed: { type: Number, default: 0 },
        totalImagesDiscovered: { type: Number, default: 0 },
        totalAPICallsThisMonth: { type: Number, default: 0 },
        lastResetDate: { type: Date, default: Date.now }
    },
    
    // Subscription/billing
    subscription: {
        plan: { type: String, enum: ['free', 'basic', 'pro', 'premium'], default: 'free' },
        status: { type: String, enum: ['active', 'cancelled', 'expired', 'pending'], default: 'active' },
        chargeId: String, // Shopify recurring charge ID
        billingOn: Date, // Next billing date
        trialEndsOn: Date, // Trial end date
        expiresAt: Date,
        billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
        cancelledAt: Date
    },
    
    // App installation tracking
    installedAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now },
    uninstalledAt: Date,
    isActive: { type: Boolean, default: true },
    
    // Carrier Calculated Shipping
    carrierServiceId: String
    
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
ShopSchema.index({ domain: 1 }, { unique: true });
ShopSchema.index({ 'subscription.status': 1 });
ShopSchema.index({ lastActiveAt: 1 });

// Virtual for monthly image limit based on plan
ShopSchema.virtual('monthlyImageLimit').get(function() {
    const limits = {
        free: 100,
        basic: 500,
        pro: 2000,
        premium: 999999 // Effectively unlimited
    };
    return limits[this.subscription.plan] || limits.free;
});

// Virtual for monthly API call limit based on plan
ShopSchema.virtual('monthlyAPILimit').get(function() {
    const limits = {
        free: 100,
        basic: 1000,
        pro: 5000,
        premium: 25000
    };
    return limits[this.subscription.plan] || limits.free;
});

// Virtual for remaining API calls this month
ShopSchema.virtual('remainingAPICalls').get(function() {
    return Math.max(0, this.monthlyAPILimit - this.usage.totalAPICallsThisMonth);
});

// Methods
ShopSchema.methods.incrementUsage = function(type, count = 1) {
    switch(type) {
        case 'products':
            this.usage.totalProductsProcessed += count;
            break;
        case 'images_analyzed':
            this.usage.totalImagesAnalyzed += count;
            break;
        case 'images_discovered':
            this.usage.totalImagesDiscovered += count;
            break;
        case 'api_calls':
            this.usage.totalAPICallsThisMonth += count;
            break;
    }
    this.lastActiveAt = new Date();
    return this.save();
};

ShopSchema.methods.resetMonthlyUsage = function() {
    const now = new Date();
    const lastReset = this.usage.lastResetDate;
    
    // Reset if it's been more than a month
    if (!lastReset || (now.getTime() - lastReset.getTime()) > (30 * 24 * 60 * 60 * 1000)) {
        this.usage.totalAPICallsThisMonth = 0;
        this.usage.lastResetDate = now;
        return this.save();
    }
    
    return Promise.resolve(this);
};

ShopSchema.methods.canMakeAPICall = function() {
    return this.remainingAPICalls > 0;
};

ShopSchema.methods.updateSettings = function(settingsUpdate) {
    Object.assign(this.settings, settingsUpdate);
    return this.save();
};

module.exports = mongoose.model('Shop', ShopSchema);
