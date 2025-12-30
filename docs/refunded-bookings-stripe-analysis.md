# Refunded Bookings: Stripe Fee Analysis

## Key Question
**When a booking is refunded, does Stripe keep platform fees, or are they refunded?**

## Database Findings

From the refunded booking (`pi_3SXgCSFKyd3TG8v10vY3rA1j`):
- **Base Amount**: $100.00
- **Commission**: $4.00
- **Platform Earnings**: $24.09 (stored - likely incorrect, should be ~$3.01)
- **Net Application Fee**: $13.74 (stored)
- **Refund Amount**: $102.83 (stored)

## Stripe Refund Behavior

### How Refunds Work with Stripe Connect Destination Charges

When a refund is processed:

1. **Application Fee Refund**: 
   - `refund_application_fee = true` in refund params
   - This means the **full application fee ($18.26) is refunded to the customer**
   - Platform loses the application fee

2. **Stripe Fees**:
   - **Stripe fees are typically NON-REFUNDABLE**
   - The original Stripe fees (~$4.52) are kept by Stripe
   - Platform loses both:
     - The net application fee it received ($13.74)
     - The Stripe fees it already paid ($4.52)

3. **Total Platform Loss on Refund**:
   - Original Net Received: $13.74
   - Stripe Fees Already Paid: $4.52 (non-refundable)
   - **Total Loss: ~$18.26** (the full application fee)

## Current Database Storage Issue

**Problem**: Refunded bookings still have positive `platform_earnings` and `net_application_fee` values.

**Example**:
- `platform_earnings`: $24.09 (positive - incorrect!)
- `net_application_fee`: $13.74 (positive - incorrect!)

**These should be**:
- `platform_earnings`: $0.00 or negative (showing loss)
- `net_application_fee`: $0.00 or negative (application fee was refunded)

## What Stripe Shows for Refunded Payments

When you check a refunded payment intent in Stripe:

1. **Original Charge Balance Transaction**:
   - `net`: Positive value (what platform originally received)
   - `fee`: Stripe fees (non-refundable)

2. **Refund Balance Transaction**:
   - `amount`: Negative value (refund amount)
   - `net`: Negative value (amount deducted from platform balance)
   - **Does NOT refund Stripe fees** (fees remain with Stripe)

## Recommendation

### Option 1: Set to Zero (Current Approach)
- Keep original values for historical record
- Exclude from active calculations (already done ✅)
- Simple and clean

### Option 2: Set to Zero/Null on Refund
- When refund processed, set `platform_earnings = 0` and `net_application_fee = 0`
- Clear indication that earnings were lost to refund

### Option 3: Track Refund Loss
- Calculate refund loss: `original_net - refund_amount`
- Store negative values or zero
- More complex but shows true financial impact

## Conclusion

**Yes, platform fees are "taken" on refunds:**
- Platform loses the net application fee ($13.74)
- Stripe keeps the original fees ($4.52) - they're non-refundable
- Total loss: ~$18.26 (the full gross application fee)

**Current database values for refunded bookings are misleading** because they show positive earnings even though the money was refunded. We've already excluded them from calculations, which is correct, but the stored values should ideally be zeroed out.

