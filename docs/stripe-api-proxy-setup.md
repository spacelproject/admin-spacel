# Stripe API Proxy Setup Guide

## Overview

The Stripe API Proxy is a unified Edge Function that handles all Stripe API calls securely. Instead of creating multiple Edge Functions, you now have **one function** that routes to different Stripe API endpoints.

## Benefits

✅ **Single Edge Function** - Easier to maintain  
✅ **Direct Stripe SDK** - Uses official Stripe SDK for reliability  
✅ **Secure** - Secret key stays in Supabase environment  
✅ **Type-safe** - Full TypeScript support  
✅ **Simplified** - One endpoint for all Stripe operations  

## Setup Instructions

### 1. Set Stripe Secret Key

Add your Stripe secret key to Supabase secrets:

```bash
# For production (live mode)
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx

# For testing (test mode)
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
```

**Important:** Never commit your secret key to git. Always use Supabase secrets.

### 2. Deploy the Edge Function

```bash
cd supabase/functions/stripe-api-proxy
supabase functions deploy stripe-api-proxy
```

### 3. Verify Deployment

The function will be available at:
```
https://your-project-id.supabase.co/functions/v1/stripe-api-proxy
```

## How It Works

### Frontend → Edge Function → Stripe API

1. **Frontend** calls `stripeCommissionTracking.js` service
2. Service sends request to Edge Function with `action` parameter
3. **Edge Function** uses Stripe SDK to call Stripe API
4. Results returned securely to frontend

### Example Flow

```javascript
// Frontend code (stripeCommissionTracking.js)
const data = await StripeCommissionTracking.getPaymentDetails('pi_xxx');

// This calls:
// POST /functions/v1/stripe-api-proxy
// Body: { action: 'get_payment_intent', payment_intent_id: 'pi_xxx' }

// Edge Function uses Stripe SDK:
const paymentIntent = await stripe.paymentIntents.retrieve('pi_xxx');
```

## Available Actions

The Edge Function supports these actions:

| Action | Description | Parameters |
|--------|-------------|------------|
| `get_payment_intent` | Get payment intent details | `payment_intent_id`, `expand[]` |
| `get_balance_transaction` | Get balance transaction | `balance_transaction_id` |
| `list_balance_transactions` | List balance transactions | `created: {gte, lte}`, `limit` |
| `get_charge` | Get charge details | `charge_id`, `expand[]` |
| `get_transfer` | Get transfer details | `transfer_id` |
| `get_payout` | Get payout details | `payout_id` |
| `list_payouts` | List payouts | `created: {gte, lte}`, `limit` |
| `list_disputes` | List disputes | `created: {gte, lte}`, `limit` |

## Security Features

✅ **Admin-only access** - Verifies user is in `admin_users` table  
✅ **Authentication required** - Validates JWT token  
✅ **Secret key protection** - Never exposed to frontend  
✅ **CORS configured** - Proper CORS headers  

## Testing

After deployment, test with:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/stripe-api-proxy \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_payment_intent",
    "payment_intent_id": "pi_test_xxx"
  }'
```

## Troubleshooting

### Error: "STRIPE_SECRET_KEY not found"
- Make sure you've set the secret: `supabase secrets set STRIPE_SECRET_KEY=sk_xxx`

### Error: "Admin access required"
- Verify user is in `admin_users` table
- Check authentication token is valid

### Error: "Unknown action"
- Check action name matches supported actions
- Verify parameters are correct

## Next Steps

1. ✅ Deploy the Edge Function
2. ✅ Set Stripe secret key
3. ✅ Test with a payment intent ID
4. ✅ Use in commission tracking component

The commission tracking component will automatically use this proxy for all Stripe API calls!

