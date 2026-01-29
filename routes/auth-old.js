const express = require('express');
const Shop = require('../models/Shop');
const logger = require('../utils/logger');

const router = express.Router();

// Initialize Shopify API only if credentials are available
let shopify = null;
if (process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET) {
    try {
        const { shopifyApi, ApiVersion, DeliveryMethod } = require('@shopify/shopify-api');
        const { restResources } = require('@shopify/shopify-api/rest/admin/2023-04');
        require('@shopify/shopify-api/adapters/node');
        
        // Clean up hostName - Shopify API expects just the domain without protocol
        let hostName = process.env.SHOPIFY_APP_URL || 'localhost:3001';
        hostName = hostName.trim();
        // Remove protocol if present
        hostName = hostName.replace(/^https?:\/\//, '');
        // Remove any trailing slashes
        hostName = hostName.replace(/\/+$/, '');
        
        shopify = shopifyApi({
            apiKey: process.env.SHOPIFY_API_KEY,
            apiSecretKey: process.env.SHOPIFY_API_SECRET,
            scopes: process.env.SHOPIFY_SCOPES?.split(',') || ['read_products', 'write_products', 'read_orders', 'read_shipping', 'write_shipping'],
            hostName: hostName,
            apiVersion: ApiVersion.April23,
            isEmbeddedApp: false, // Disable embedded mode - we'll access directly via URL
            restResources,
            webhooks: {
                callback_url: '/api/webhooks',
                delivery_method: DeliveryMethod.Http,
            }
        });
        logger.info('✅ Shopify OAuth configured');
    } catch (error) {
        logger.warn('⚠️ Shopify OAuth not configured:', error.message);
    }
} else {
    logger.info('ℹ️ Shopify OAuth not configured (SHOPIFY_API_KEY/SECRET missing) - OAuth features disabled');
}

// OAuth route - start authentication
router.get('/shopify', async (req, res) => {
    if (!shopify) {
        return res.status(503).json({ 
            error: 'Shopify OAuth not configured', 
            message: 'Please add SHOPIFY_API_KEY and SHOPIFY_API_SECRET to your .env file to use OAuth features'
        });
    }
    
    try {
        let { shop } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        // Ensure shop domain is properly formatted
        shop = shop.toString().trim();
        
        // Remove any trailing slashes or query params
        shop = shop.split('?')[0].split('/')[0];
        
        // Ensure it ends with .myshopify.com
        if (!shop.endsWith('.myshopify.com')) {
            if (shop.includes('.')) {
                // If it has a dot but doesn't end with .myshopify.com, it might be incomplete
                logger.warn(`Shop domain may be incomplete: ${shop}`);
            } else {
                // If no dot, assume it's just the shop name
                shop = `${shop}.myshopify.com`;
            }
        }

        logger.info(`🔗 Starting OAuth for shop: ${shop}`);

        // Store the redirect URL in a query parameter so we can use it after OAuth
        const appUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3001';
        const redirectAfterAuth = `${appUrl}/?shop=${encodeURIComponent(shop)}`;
        
        // Add redirect parameter to callback path
        const callbackPath = `/api/auth/shopify/callback?redirect=${encodeURIComponent(redirectAfterAuth)}`;

        // shopify.auth.begin() handles the redirect internally via rawResponse
        // Don't call res.redirect() after it
        await shopify.auth.begin({
            shop: shop,
            callbackPath: callbackPath,
            isOnline: false, // We want offline tokens for background processing
            rawRequest: req,
            rawResponse: res,
        });
        
        // Response is already sent by shopify.auth.begin(), so don't send another

    } catch (error) {
        logger.error('OAuth initiation error:', error);
        res.status(500).json({ error: 'Failed to initiate authentication' });
    }
});

// OAuth callback route
router.get('/shopify/callback', async (req, res) => {
    if (!shopify) {
        return res.status(503).json({ 
            error: 'Shopify OAuth not configured'
        });
    }
    
    try {
        const callback = await shopify.auth.callback({
            rawRequest: req,
            rawResponse: res,
        });

        const { shop, accessToken, scope } = callback.session;

        // Save or update shop information
        const shopData = await Shop.findOneAndUpdate(
            { domain: shop },
            {
                domain: shop,
                accessToken: accessToken,
                scope: scope,
                lastActiveAt: new Date(),
                isActive: true
            },
            { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true
            }
        );

        // Get shop information from Shopify
        try {
            const client = new shopify.clients.Rest({ session: callback.session });
            const shopInfo = await client.get({ path: 'shop' });
            
            // Update shop with additional information
            shopData.name = shopInfo.body.shop.name;
            shopData.email = shopInfo.body.shop.email;
            shopData.currency = shopInfo.body.shop.currency;
            shopData.timezone = shopInfo.body.shop.timezone;
            shopData.country = shopInfo.body.shop.country_name;
            await shopData.save();

        } catch (shopInfoError) {
            logger.warn('Could not fetch shop info:', shopInfoError);
        }

        logger.info(`✅ OAuth completed for shop: ${shop}`);

        // Get redirect URL from query parameter (set during OAuth start)
        const redirectUrl = req.query.redirect || `${process.env.SHOPIFY_APP_URL || 'http://localhost:3001'}/?shop=${shop}`;
        
        logger.info(`Redirecting to: ${redirectUrl}`);
        
        // Use a meta refresh or JavaScript redirect to avoid Shopify Admin redirect
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta http-equiv="refresh" content="0;url=${redirectUrl}">
                <script>window.location.href = ${JSON.stringify(redirectUrl)};</script>
            </head>
            <body>
                <p>Redirecting... <a href="${redirectUrl}">Click here if not redirected</a></p>
            </body>
            </html>
        `);

    } catch (error) {
        logger.error('OAuth callback error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Verify shop authentication
router.get('/verify', async (req, res) => {
    try {
        const { shop } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        
        if (!shopData || !shopData.accessToken) {
            return res.status(401).json({ 
                authenticated: false, 
                message: 'Shop not authenticated' 
            });
        }

        // Update last active timestamp
        shopData.lastActiveAt = new Date();
        await shopData.save();

        res.json({
            authenticated: true,
            shop: {
                domain: shopData.domain,
                name: shopData.name,
                currency: shopData.currency,
                plan: shopData.subscription.plan,
                usage: shopData.usage,
                remainingAPICalls: shopData.remainingAPICalls
            }
        });

    } catch (error) {
        logger.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Get shop information
router.get('/shop', async (req, res) => {
    try {
        const { shop } = req.query;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        
        if (!shopData) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        res.json({
            domain: shopData.domain,
            name: shopData.name,
            email: shopData.email,
            currency: shopData.currency,
            timezone: shopData.timezone,
            country: shopData.country,
            settings: shopData.settings,
            usage: shopData.usage,
            subscription: shopData.subscription,
            remainingAPICalls: shopData.remainingAPICalls,
            monthlyAPILimit: shopData.monthlyAPILimit
        });

    } catch (error) {
        logger.error('Shop info error:', error);
        res.status(500).json({ error: 'Failed to get shop information' });
    }
});

// Manual authentication (for development/custom apps)
router.post('/manual', async (req, res) => {
    try {
        const { shop, accessToken } = req.body;
        
        if (!shop || !accessToken) {
            return res.status(400).json({ error: 'Shop and Access Token are required' });
        }

        const shopData = await Shop.findOneAndUpdate(
            { domain: shop },
            {
                domain: shop,
                accessToken: accessToken,
                scope: 'read_products,write_products', // Default scopes
                lastActiveAt: new Date(),
                isActive: true
            },
            { 
                upsert: true, 
                new: true,
                setDefaultsOnInsert: true
            }
        );

        logger.info(`✅ Manual authentication configured for shop: ${shop}`);
        res.json({ success: true, shop: shopData });

    } catch (error) {
        logger.error('Manual auth error:', error);
        res.status(500).json({ error: 'Failed to configure manual authentication' });
    }
});

// Update shop settings
router.put('/shop/settings', async (req, res) => {
    try {
        const { shop } = req.query;
        const settings = req.body;
        
        if (!shop) {
            return res.status(400).json({ error: 'Shop parameter is required' });
        }

        const shopData = await Shop.findOne({ domain: shop });
        
        if (!shopData) {
            return res.status(404).json({ error: 'Shop not found' });
        }

        await shopData.updateSettings(settings);

        logger.info(`⚙️ Settings updated for shop: ${shop}`);
        res.json({ success: true, message: 'Settings updated successfully' });

    } catch (error) {
        logger.error('Settings update error:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
