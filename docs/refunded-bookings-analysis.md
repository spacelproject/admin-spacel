# Refunded Bookings Analysis

## Current Situation

**Yes, refunded bookings have positive platform earnings and application fees stored in the database.**

### Findings from Database:

**17 Refunded Bookings:**
- **Total Base Amount**: $1,723.00
- **Total Platform Earnings**: $415.16 (all positive values)
- **Total Net Application Fee**: $236.67 (all positive values)
- **Total Refund Amount**: $1,780.30 (amount actually refunded to customers)

### Example Refunded Booking:
- **Base Amount**: $100.00
- **Commission Partner**: $4.00
- **Platform Earnings**: $24.09 (positive!)
- **Net Application Fee**: $13.74 (positive!)
- **Refund Amount**: $102.83 - $114.26 (varies by booking)

## The Problem

**When bookings are refunded:**
1. ✅ `refund_amount` is stored correctly
2. ✅ `payment_status` is set to 'refunded'
3. ❌ **`platform_earnings` and `net_application_fee` still have POSITIVE values**

This means the database still shows platform earnings from refunded transactions, which is incorrect because:
- The money was returned to the customer
- The platform shouldn't count these as earnings
- These positive values were causing the totals to be inflated

## Current Fix

We've excluded refunded bookings from the dashboard calculations, so:
- **Total Revenue**: Now excludes refunded bookings
- **Net Platform Earnings**: Now excludes refunded bookings  
- **Platform Earnings**: Now excludes refunded bookings
- **Host Payouts**: Now excludes refunded bookings

## Question: Should We Zero Out or Negate These Values?

**Option 1: Set to Zero**
- When a booking is refunded, set `platform_earnings = 0` and `net_application_fee = 0`
- This treats refunded bookings as if they never generated earnings

**Option 2: Set to Negative**
- When a booking is refunded, negate the values (e.g., `platform_earnings = -24.09`)
- This shows the "loss" from refunds and allows tracking refund impact

**Option 3: Keep as Historical Record (Current)**
- Keep the original positive values as historical data
- Exclude them from active calculations (current approach)
- This preserves what was originally earned before refund

## Recommendation

**Option 3 (Current Approach)** is best because:
1. ✅ Preserves historical accuracy (what was originally earned)
2. ✅ Already excluded from calculations (dashboard shows correct totals)
3. ✅ Allows tracking of refund impact separately
4. ✅ Can still see original earnings if needed for analysis

## Alternative: Display Refund Impact Separately

We could add a new metric:
- **Refunded Earnings**: -$236.67 (total platform earnings lost to refunds)
- **Net Platform Earnings (After Refunds)**: $825.96 - $236.67 = $589.29

But the current approach (excluding refunded bookings entirely) is cleaner.

