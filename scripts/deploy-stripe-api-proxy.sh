#!/bin/bash
# Deploy Stripe API Proxy Edge Function
# 
# Usage:
#   bash scripts/deploy-stripe-api-proxy.sh
# 
# Or manually:
#   cd supabase/functions/stripe-api-proxy
#   supabase functions deploy stripe-api-proxy --project-ref bwgwoqywmlaevyygkafg

echo "🚀 Deploying Stripe API Proxy Edge Function..."
echo ""

# Navigate to function directory
cd supabase/functions/stripe-api-proxy

# Deploy the function
supabase functions deploy stripe-api-proxy --project-ref bwgwoqywmlaevyygkafg

echo ""
echo "✅ Deployment complete!"
echo ""
echo "The function will be available at:"
echo "https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/stripe-api-proxy"

