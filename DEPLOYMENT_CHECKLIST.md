# Platform Earnings Sync - Deployment Checklist

## Overview
This checklist ensures the platform earnings sync feature is properly deployed and working for refunded bookings.

## Pre-Deployment

### 1. Edge Function Deployment
- [ ] **Deploy `stripe-get-payment-intent` Edge Function**
  ```bash
  # Navigate to supabase directory
  cd supabase/functions/stripe-get-payment-intent
  
  # Deploy using Supabase CLI
  supabase functions deploy stripe-get-payment-intent
  ```
  
- [ ] **Verify Edge Function is accessible**
  - Test endpoint: `POST /functions/v1/stripe-get-payment-intent`
  - Should return payment intent metadata including `platformEarnings`

### 2. Environment Variables
- [ ] **Verify Stripe Secret Key is set in Supabase**
  ```bash
  supabase secrets list
  # Should show: STRIPE_SECRET_KEY
  ```
  
- [ ] **Set if missing:**
  ```bash
  supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
  ```

### 3. Database Verification
- [ ] **Verify `bookings` table has `platform_earnings` column**
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'bookings' AND column_name = 'platform_earnings';
  ```

- [ ] **Verify `stripe_payment_intent_id` column exists**
  ```sql
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'bookings' AND column_name = 'stripe_payment_intent_id';
  ```

## Deployment Steps

### 1. Frontend Changes
- [x] ✅ `src/services/stripeService.js` - Added sync functions
- [x] ✅ `src/hooks/useCommissionData.js` - Added auto-sync
- [x] ✅ `src/hooks/useBookings.js` - Added sync during refunds

### 2. Edge Functions
- [x] ✅ `supabase/functions/stripe-get-payment-intent/index.ts` - Created
- [x] ✅ `supabase/functions/stripe-refund/index.ts` - Updated

### 3. Deploy Edge Functions
```bash
# Deploy new function
supabase functions deploy stripe-get-payment-intent

# Redeploy updated function (if needed)
supabase functions deploy stripe-refund
```

## Testing

### 1. Test Edge Function
```bash
# Test the get-payment-intent function
curl -X POST https://your-project.supabase.co/functions/v1/stripe-get-payment-intent \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"payment_intent_id": "pi_3SXgCSFKyd3TG8v10vY3rA1j"}'
```

### 2. Test Refund Sync
- [ ] Process a refund for a booking that has `stripe_payment_intent_id`
- [ ] Check console logs for sync messages
- [ ] Verify `platform_earnings` is updated in database
- [ ] Verify commission dashboard shows correct earnings

### 3. Test Commission Dashboard
- [ ] Open commission management page
- [ ] Check browser console for sync operations
- [ ] Verify refunded bookings show platform earnings
- [ ] Verify totals are correct

### 4. Test Backfill Script (Optional)
```bash
# Dry run first
node scripts/sync-platform-earnings.js --dry-run --limit=5

# Then run for real
node scripts/sync-platform-earnings.js --limit=10
```

## Post-Deployment Verification

### 1. Monitor Logs
- [ ] Check Supabase Edge Function logs for errors
- [ ] Check browser console for sync operations
- [ ] Verify no excessive API calls to Stripe

### 2. Data Verification
- [ ] Run query to check sync status:
  ```sql
  SELECT 
    COUNT(*) as total_bookings,
    COUNT(platform_earnings) as with_earnings,
    COUNT(*) - COUNT(platform_earnings) as missing_earnings
  FROM bookings
  WHERE commission_partner IS NOT NULL 
    AND commission_partner > 0
    AND stripe_payment_intent_id IS NOT NULL;
  ```

### 3. Performance Check
- [ ] Verify commission page loads quickly
- [ ] Check that sync operations don't block UI
- [ ] Monitor Edge Function response times

## Troubleshooting

### Edge Function Not Working
1. Check Supabase dashboard → Edge Functions → Logs
2. Verify `STRIPE_SECRET_KEY` secret is set
3. Check function deployment status
4. Verify CORS headers are correct

### Platform Earnings Not Syncing
1. Check browser console for errors
2. Verify payment intent ID exists in database
3. Test Edge Function directly with a known payment intent ID
4. Check Stripe dashboard to verify metadata exists

### Database Update Failing
1. Check RLS policies allow updates to `platform_earnings`
2. Verify user has admin permissions
3. Check database logs for constraint violations

## Rollback Plan

If issues occur:

1. **Disable auto-sync in frontend:**
   - Comment out sync code in `useCommissionData.js`
   - Comment out sync in `useBookings.js` refund processing

2. **Revert Edge Function:**
   ```bash
   supabase functions deploy stripe-get-payment-intent --version previous
   ```

3. **Manual sync option:**
   - Use admin panel to manually trigger sync
   - Or run backfill script for specific bookings

## Success Criteria

- ✅ Refunded bookings show platform earnings in commission dashboard
- ✅ Platform earnings sync automatically on refund processing
- ✅ Commission data loads without errors
- ✅ Edge Function responds within 2 seconds
- ✅ No performance degradation in commission dashboard

## Notes

- Sync operations are non-blocking and happen in background
- Limited to 10 bookings per commission data load to prevent performance issues
- Refund processing includes sync to ensure data is immediately available
- Edge Function requires admin authentication for security

