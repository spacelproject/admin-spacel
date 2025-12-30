# Refunded Booking Stripe Analysis

## Booking Details

**Payment Intent ID**: `pi_3SXgCSFKyd3TG8v10vY3rA1j`  
**Refund ID**: `re_3SXgCSFKyd3TG8v10Rh0n6gr`

## Database Values

- **Base Amount**: $100.00
- **Commission**: $4.00
- **Platform Earnings**: $24.09 (stored - likely incorrect)
- **Net Application Fee**: $13.74 (stored)
- **Refund Amount**: $102.83

## What Happens on Refund (Based on Code Analysis)

### Refund Processing (`stripe-refund/index.ts`)

For destination charges (Stripe Connect):
```typescript
refundParams.reverse_transfer = true;
refundParams.refund_application_fee = true;
```

This means:
1. **Transfer is reversed**: Partner's share is taken back from their account
2. **Application fee is refunded**: Full application fee ($18.26) goes back to customer
3. **Stripe fees are NOT refunded**: Stripe keeps the original fees

### Expected Stripe Behavior

**Original Payment:**
- Customer pays: $114.26
- Partner receives: $96.00 (transferred to Connect account)
- Application fee: $18.26 (gross)
- Stripe fees: ~$4.52 (deducted from platform)
- Platform net receives: ~$13.74

**On Refund:**
- Customer receives: $102.83 (partial refund, not full $114.26)
- Partner's share reversed: -$96.00
- Application fee refunded: -$18.26
- Stripe fees: **NOT refunded** (kept by Stripe)
- Platform loses: $13.74 (net received) + $4.52 (fees already paid) = **$18.26 total loss**

## Key Finding

**When a refund is processed:**
- ✅ Application fee is fully refunded to customer
- ❌ Stripe fees are **NON-REFUNDABLE** (kept by Stripe)
- 📉 Platform loses both the net application fee AND the original Stripe fees

## Current Database Issue

The database still shows:
- `platform_earnings`: $24.09 (positive - **should be $0**)
- `net_application_fee`: $13.74 (positive - **should be $0**)

These values are misleading because:
1. The application fee was refunded
2. The platform lost the earnings
3. Stripe fees are non-refundable

## Recommendation

When processing refunds, we should:
1. Set `platform_earnings = 0`
2. Set `net_application_fee = 0`
3. Or track refund impact separately

This accurately reflects that the platform earned nothing from this refunded transaction.

