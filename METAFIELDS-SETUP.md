# Metafields Setup for BuckyDrop Shipping

## Required Metafields

You need to create **2 metafields** for products to calculate shipping rates:

### 1. Diameter/Width Metafield

**Name:** `largest_diameter_raw` (or `largest_diameter_raw_mm`)

**Type:** Number (decimal)

**Namespace:** Any (e.g., `custom` or `shipping`)

**Key:** `largest_diameter_raw`

**Description:** The largest diameter or width of the product in **millimeters (mm)**

**Example values:**
- 150 (for 15cm diameter)
- 200 (for 20cm diameter)
- 300 (for 30cm diameter)

---

### 2. Height Metafield

**Name:** `height_raw` (or `height_raw_mm`)

**Type:** Number (decimal)

**Namespace:** Any (e.g., `custom` or `shipping`)

**Key:** `height_raw`

**Description:** The height of the product in **millimeters (mm)**

**Example values:**
- 100 (for 10cm height)
- 250 (for 25cm height)
- 500 (for 50cm height)

---

### 3. Weight (Optional - Uses Product Weight if Missing)

**Name:** `weight_raw_kg` (optional)

**Type:** Number (decimal)

**Namespace:** `custom` (preferred)

**Key:** `weight_raw_kg`

**Description:** Weight in **kilograms (kg)**

**Note:** If this metafield is missing, the system will use the product's weight from Shopify product settings.

---

## How to Create Metafields in Shopify

### Step 1: Go to Settings → Custom data → Products

1. In Shopify Admin, go to **Settings** (gear icon)
2. Click **Custom data**
3. Click **Products**

### Step 2: Add Definition

1. Click **Add definition**
2. Fill in:
   - **Name:** `Largest Diameter (mm)` (or whatever you want)
   - **Namespace and key:** 
     - Namespace: `custom` (or `shipping`)
     - Key: `largest_diameter_raw`
   - **Type:** `Number (decimal)`
   - **Description:** `Largest diameter or width in millimeters`
3. Click **Save**

### Step 3: Repeat for Height

1. Click **Add definition** again
2. Fill in:
   - **Name:** `Height (mm)`
   - **Namespace and key:**
     - Namespace: `custom` (or `shipping`)
     - Key: `height_raw`
   - **Type:** `Number (decimal)`
   - **Description:** `Height in millimeters`
3. Click **Save**

### Step 4: Add Values to Products

1. Go to **Products** → Select a product
2. Scroll down to **Metafields** section
3. Enter values:
   - **Largest Diameter (mm):** Enter the diameter/width in mm (e.g., `150` for 15cm)
   - **Height (mm):** Enter the height in mm (e.g., `100` for 10cm)
4. Click **Save**

---

## Important Notes

- **Units:** All dimensions must be in **millimeters (mm)**
- **Weight:** Can use product weight from Shopify product settings, or create a `weight_raw_kg` metafield
- **Namespace:** Can be `custom`, `shipping`, or any namespace - the code searches all namespaces
- **Key names:** Must match exactly:
  - `largest_diameter_raw` (or `largest_diameter_raw_mm`)
  - `height_raw` (or `height_raw_mm`)

---

## Example Product Setup

**Product:** Coffee Mug

- **Largest Diameter:** `90` mm (9cm diameter)
- **Height:** `120` mm (12cm height)
- **Weight:** `0.3` kg (from product settings or metafield)

---

## Testing

After setting up metafields:

1. Go to your storefront
2. Add a product with metafields to cart
3. Go to checkout
4. Enter a shipping address
5. BuckyDrop rates should appear!

If rates don't appear, check server logs for errors about missing metafields.

