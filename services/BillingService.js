const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Billing Service for Shopify Recurring Charges
 * Handles subscription management
 */
class BillingService {
    constructor() {
        this.plans = {
            free: {
                name: 'Free',
                price: 0,
                imagesPerMonth: 100,
                features: ['100 images/month', 'Basic AI analysis', 'Manual processing']
            },
            basic: {
                name: 'Basic',
                price: 9.99,
                imagesPerMonth: 500,
                features: ['500 images/month', 'AI analysis', 'Bulk processing', 'Email support']
            },
            pro: {
                name: 'Pro',
                price: 29.99,
                imagesPerMonth: 2000,
                features: ['2,000 images/month', 'Advanced AI', 'Priority processing', 'Priority support']
            },
            premium: {
                name: 'Premium',
                price: 79.99,
                imagesPerMonth: 10000,
                features: ['Unlimited images', 'Custom AI models', 'Dedicated support', 'API access']
            }
        };
    }

    /**
     * Create a recurring application charge (subscription)
     */
    async createSubscription(shop, plan, returnUrl) {
        try {
            if (!this.plans[plan]) {
                throw new Error(`Invalid plan: ${plan}`);
            }

            const planDetails = this.plans[plan];
            
            if (plan === 'free') {
                // Free plan doesn't need Shopify billing
                return {
                    success: true,
                    plan: 'free',
                    message: 'Free plan activated'
                };
            }

            const charge = {
                recurring_application_charge: {
                    name: `${planDetails.name} Plan`,
                    price: planDetails.price,
                    return_url: returnUrl,
                    trial_days: 7, // 7-day free trial
                    test: process.env.NODE_ENV !== 'production' // Test charges in development
                }
            };

            const response = await axios.post(
                `https://${shop.domain}/admin/api/2024-01/recurring_application_charges.json`,
                charge,
                {
                    headers: {
                        'X-Shopify-Access-Token': shop.accessToken,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const createdCharge = response.data.recurring_application_charge;

            logger.info(`💳 Subscription created for ${shop.domain}: ${plan} plan`);

            return {
                success: true,
                chargeId: createdCharge.id,
                confirmationUrl: createdCharge.confirmation_url,
                status: createdCharge.status
            };

        } catch (error) {
            logger.error('Create subscription error:', error);
            throw new Error('Failed to create subscription');
        }
    }

    /**
     * Activate a recurring charge after merchant approval
     */
    async confirmSubscription(shop, chargeId) {
        try {
            // Activate the charge
            const response = await axios.post(
                `https://${shop.domain}/admin/api/2024-01/recurring_application_charges/${chargeId}/activate.json`,
                {},
                {
                    headers: {
                        'X-Shopify-Access-Token': shop.accessToken,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const activatedCharge = response.data.recurring_application_charge;

            logger.info(`✅ Subscription confirmed for ${shop.domain}`);

            return {
                success: true,
                status: activatedCharge.status,
                billingOn: activatedCharge.billing_on
            };

        } catch (error) {
            logger.error('Confirm subscription error:', error);
            throw new Error('Failed to confirm subscription');
        }
    }

    /**
     * Cancel a recurring charge
     */
    async cancelSubscription(shop) {
        try {
            if (!shop.subscription || !shop.subscription.chargeId) {
                throw new Error('No active subscription found');
            }

            await axios.delete(
                `https://${shop.domain}/admin/api/2024-01/recurring_application_charges/${shop.subscription.chargeId}.json`,
                {
                    headers: {
                        'X-Shopify-Access-Token': shop.accessToken
                    }
                }
            );

            logger.info(`❌ Subscription cancelled for ${shop.domain}`);

            return {
                success: true,
                message: 'Subscription cancelled'
            };

        } catch (error) {
            logger.error('Cancel subscription error:', error);
            throw new Error('Failed to cancel subscription');
        }
    }

    /**
     * Get current subscription status
     */
    async getSubscriptionStatus(shop) {
        try {
            if (!shop.subscription || !shop.subscription.chargeId) {
                return {
                    plan: 'free',
                    status: 'inactive',
                    imagesRemaining: this.plans.free.imagesPerMonth - (shop.usage?.totalImagesAnalyzed || 0)
                };
            }

            const response = await axios.get(
                `https://${shop.domain}/admin/api/2024-01/recurring_application_charges/${shop.subscription.chargeId}.json`,
                {
                    headers: {
                        'X-Shopify-Access-Token': shop.accessToken
                    }
                }
            );

            const charge = response.data.recurring_application_charge;

            return {
                plan: shop.subscription.plan,
                status: charge.status,
                price: charge.price,
                billingOn: charge.billing_on,
                trialEndsOn: charge.trial_ends_on,
                imagesRemaining: this.getImagesRemaining(shop)
            };

        } catch (error) {
            logger.error('Get subscription status error:', error);
            throw new Error('Failed to get subscription status');
        }
    }

    /**
     * Check if shop can process more images
     */
    canProcessImages(shop, count = 1) {
        const plan = shop.subscription?.plan || 'free';
        const planLimit = this.plans[plan].imagesPerMonth;
        
        if (plan === 'premium') {
            return true; // Unlimited
        }

        const used = shop.usage?.totalImagesAnalyzed || 0;
        return (used + count) <= planLimit;
    }

    /**
     * Get remaining images for current billing cycle
     */
    getImagesRemaining(shop) {
        const plan = shop.subscription?.plan || 'free';
        const planLimit = this.plans[plan].imagesPerMonth;
        
        if (plan === 'premium') {
            return 'Unlimited';
        }

        const used = shop.usage?.totalImagesAnalyzed || 0;
        return Math.max(0, planLimit - used);
    }

    /**
     * Get plan details
     */
    getPlanDetails(planName) {
        return this.plans[planName] || this.plans.free;
    }

    /**
     * Get all available plans
     */
    getAllPlans() {
        return this.plans;
    }
}

module.exports = BillingService;





