# Stripe API Proxy Edge Function

Unified Edge Function that handles all Stripe API calls securely using the Stripe SDK.

## Setup

### 1. Set Stripe Secret Key in Supabase Secrets

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
# or for test mode:
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
```

### 2. Deploy the Function

```bash
supabase functions deploy stripe-api-proxy
```

### 3. Verify Deployment

The function will be available at:
```
https://your-project.supabase.co/functions/v1/stripe-api-proxy
```

## Usage

The function accepts POST requests with an `action` parameter that determines which Stripe API to call:

### Available Actions

- `get_payment_intent` - Get payment intent details
- `get_balance_transaction` - Get balance transaction details
- `list_balance_transactions` - List balance transactions for date range
- `get_charge` - Get charge details
- `get_transfer` - Get transfer details
- `get_payout` - Get payout details
- `list_payouts` - List payouts for date range
- `list_disputes` - List disputes/chargebacks for date range

### Example Request

```javascript
const response = await fetch('https://your-project.supabase.co/functions/v1/stripe-api-proxy', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': SUPABASE_ANON_KEY
  },
  body: JSON.stringify({
    action: 'get_payment_intent',
    payment_intent_id: 'pi_xxx',
    expand: ['charge', 'balance_transaction']
  })
});
```

## Security

- ✅ Requires admin authentication
- ✅ Validates user is in `admin_users` table
- ✅ Stripe secret key stored securely in Supabase secrets
- ✅ Never exposed to frontend

## Supported Stripe API Calls

All calls use the official Stripe SDK, ensuring:
- Type safety
- Latest API features
- Proper error handling
- Rate limit handling

