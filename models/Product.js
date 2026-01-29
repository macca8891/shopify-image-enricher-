const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
    url: { type: String, required: true },
    altText: String,
    position: { type: Number, default: 0 },
    shopifyId: String,
    source: { 
        type: String, 
        enum: ['shopify', 'google_search', 'manual_upload'], 
        default: 'shopify' 
    },
    analysisData: {
        labels: [String],
        colors: [String],
        text: String,
        faces: Number,
        safeSearch: {
            adult: String,
            medical: String,
            racy: String,
            spoof: String,
            violence: String
        },
        confidence: Number
    },
    dimensions: {
        width: Number,
        height: Number
    },
    fileSize: Number,
    mimeType: String,
    isSelected: { type: Boolean, default: false },
    isAIGenerated: { type: Boolean, default: false }
}, { timestamps: true });

const ProductSchema = new mongoose.Schema({
    shopifyId: { type: String, required: true, index: true },
    shopDomain: { type: String, required: true, index: true },
    title: { type: String, required: true },
    handle: String,
    description: String,
    vendor: String,
    productType: String,
    tags: [String],
    status: { 
        type: String, 
        enum: ['active', 'draft', 'archived'], 
        default: 'active',
        index: true
    },
    
    // Shipping processing status
    shippingProcessed: {
        type: Boolean,
        default: false,
        index: true
    },
    shippingProcessedAt: Date,
    
    // Shipping rate calculations (stored per address/country)
    shippingRates: [{
        addressId: String, // e.g., "addr_150"
        countryName: String,
        countryCode: String,
        province: String,
        postcode: String,
        calculatedAt: { type: Date, default: Date.now },
        // Rate data
        cheapService: String,
        expressService: String,
        cheapPriceUSD: Number,
        expressPriceUSD: Number,
        cheapOption: Object, // Full route object
        expressOption: Object, // Full route object
        allRoutes: [Object], // All available routes
        adjDimensions: Object,
        rawWeight: Number,
        adjWeight: Number,
        // Code assignment (assigned later)
        assignedCode: { type: Number, default: null }, // null until "Assign Code" is clicked
        assignedWeight: { type: Number, default: null },
        normCheapPrice: Number,
        normExpressPrice: Number
    }],
    
    // Original Shopify images
    originalImages: [ImageSchema],
    
    // AI-discovered images
    discoveredImages: [ImageSchema],

    // Variants
    variants: [{
        id: String,
        title: String,
        price: String,
        sku: String,
        weight: Number,
        weight_unit: String,
        inventory_quantity: Number
    }],
    
    // Final selected images for the product
    selectedImages: [ImageSchema],
    
    // Image enrichment status
    imageEnrichment: {
        status: { 
            type: String, 
            enum: ['pending', 'analyzing', 'searching', 'selecting', 'completed', 'failed'], 
            default: 'pending' 
        },
        lastProcessed: Date,
        searchTerms: [String],
        aiGeneratedTerms: [String],
        totalDiscovered: { type: Number, default: 0 },
        totalSelected: { type: Number, default: 0 },
        processingSteps: [{
            step: String,
            status: String,
            completedAt: Date,
            errorMessage: String
        }]
    },
    
    // Shopify metafields (for dimensions, shipping data, etc.)
    metafields: [{
        id: String,
        namespace: String,
        key: String,
        value: String,
        type: String,
        description: String
    }],
    
    // Metadata
    shopifyCreatedAt: Date,
    shopifyUpdatedAt: Date,
    lastSyncedAt: Date,
    isActive: { type: Boolean, default: true }
    
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
ProductSchema.index({ shopifyId: 1, shopDomain: 1 }, { unique: true });
ProductSchema.index({ 'imageEnrichment.status': 1 });
ProductSchema.index({ lastSyncedAt: 1 });

// Virtual for total images count
ProductSchema.virtual('totalImagesCount').get(function() {
    return (this.originalImages?.length || 0) + 
           (this.discoveredImages?.length || 0) + 
           (this.selectedImages?.length || 0);
});

// Virtual for enrichment progress
ProductSchema.virtual('enrichmentProgress').get(function() {
    const steps = this.imageEnrichment?.processingSteps || [];
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const totalSteps = 5; // analyze, search, discover, select, sync
    return Math.round((completedSteps / totalSteps) * 100);
});

// Methods
ProductSchema.methods.addDiscoveredImage = function(imageData) {
    this.discoveredImages.push(imageData);
    this.imageEnrichment.totalDiscovered = this.discoveredImages.length;
    return this.save();
};

ProductSchema.methods.selectImage = function(imageId) {
    const image = this.discoveredImages.id(imageId);
    if (image) {
        image.isSelected = true;
        this.selectedImages.push(image);
        this.imageEnrichment.totalSelected = this.selectedImages.length;
        return this.save();
    }
    return Promise.reject(new Error('Image not found'));
};

ProductSchema.methods.updateEnrichmentStatus = function(status, step = null, error = null) {
    this.imageEnrichment.status = status;
    this.imageEnrichment.lastProcessed = new Date();
    
    if (step) {
        const existingStep = this.imageEnrichment.processingSteps.find(s => s.step === step);
        if (existingStep) {
            existingStep.status = status === 'failed' ? 'failed' : 'completed';
            existingStep.completedAt = new Date();
            if (error) existingStep.errorMessage = error;
        } else {
            this.imageEnrichment.processingSteps.push({
                step,
                status: status === 'failed' ? 'failed' : 'completed',
                completedAt: new Date(),
                errorMessage: error
            });
        }
    }
    
    return this.save();
};

module.exports = mongoose.model('Product', ProductSchema);
