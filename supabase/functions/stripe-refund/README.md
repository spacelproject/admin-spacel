# Stripe Refund Edge Function

This Edge Function processes Stripe refunds securely with admin authentication.

## Setup

1. **Install Stripe SDK** (when ready for production):
   ```bash
   # Add to deno.json or import directly
   import Stripe from 'npm:stripe@latest';
   ```

2. **Set Environment Variables**:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `SUPABASE_URL`: Your Supabase project URL (auto-set)
   - `SUPABASE_ANON_KEY`: Your Supabase anon key (auto-set)

3. **Deploy the Function**:
   ```bash
   supabase functions deploy stripe-refund
   ```

## Usage

The function is called automatically by `StripeService.processRefund()` when processing refunds.

## Security

- Requires admin authentication
- Validates user is in `admin_users` table
- Logs all refund requests to `payment_logs` table
- Uses Supabase RLS for data access

## Integration with Stripe MCP

To use Stripe MCP tools, you would need to:
1. Create a separate service that has MCP access
2. Call that service from this Edge Function
3. Or use Stripe SDK directly (recommended for production)

