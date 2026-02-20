# Commission Calculation Improvements

## Overview

This document outlines the improvements made to commission calculations to ensure they accurately reflect real Stripe fees and platform earnings.

## Problems Identified

1. **Incorrect Stripe Fee Structure**: The code was using a flat 3.96% rate instead of Stripe's actual fee structure (2.7% + $0.05 for Australian cards, 2.9% + $0.30 for international cards)

2. **Wrong Fee Base**: Calculations were sometimes charging fees on the application fee gross instead of the full transaction amount (which is how Stripe Connect actually works)

3. **Platform Earnings Confusion**: Platform earnings was being set to the entire net application fee instead of just the commission portion

4. **Inconsistent Fallback Calculations**: When Stripe data wasn't available, fallback calculations didn't match Stripe's actual fee structure

## Changes Made

### 1. Fixed Stripe Fee Calculation (`src/services/stripeService.js`)

**Before:**
```javascript
static calculateStripeFees(amount) {
  const STRIPE_FEE_RATE = 0.0396; // 3.96% - flat rate
  return amount * STRIPE_FEE_RATE;
}
```

**After:**
```javascript
static calculateStripeFees(amount, isInternational = false) {
  const PERCENTAGE_RATE = isInternational ? 0.029 : 0.027; // 2.9% or 2.7%
  const FIXED_FEE = isInternational ? 0.30 : 0.05; // $0.30 or $0.05
  const percentageFee = amount * PERCENTAGE_RATE;
  const totalFee = percentageFee + FIXED_FEE;
  return Math.round(totalFee * 100) / 100;
}
```

**Impact**: Now uses Stripe's actual fee structure instead of an approximation.

### 2. Improved Platform Earnings Calculation (`src/services/stripeService.js`)

**Before:**
```javascript
static calculatePlatformEarnings(commissionAmount) {
  const stripeFees = this.calculateStripeFees(commissionAmount);
  return Math.max(0, commissionAmount - stripeFees);
}
```

**After:**
```javascript
static calculatePlatformEarnings(commissionAmount, applicationFeeGross = null, netApplicationFee = null, totalTransaction = null) {
  // Calculates commission's proportional share of net application fee
  // Accounts for Stripe Connect fees being charged on full transaction
  if (netApplicationFee !== null && applicationFeeGross > 0) {
    const commissionRatio = commissionAmount / applicationFeeGross;
    return Math.max(0, netApplicationFee * commissionRatio);
  }
  // ... fallback logic
}
```

**Impact**: Correctly calculates platform earnings as the commission portion of net application fee, accounting for Stripe Connect fee structure.

### 3. Fixed Net Application Fee Calculation (`src/services/stripeCommissionTracking.js`)

**Before:**
```javascript
// Fallback: Estimate Stripe fees on application fee gross
stripeFees = (applicationFeeGross * 0.029) + 0.30;
```

**After:**
```javascript
// Calculate fees on total transaction (Stripe Connect charges on full transaction)
const totalTransaction = (paymentIntent.amount || 0) / 100;
const PERCENTAGE_RATE = 0.027; // 2.7% for Australian cards
const FIXED_FEE = 0.05; // $0.05
stripeFees = (totalTransaction * PERCENTAGE_RATE) + FIXED_FEE;
```

**Impact**: Correctly calculates Stripe fees on the full transaction amount, not just the application fee.

### 4. Fixed Platform Earnings in Commission Data Hook (`src/hooks/useCommissionData.js`)

**Before:**
```javascript
const platformEarnings = netApplicationFee || 0
```

**After:**
```javascript
let platformEarnings = 0
if (netApplicationFee !== null && applicationFeeGross > 0 && commissionPartner > 0) {
  const commissionRatio = commissionPartner / applicationFeeGross
  platformEarnings = netApplicationFee * commissionRatio
} else if (booking.platform_earnings !== null) {
  platformEarnings = parseFloat(booking.platform_earnings || 0)
}
```

**Impact**: Platform earnings now correctly represents only the commission portion, not the entire net application fee.

### 5. Added Validation Function (`src/services/stripeCommissionTracking.js`)

Added `validateCommissionCalculations()` function that:
- Compares database values with Stripe calculations
- Identifies discrepancies with tolerance checking
- Provides detailed breakdown of differences

**Usage:**
```javascript
const validation = await StripeCommissionTracking.validateCommissionCalculations(
  bookingId,
  paymentIntentId
);

if (!validation.isValid) {
  console.log('Discrepancies found:', validation.discrepancies);
  // Sync to fix discrepancies
  await StripeCommissionTracking.syncCommissionFromStripe(bookingId, paymentIntentId);
}
```

### 6. Improved Reconciliation Function (`src/services/stripeCommissionTracking.js`)

Updated `reconcileBookings()` to:
- Use validation function before syncing
- Only sync bookings with discrepancies
- Provide detailed discrepancy reports

## How Stripe Connect Fees Work

For Stripe Connect destination charges:

1. **Total Transaction**: Base Amount + Service Fee + Processing Fee
2. **Application Fee Gross**: Service Fee + Processing Fee + Commission
3. **Stripe Fees**: Charged on the **FULL transaction amount** (not just application fee)
   - Australian cards: 2.7% + $0.05
   - International cards: 2.9% + $0.30
4. **Net Application Fee**: Application Fee Gross - Stripe Fees
5. **Platform Earnings**: Commission's proportional share of Net Application Fee
   - Formula: `Net Application Fee × (Commission / Application Fee Gross)`

## Example Calculation

For a $100 base booking:

1. **Base Amount**: $100.00
2. **Service Fee** (12%): $12.00
3. **Processing Fee** (1.75%): $2.00
4. **Commission** (4%): $4.00
5. **Total Transaction**: $114.00
6. **Application Fee Gross**: $18.00
7. **Stripe Fees** (2.7% + $0.05 on $114.00): $3.13
8. **Net Application Fee**: $18.00 - $3.13 = $14.87
9. **Platform Earnings** (commission portion): $14.87 × ($4.00 / $18.00) = $3.30

## Verification

To verify calculations are correct:

1. Use the validation function to check existing bookings:
```javascript
const validation = await StripeCommissionTracking.validateCommissionCalculations(bookingId, paymentIntentId);
console.log('Validation result:', validation);
```

2. Reconcile all bookings:
```javascript
const results = await StripeCommissionTracking.reconcileBookings();
console.log('Reconciliation results:', results);
```

3. Check commission dashboard metrics match expected values

## Next Steps

1. **Run Reconciliation**: Run `reconcileBookings()` to fix any existing discrepancies
2. **Monitor**: Use validation function periodically to ensure calculations remain accurate
3. **Review**: Check commission dashboard to ensure metrics look realistic

## Files Modified

- `src/services/stripeService.js` - Fixed fee calculation and platform earnings
- `src/services/stripeCommissionTracking.js` - Fixed commission breakdown and added validation
- `src/hooks/useCommissionData.js` - Fixed platform earnings calculation

## Testing

To test the improvements:

1. Create a test booking with known amounts
2. Verify Stripe fee calculation matches Stripe dashboard
3. Verify platform earnings is commission portion only
4. Verify net application fee accounts for full transaction fees

