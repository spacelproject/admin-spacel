# Deploy Stripe API Proxy Edge Function

## ✅ Commission Rate Settings Removed

The `CommissionRateSettings` component has been removed from the commission management page.

## 🚀 Deploy Edge Function

### Option 1: Using Supabase CLI (Recommended)

If you have Supabase CLI installed:

```bash
# Navigate to the function directory
cd supabase/functions/stripe-api-proxy

# Deploy the function
supabase functions deploy stripe-api-proxy --project-ref bwgwoqywmlaevyygkafg
```

Or use the provided script:

**Windows (PowerShell):**
```powershell
.\scripts\deploy-stripe-api-proxy.ps1
```

**Mac/Linux:**
```bash
bash scripts/deploy-stripe-api-proxy.sh
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg
2. Navigate to **Edge Functions** in the sidebar
3. Click **"Deploy a new function"** or find `stripe-api-proxy` if it exists
4. Upload the function files from `supabase/functions/stripe-api-proxy/`
5. Set the function name as `stripe-api-proxy`
6. Deploy

### Option 3: Using Supabase CLI via MCP (If Available)

If you have Supabase CLI configured with MCP, you can deploy directly.

## 📋 What Was Changed

### Edge Function Updates (`supabase/functions/stripe-api-proxy/index.ts`)

- ✅ Enhanced `get_payment_intent` action to automatically expand all related objects:
  - `latest_charge` with balance transaction and fee details
  - `latest_charge.refunds` - All refunds
  - `latest_charge.dispute` - Dispute information
  - `application_fee` with balance transaction

### Commission Management Updates

- ✅ Removed `CommissionRateSettings` component
- ✅ Removed `handleRateChange` function
- ✅ Removed `updateCommissionRate` from useCommissionData hook usage
- ✅ Cleaned up imports

## 🔍 Verify Deployment

After deployment, test the function:

```bash
curl -X POST https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/stripe-api-proxy \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_payment_intent",
    "payment_intent_id": "pi_test_xxx"
  }'
```

## 📝 Function Endpoint

Once deployed, the function will be available at:
```
https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/stripe-api-proxy
```

## ⚙️ Required Environment Variables

Make sure `STRIPE_SECRET_KEY` is set in Supabase secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
```

Or set it in the Supabase Dashboard under **Project Settings** → **Edge Functions** → **Secrets**.

