# BuckyDrop Shipping App - Complete Overview

## What This App Does

**BuckyDrop Shipping** is a Shopify app that integrates with Shopify's Carrier Calculated Shipping (CCS) API to display real-time shipping rates from BuckyDrop at checkout. It's a **private app** (not for public distribution) that:

1. **Reads product data** from Shopify (dimensions, weight from metafields)
2. **Calls BuckyDrop API** to calculate shipping rates based on cart contents and destination
3. **Returns multiple shipping options** (up to 10 cheapest rates) to Shopify checkout
4. **Handles currency conversion** from RMB (BuckyDrop) → USD → Checkout currency (AUD, USD, EUR, GBP, CAD, NZD)

## Technical Architecture

### Stack
- **Backend**: Node.js + Express.js
- **Database**: MongoDB (stores shop data, carrier service IDs)
- **APIs**: 
  - Shopify Admin API (REST & GraphQL)
  - BuckyDrop Shipping API
- **Format**: JSON responses (recently switched from XML)
- **Tunneling**: ngrok for local development (HTTPS required)

### Key Files

#### Core Server
- `server.js` - Main Express server, middleware setup, route mounting
- `routes/shipping.js` - Carrier service callback endpoint (`/api/shipping/carrier-service`)
- `services/ShippingService.js` - Business logic for rate calculation, filtering, selection
- `services/BuckyDropService.js` - BuckyDrop API integration

#### Models
- `models/Shop.js` - MongoDB schema for shop data (domain, accessToken, carrierServiceId)
- `models/Product.js` - Product schema (not actively used - we fetch directly from Shopify API)

#### Frontend
- `public/app.html` - Main UI for managing carrier service (register/unregister/status)

### API Endpoints

#### Carrier Service Callback (CRITICAL)
- **POST** `/api/shipping/carrier-service`
- **Purpose**: Shopify calls this during checkout to get shipping rates
- **Request**: Shopify sends XML with cart items, destination, currency
- **Response**: JSON format with rates array:
```json
{
  "rates": [
    {
      "service_name": "EUB-HB (21-35 days)",
      "service_code": "EUB_HB_0_2031",
      "total_price": "2031",  // cents as string
      "currency": "AUD",
      "min_delivery_date": "2026-02-17",
      "max_delivery_date": "2026-03-03"
    }
  ]
}
```

#### Carrier Service Management
- **POST** `/api/shipping/register-carrier-service` - Register with Shopify
- **POST** `/api/shipping/unregister-carrier-service` - Unregister from Shopify
- **GET** `/api/shipping/carrier-service-status` - Check registration status
- **GET** `/api/shipping/list-carrier-services` - List all carrier services

#### Other Endpoints
- **GET** `/api/auth/shopify` - OAuth initiation
- **GET** `/api/auth/shopify/callback` - OAuth callback
- **GET** `/` - Main app UI

## How It Works

### 1. Registration Flow
1. User installs app in Shopify Partners/Dev Dashboard
2. App completes OAuth flow, gets access token
3. User clicks "Register Carrier Service" in app UI
4. App calls Shopify Admin API to create carrier service:
   - Name: "BuckyDrop Shipping"
   - Callback URL: `https://your-ngrok-url/api/shipping/carrier-service`
   - Format: `json` (recently changed from `xml`)
   - Service Discovery: `false`

### 2. Checkout Flow (When Customer Adds to Cart)
1. Customer adds product to cart and enters shipping address
2. Shopify calls our callback endpoint: `POST /api/shipping/carrier-service`
3. Request includes:
   - Cart items (product-id, variant-id, quantity, grams)
   - Destination (country, province, postal-code, address)
   - Currency (AUD, USD, etc.)

4. Our app processes:
   - Parses XML request from Shopify
   - Extracts product IDs and destination
   - Fetches product metafields from Shopify API:
     - `custom.largest_diameter_raw` (dimensions)
     - `custom.height_raw` (height)
     - `weight_raw_kg_` (weight, optional - falls back to variant weight)
   - Calls BuckyDrop API with dimensions/weight/destination
   - Receives 20+ shipping routes from BuckyDrop
   - Filters routes (removes unavailable, invalid, duplicates)
   - Converts prices: RMB → USD → Checkout currency
   - Calculates delivery dates from transit times
   - Returns top 10 cheapest rates as JSON

5. Shopify displays rates at checkout

### 3. Rate Calculation Logic

**ShippingService.js** handles:
- **Filtering**: Removes routes with `available: false`, `totalPrice: 0`, or missing data
- **Selection**: Identifies "cheap" and "express" options based on:
  - Express: ≤10 days transit, premium carriers (DHL, FedEx, UPS)
  - Cheap: Lowest price option
- **Currency Conversion**: 
  - BuckyDrop returns prices in RMB
  - Convert RMB → USD using exchange rate
  - Convert USD → Checkout currency (AUD, USD, EUR, GBP, CAD, NZD)
- **Price Formatting**: Converts to cents (string) for Shopify

## Current Status

### ✅ Working
- App receives requests from Shopify
- Successfully calls BuckyDrop API
- Calculates rates correctly
- Returns valid JSON response with 10 rates
- Response time: ~1.6 seconds (well under 5-second limit)

### ⚠️ Current Issue
- **Problem**: Shopify shows "Shipping not available" at checkout
- **Symptoms**: 
  - Backend logs show 10 rates being sent correctly
  - Shopify Admin shows "0 services" for BuckyDrop Shipping
  - Rates don't appear at checkout
- **Recent Fix**: Switched from XML to JSON format (as recommended by Gemini)
- **Action Required**: User needs to re-register carrier service so Shopify expects JSON

### Configuration

#### Environment Variables (.env)
```bash
# Shopify App Credentials
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=https://your-ngrok-url.ngrok-free.dev
SHOPIFY_SCOPES=read_products,write_products,read_orders,read_shipping,write_shipping
SHOPIFY_ACCESS_TOKEN=shpat_xxx  # Admin API access token

# Shop Domain
SHOP_DOMAIN=your-store.myshopify.com

# BuckyDrop API Credentials
BUCKY_DROP_APPCODE=ae75dfea63cc39f6efe052af4a8b9dea
BUCKY_DROP_APPSECRET=8d8e3c046d...

# MongoDB
MONGODB_URI=mongodb://localhost:27017/shopify-image-enricher

# Server
PORT=3001
NODE_ENV=development
```

#### Required Product Metafields
Products must have these metafields set up in Shopify:
- **Namespace**: `custom`
- **Key**: `largest_diameter_raw` (dimensions in mm)
- **Key**: `height_raw` (height in mm)
- **Key**: `weight_raw_kg_` (weight in kg, optional - falls back to variant weight)

## Key Code Sections

### Carrier Service Callback (`routes/shipping.js`)
- **Line 750-755**: Route handler with XML body parser
- **Line 755-1210**: Main callback logic
- **Line 782-783**: Parse XML request from Shopify
- **Line 995-1000**: Fetch product metafields from Shopify API
- **Line 1022-1025**: Call ShippingService to calculate rates
- **Line 1137-1164**: Build response object with rates
- **Line 1175-1202**: Convert to JSON and send response

### Rate Calculation (`services/ShippingService.js`)
- **Line 51-166**: `fetchShippingRates()` - Calls BuckyDrop API
- **Line 200-300**: `filterRoutes()` - Filters available routes
- **Line 400-500**: `selectBestRoutes()` - Identifies cheap/express options
- **Line 600-700**: Currency conversion logic

### BuckyDrop API Integration (`services/BuckyDropService.js`)
- Handles API authentication (MD5 signature)
- Builds request body with dimensions/weight/destination
- Calls BuckyDrop REST API
- Returns shipping routes with prices, transit times, restrictions

## Recent Changes

### Latest Fix (Just Applied)
- **Changed**: Response format from XML to JSON
- **Reason**: Shopify prefers JSON, easier to debug, less prone to formatting errors
- **Files Changed**:
  - `routes/shipping.js` - Response now sends JSON instead of XML
  - `routes/shipping.js` - Carrier service registration uses `format: 'json'`
- **Action Required**: Re-register carrier service so Shopify expects JSON

### Previous Fixes
- Removed MongoDB product lookup (now fetches directly from Shopify API)
- Added currency conversion (RMB → USD → Checkout currency)
- Fixed XML parsing for various Shopify request formats
- Added delivery dates to service names
- Limited to top 10 cheapest rates
- Made service codes unique to prevent deduplication

## Testing

### Test Endpoints
- `test-carrier-endpoint.js` - Tests carrier service with mock data
- `test-real-checkout.js` - Tests with real product IDs

### Manual Testing
1. Start server: `npm start`
2. Start ngrok: `ngrok http 3001`
3. Update `.env` with ngrok URL
4. Register carrier service via app UI
5. Add product to cart in Shopify store
6. Enter shipping address
7. Check if rates appear

## Known Issues

1. **"Shipping not available"** - Currently debugging, likely Shopify-side configuration
2. **ngrok free tier** - Shows browser warning page, may block API calls
3. **Response format** - Just switched to JSON, needs re-registration

## Dependencies

Key npm packages:
- `express` - Web server
- `@shopify/shopify-api` - Shopify API client
- `axios` - HTTP client for BuckyDrop API
- `mongoose` - MongoDB ODM
- `xml2js` - XML parsing (for Shopify requests)
- `winston` - Logging

## File Structure

```
shopify-image-enricher/
├── server.js                 # Main server
├── routes/
│   ├── shipping.js          # Carrier service endpoints
│   ├── auth.js              # OAuth flow
│   └── ...
├── services/
│   ├── ShippingService.js   # Rate calculation logic
│   └── BuckyDropService.js  # BuckyDrop API client
├── models/
│   ├── Shop.js              # Shop schema
│   └── Product.js           # Product schema
├── public/
│   └── app.html             # Main UI
└── .env                     # Configuration
```

## Next Steps

1. **Re-register carrier service** with JSON format
2. **Test checkout** - rates should appear
3. **Monitor logs** - Check for any errors
4. **Verify rates** - Ensure prices and delivery dates are correct

## Contact/Support

This is a private app for internal use. For issues:
1. Check server logs: `/tmp/server.log`
2. Check browser console for frontend errors
3. Verify carrier service is registered and active
4. Ensure product metafields are set up correctly

