# BuckyDrop Shipping - Simple Setup

## What You Need

1. **Access Token** from Shopify (get it from Shopify Admin → Apps → Develop apps → Create app → Get access token)
2. **Set it in .env**:
   ```
   SHOPIFY_ACCESS_TOKEN=your_access_token_here
   SHOP_DOMAIN=app-test-1111231295.myshopify.com
   ```

3. **That's it!** The app will use the access token directly - no OAuth complexity.

## To Register Carrier Service

Just run:
```bash
node register-carrier-simple.js
```

This will register the carrier service using your access token directly.

