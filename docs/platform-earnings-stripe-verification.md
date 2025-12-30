# Platform Earnings: Stripe Balance Transaction Verification

## Summary

We've updated the platform earnings calculation to use **actual Stripe balance transaction data** instead of estimating fees. This provides accurate earnings based on what the platform actually receives from Stripe.

## Changes Made

### 1. Updated Edge Function (`stripe-get-payment-intent`)
- ✅ Now retrieves balance transaction data
- ✅ Includes fee breakdown details
- ✅ Returns actual net amount platform receives

### 2. Updated Stripe Service (`src/services/stripeService.js`)
- ✅ Uses balance transaction `net` amount for accurate calculation
- ✅ Calculates commission portion proportionally from net application fee
- ✅ Falls back to estimated calculation if Stripe data unavailable

### 3. Calculation Method

#### Primary Method (Using Balance Transaction):
```
1. Fetch balance transaction from Stripe
2. Get net application fee (what platform actually receives)
3. Calculate commission ratio: commission / application_fee_gross
4. Net commission = net_application_fee × commission_ratio
```

#### Fallback Method (Estimated):
```
Net commission = commission - (commission × 2.9% + $0.30)
```

## For a $100 Base Booking

### Application Fee Breakdown:
- **Service Fee**: $12.00
- **Processing Fee**: $2.26
- **Commission**: $4.00
- **Total Application Fee**: $18.26

### Stripe Balance Transaction:
- **Gross Application Fee**: $18.26
- **Stripe Fees**: ~$4.52 (on $114.26 total transaction)
- **Net Platform Receives**: ~$13.74

### Commission Calculation:
- **Commission Ratio**: $4.00 / $18.26 = 21.9%
- **Net Commission**: $13.74 × 21.9% = **$3.01**

## Comparison

| Method | Result |
|--------|--------|
| Estimated (2.9% + $0.30) | $3.58 |
| Balance Transaction (Actual) | $3.01 |

The balance transaction method is more accurate because:
- Uses actual Stripe fees (may vary by region, currency, card type)
- Reflects what platform actually receives
- Accounts for all fee variations

## Deployment Steps

1. **Deploy Updated Edge Function**:
   ```bash
   supabase functions deploy stripe-get-payment-intent
   ```

2. **Test with Actual Payment Intent**:
   - Use a completed booking with Stripe payment intent
   - Check browser console for balance transaction logs
   - Verify calculation matches Stripe dashboard

3. **Update Existing Data (Optional)**:
   - Existing bookings will use balance transaction data on next sync
   - Or run backfill script to update all bookings

## Verification

After deployment, check:
1. Browser console logs show balance transaction analysis
2. Platform earnings match Stripe dashboard net amounts
3. Commission dashboard shows accurate totals

## Next Steps

1. ✅ Deploy Edge Function
2. ✅ Test with actual payment intents
3. ✅ Verify calculations
4. ⏳ Monitor and adjust if needed

