# Platform Earnings History Analysis

## Was `platform_earnings` Already in the Database?

**Yes, the `platform_earnings` column already existed in the database schema.**

## Evidence from Database

### 1. Schema Analysis
- **Column Type**: `numeric` (nullable)
- **Column Default**: `null`
- **Table**: `bookings`

### 2. Data Patterns Found

Looking at the data, there are **multiple different values** for the same commission amount, indicating different calculation methods were used over time:

| Commission | Platform Earnings Values Found | Count | Likely Method |
|------------|-------------------------------|-------|---------------|
| $4.00 | $3.58 | 6 bookings | Old calculation: Commission - (2.9% + $0.30) |
| $4.00 | $24.09 | 25 bookings | ⚠️ Incorrect calculation or sync |
| $4.00 | $32.01 | 1 booking | ⚠️ Incorrect value |
| $4.00 | $65.58 | 1 booking | ⚠️ Incorrect value |
| $5.40 | $4.94 | 6 bookings | Old calculation method |

### 3. Update History

All bookings were **updated on 2025-12-08** (recently), but the values are inconsistent:
- Some still have old calculation values ($3.58)
- Some have suspicious values ($24.09, $32.01, $65.58)

## How Platform Earnings Was Originally Populated

Based on code analysis, `platform_earnings` was likely populated through:

### 1. **Initial Calculation** (Early bookings)
- Used old method: `Commission - (Commission × 2.9% + $0.30)`
- Example: $4.00 - $0.416 = **$3.58** ✅ (correct for old method)

### 2. **Sync from Stripe Metadata** (Later)
- Some bookings synced `platformEarnings` from Stripe metadata
- **Issue**: Stripe metadata stores values in **cents**, but some were stored as **dollars**
- Example: Stripe metadata has `"platformEarnings": "1374"` (cents = $13.74)
- But `platform_earnings` might have been incorrectly stored

### 3. **Multiple Sync Attempts**
- The `syncPlatformEarningsFromStripe` function updates `platform_earnings`
- The conversion bug (cents to dollars) may have caused incorrect values
- Some values like $24.09 don't match any clear calculation method

## The Problem

The `platform_earnings` values in the database are **inconsistent and incorrect**:

1. **Old Calculation Method** ($3.58): 
   - Uses 2.9% + $0.30 (inaccurate, doesn't match Stripe)
   - Should be ~$3.01 (using correct 3.96% method)

2. **Incorrect Values** ($24.09, $32.01, $65.58):
   - Don't match any calculation method
   - Possibly synced incorrectly from Stripe metadata
   - Or calculated using wrong formula

## What Should Platform Earnings Be?

For a $100 booking with $4 commission:
- **Correct Calculation**: 
  - Net Application Fee: $13.74
  - Commission Ratio: $4.00 / $18.26 = 21.9%
  - Platform Earnings: $13.74 × 21.9% = **$3.01** ✅

## Conclusion

**Yes, `platform_earnings` was already in the database**, but:
- ❌ Values are inconsistent and mostly incorrect
- ❌ Mixed calculation methods (old 2.9% + $0.30, and incorrect syncs)
- ❌ Needs to be recalculated for all bookings using the correct formula

## Recommendation

**Recalculate all `platform_earnings` values** using:
```
Platform Earnings = Net Application Fee × (Commission / Application Fee Gross)
```

This will ensure accuracy and consistency across all bookings.

