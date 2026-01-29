# Shipping Options Filtering Rules

## Overview
These rules determine which shipping options are shown to customers at checkout.

## Rule 1: Hide "Dominated" Options
**What it does:** Hides options that are BOTH slower AND more expensive than another option.

**Example:**
- Option A: $25, 14 days
- Option B: $20, 10 days
- **Result:** Hide Option A (it's slower AND more expensive)

**Important:** We do NOT hide slow options just because they're slow. The cheapest option should always be available, even if it's slow (e.g., Ocean shipping).

## Rule 2: Deduplicate by Price (Rounded)
**What it does:** If multiple options round to the same price, keep only the fastest one.

**Rounding:**
- GBP: Round to nearest £0.50 (e.g., £9.50, £10.00, £10.50)
- USD: Round to nearest $0.50 (e.g., $19.50, $20.00, $20.50)
- Other currencies: Round to nearest cent

**Example:**
- Option A: $19.12 → rounds to $19.00, 9-14 days
- Option B: $19.79 → rounds to $20.00, 9-14 days
- **Result:** Keep both (different rounded prices)

**Note:** This rule only works if prices round to the same value. See Rule 3 for same delivery time deduplication.

## Rule 3: Deduplicate by Delivery Time
**What it does:** If multiple options have the SAME delivery time range, keep only the cheapest one.

**Example:**
- Option A: $20.00, 9-14 days
- Option B: $21.31, 9-14 days
- **Result:** Hide Option B (same delivery time, more expensive)

**This fixes the issue where prices round differently but delivery times are identical.**

## Rule 4: Deduplicate by Carrier
**What it does:** For major carriers (UPS, DHL, FedEx, Aramex, EMS), show only the cheapest option per carrier.

**Carriers affected:**
- UPS
- DHL
- FedEx
- Aramex
- EMS

**Carriers NOT affected:**
- ePacket (show multiple if they offer different value - faster vs cheaper)
- Other carriers (show all options)

**Example:**
- UPS Option A: $50, 5-8 days
- UPS Option B: $45, 5-8 days
- **Result:** Hide Option A (keep cheapest UPS option)

## Rule 5: Product-Specific Filtering
**What it does:** Hide options that don't match the product type.

**Clothing filter:**
- Hide options with "clothing/clothes/apparel/garment/wear" in the name UNLESS the product IS clothing

**Battery filter:**
- Hide options with "batteries/battries/power bank/powerbank" in the name UNLESS the product IS a battery

## Service Name Cleaning (Not Filtering, Just Display)
These rules clean up service names for better display (don't affect which options are shown):

- Remove "Yun" from "YunExpress" → "Express"
- Remove "HK" prefix and "(HK)" suffix
- Remove "Preferential Line" suffix
- Remove numeric suffixes like "-5000"
- Remove "(General)", "(General Cargo)", "(Special Cargo)"
- Remove "UK Duty-Free" and "US Duty-Free" prefixes
- Remove "Duty-Free" anywhere in the name
- Convert "US Ocean Carriage" → "Ocean Shipping"
- Remove "(Regular Ship)" suffix
- Fix redundant "Express" (e.g., "Express Fast Express Line" → "Express Fast Line")
- Convert EUB/ETK variants to "ePacket"

## Summary

**Options are shown if:**
1. ✅ Not dominated (not both slower AND more expensive)
2. ✅ Not duplicate price (after rounding) with slower delivery
3. ✅ Not duplicate delivery time with higher price
4. ✅ Not duplicate carrier with higher price (except ePacket)
5. ✅ Matches product type (clothing/battery filters)

**Options are hidden if:**
1. ❌ Dominated (slower AND more expensive)
2. ❌ Same rounded price but slower delivery
3. ❌ Same delivery time but more expensive
4. ❌ Same carrier but more expensive (except ePacket)
5. ❌ Doesn't match product type

## Current Issues Fixed

1. ✅ **Ocean Carriage**: Now kept if it's the cheapest option (even if slow)
2. ✅ **Same delivery time**: Now deduplicates - keeps cheapest option
3. ✅ **DHL**: Included in carrier deduplication (shows cheapest DHL option)

