// Early logging to verify server.js is executing
console.log('🚀 Server.js starting...');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
console.log('✅ Logger loaded');

// Clear require cache for routes to ensure fresh code on restart
if (process.env.NODE_ENV !== 'production') {
    delete require.cache[require.resolve('./routes/products')];
    delete require.cache[require.resolve('./routes/shipping')];
}

// Import routes (with error handling)
let authRoutes, productRoutes, imageRoutes, pipelineRoutes, buckyDropRoutes, shippingRoutes, webhookRoutes;
try {
    console.log('Loading routes...');
    authRoutes = require('./routes/auth');
    productRoutes = require('./routes/products');
    imageRoutes = require('./routes/images');
    pipelineRoutes = require('./routes/pipeline');
    buckyDropRoutes = require('./routes/buckydrop');
    shippingRoutes = require('./routes/shipping');
    webhookRoutes = require('./routes/webhooks');
    console.log('✅ Routes loaded');
} catch (error) {
    console.error('❌ Error loading routes:', error);
    throw error;
}

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.shopify.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "https:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
        },
    },
}));

// Compression middleware - SKIP carrier-service endpoint (Shopify rejects compressed XML)
app.use(compression({
    filter: (req, res) => {
        // Don't compress carrier service endpoint - Shopify expects uncompressed XML
        if (req.path === '/api/shipping/carrier-service') {
            return false;
        }
        // Use default compression filter for other routes
        return compression.filter(req, res);
    }
}));

// CORS configuration
// Allow Google Apps Script and other origins
const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [process.env.SHOPIFY_APP_URL] 
    : [
        'http://localhost:3001', 
        'https://admin.shopify.com',
        'https://cynthia-vaccinial-teisha.ngrok-free.dev',
        process.env.SHOPIFY_APP_URL
    ].filter(Boolean);

// Always allow Google Apps Script origins
allowedOrigins.push('https://script.google.com');

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman, or Google Apps Script)
        if (!origin) return callback(null, true);
        
        // Check if origin is allowed
        if (allowedOrigins.indexOf(origin) !== -1) {
            return callback(null, true);
        }
        
        // Allow Google Apps Script origins (they use various subdomains)
        if (origin.includes('googleusercontent.com') || origin.includes('google.com')) {
            return callback(null, true);
        }
        
        // Allow ngrok URLs
        if (origin.includes('ngrok')) {
            return callback(null, true);
        }
        
        // Allow Shopify admin URLs
        if (origin.includes('myshopify.com') || origin.includes('shopify.com')) {
            return callback(null, true);
        }
        
        // For development, allow all origins to avoid CORS issues
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

// Capture raw body for webhook verification
app.use(express.json({
    limit: '10mb',
    verify: (req, res, buf) => {
        req.rawBody = buf.toString('utf8');
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/buckydrop', buckyDropRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/webhooks', webhookRoutes);

// Serve embedded app for Shopify admin (check for embedded context)
app.get('/', (req, res) => {
    // Check if request is from Shopify admin (embedded app)
    const shop = req.query.shop;
    const hmac = req.query.hmac;
    const isEmbedded = req.headers['sec-fetch-site'] === 'same-origin' || 
                       req.headers.referer?.includes('admin.shopify.com') ||
                       hmac; // HMAC indicates embedded app request
    
    if (isEmbedded && shop) {
        // Serve embedded app interface
        res.sendFile(path.join(__dirname, 'public', 'embedded-app.html'));
    } else {
        // Serve standalone app interface
        res.sendFile(path.join(__dirname, 'public', 'app.html'));
    }
});

// Static files (AFTER routes to avoid serving index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server first (non-blocking)
try {
    app.listen(PORT, () => {
        console.log(`🚀 Server listening on port ${PORT}`);
        logger.info(`🚀 BuckyDrop Shipping running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'undefined'}`);
        logger.info(`MONGODB_URI: ${process.env.MONGODB_URI ? 'SET (' + process.env.MONGODB_URI.substring(0, 30) + '...)' : 'NOT SET'}`);
        logger.info(`SHOPIFY_API_KEY: ${process.env.SHOPIFY_API_KEY ? 'SET' : 'NOT SET'}`);
        logger.info(`🚚 Ready to calculate shipping rates!`);
    });
} catch (error) {
    console.error('❌ Error starting server:', error);
    logger.error('❌ Error starting server:', error);
    process.exit(1);
}

// MongoDB connection (non-blocking - don't exit on failure)
console.log('🔍 Checking MongoDB connection...');
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopify-image-enricher';
console.log('MongoDB URI check:', mongoUri ? `SET (${mongoUri.substring(0, 30)}...)` : 'NOT SET');
console.log('Is localhost?', mongoUri.includes('localhost'));

if (mongoUri && !mongoUri.includes('localhost')) {
    console.log('🔄 Attempting MongoDB connection...');
    mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000, // 10 second timeout
        socketTimeoutMS: 45000,
    })
    .then(() => {
        console.log('✅ Connected to MongoDB');
        logger.info('✅ Connected to MongoDB');
    })
    .catch((error) => {
        console.error('❌ MongoDB connection error:', error.message);
        logger.error('❌ MongoDB connection error:', error.message);
        logger.warn('⚠️ App will continue without MongoDB. Some features may be limited.');
        // Don't exit - let the app run without MongoDB
    });
} else {
    console.warn('⚠️ MONGODB_URI not set or using localhost. MongoDB features disabled.');
    logger.warn('⚠️ MONGODB_URI not set or using localhost. MongoDB features disabled.');
}

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    mongoose.connection.close();
    process.exit(0);
});

module.exports = app;
