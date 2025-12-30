# Stripe Integration Guide

## Overview

The refund processing system is now set up with a Supabase Edge Function that securely handles Stripe refunds. The system supports both Stripe SDK (recommended for production) and Stripe MCP tools.

## Current Implementation

### 1. Edge Function (`supabase/functions/stripe-refund/index.ts`)
- ✅ Secure admin authentication
- ✅ Validates user permissions
- ✅ Logs refunds to `payment_logs` table
- ⚠️ Ready for Stripe SDK integration

### 2. StripeService (`src/services/stripeService.js`)
- ✅ Calls Edge Function securely
- ✅ Handles authentication
- ✅ Error handling and fallbacks

### 3. Refund Processing Flow
1. Admin initiates refund in UI
2. `StripeService.processRefund()` called
3. Edge Function validates and processes
4. Database updated (bookings, earnings, modifications)
5. Notifications sent to guest and host

## Integration Options

### Option 1: Stripe SDK (Recommended for Production)

Update `supabase/functions/stripe-refund/index.ts`:

```typescript
import Stripe from 'npm:stripe@latest';

// In the function body:
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '');

// Get payment intent to find charge
const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
const chargeId = paymentIntent.latest_charge;

// Create refund
const refund = await stripe.refunds.create({
  charge: chargeId,
  amount: amount, // null for full refund
  reason: reason
});

return new Response(JSON.stringify(refund), { ... });
```

### Option 2: Stripe MCP Tools

If you have a service that can call MCP tools, you can:

1. **Create a MCP Service Endpoint** that:
   - Receives refund requests
   - Uses `mcp_stripe_create_refund` tool
   - Returns refund result

2. **Update Edge Function** to call this service:
```typescript
const mcpServiceUrl = Deno.env.get('MCP_SERVICE_URL');
const response = await fetch(`${mcpServiceUrl}/stripe/refund`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ payment_intent, amount, reason })
});
const refund = await response.json();
```

## Environment Variables

Add to your Supabase project secrets:
```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

## Testing

1. **Deploy Edge Function**:
   ```bash
   supabase functions deploy stripe-refund
   ```

2. **Test Refund**:
   - Go to Booking Management
   - Select a booking with a payment intent
   - Click "Process Refund"
   - Verify refund is processed

## Security Notes

- ✅ Admin-only access enforced
- ✅ All refunds logged to database
- ✅ Audit trail in `booking_modifications`
- ✅ Earnings automatically reversed
- ✅ Notifications sent to users

## Next Steps

1. Add Stripe SDK to Edge Function (Option 1)
2. Or set up MCP service endpoint (Option 2)
3. Test with real payment intents
4. Monitor refund processing in Stripe dashboard

