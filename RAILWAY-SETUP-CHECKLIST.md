# ✅ Railway Setup Checklist

## Step 1: Verify Deployment ✅

Check your Railway dashboard:
- [ ] Service is deployed and running
- [ ] Build completed successfully
- [ ] Service shows "Active" status
- [ ] You have a Railway URL (e.g., `https://your-app.railway.app`)

---

## Step 2: Environment Variables

Make sure these are set in Railway:

**Required:**
- [ ] `PORT` = `3001` (or Railway auto-sets this)
- [ ] `NODE_ENV` = `production`
- [ ] `MONGODB_URI` = (from Railway MongoDB service or MongoDB Atlas)
- [ ] `SHOPIFY_API_KEY` = (your Shopify API key)
- [ ] `SHOPIFY_API_SECRET` = (your Shopify API secret)
- [ ] `SHOPIFY_APP_URL` = `https://your-app.railway.app` (your Railway URL)
- [ ] `SHOPIFY_SCOPES` = `read_products,write_products,read_orders,read_shipping,write_shipping`
- [ ] `BUCKY_DROP_APPCODE` = `ae75dfea63cc39f6efe052af4a8b9dea`
- [ ] `BUCKY_DROP_APPSECRET` = `8d8e3c046d6bf420b5999899786d8481`

**Optional:**
- [ ] `SESSION_SECRET` = (random string for sessions)

---

## Step 3: Update Shopify App Settings

1. Go to: https://partners.shopify.com
2. Find your app → **App setup**
3. Update:
   - **App URL:** `https://your-app.railway.app`
   - **Allowed redirection URL(s):** `https://your-app.railway.app/api/auth/shopify/callback`
4. Click **Save**

---

## Step 4: Test Deployment

### Test 1: Health Check
```bash
curl https://your-app.railway.app/health
```
Should return: `OK` or similar

### Test 2: Carrier Service Endpoint
```bash
curl https://your-app.railway.app/api/shipping/carrier-service-status?shop=spare-part-mart.myshopify.com
```

### Test 3: Check Logs
In Railway dashboard → **Deployments** → **View Logs**
- Look for: "🚀 Server running on port..."
- Look for: "✅ Connected to MongoDB"
- No errors

---

## Step 5: Re-authenticate Shopify App

Since the URL changed, you need to re-authenticate:

1. Visit: `https://your-app.railway.app/?shop=spare-part-mart.myshopify.com`
2. You'll be redirected to Shopify to approve permissions
3. After approval, access token is saved

---

## Step 6: Register Carrier Service

1. Visit: `https://your-app.railway.app/app.html?shop=spare-part-mart.myshopify.com`
2. Click **"Enable Carrier Service"**
3. Wait for success message

OR use API:
```bash
curl -X POST https://your-app.railway.app/api/shipping/register-carrier-service \
  -H "Content-Type: application/json" \
  -d '{"shop":"spare-part-mart.myshopify.com"}'
```

---

## Step 7: Test at Checkout

1. Go to your Shopify store
2. Add product to cart
3. Go to checkout
4. Enter shipping address
5. **BuckyDrop rates should appear!** ✅

---

## Troubleshooting

### "Service not responding"
- Check Railway logs for errors
- Verify PORT is set correctly
- Check if MongoDB connection is working

### "Shop not authenticated"
- Re-authenticate (Step 5)
- Check SHOPIFY_API_KEY and SHOPIFY_API_SECRET are correct

### "Carrier service not showing"
- Check carrier service is registered (Step 6)
- Verify it's added to shipping zones in Shopify Admin

### "MongoDB connection failed"
- Check MONGODB_URI is correct
- If using Railway MongoDB, check service is running
- If using MongoDB Atlas, check IP whitelist (allow Railway IPs)

---

## Next Steps

Once everything is working:
- [ ] Stop local server (PM2)
- [ ] Update any scripts that reference localhost
- [ ] Monitor Railway usage (stay within $5/month free credit)
- [ ] Set up monitoring/alerts if needed

