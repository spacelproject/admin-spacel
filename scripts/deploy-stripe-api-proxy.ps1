# Deploy Stripe API Proxy Edge Function (PowerShell)
# 
# Usage:
#   .\scripts\deploy-stripe-api-proxy.ps1
# 
# Or manually:
#   cd supabase\functions\stripe-api-proxy
#   supabase functions deploy stripe-api-proxy --project-ref bwgwoqywmlaevyygkafg

Write-Host "🚀 Deploying Stripe API Proxy Edge Function..." -ForegroundColor Cyan
Write-Host ""

# Navigate to function directory
Set-Location supabase\functions\stripe-api-proxy

# Deploy the function
supabase functions deploy stripe-api-proxy --project-ref bwgwoqywmlaevyygkafg

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "The function will be available at:"
Write-Host "https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/stripe-api-proxy" -ForegroundColor Yellow

