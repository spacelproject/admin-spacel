-- Direct SQL Script to Clean All Stripe Connect Account Records
-- 
-- WARNING: This will only clear the database records.
-- You must also delete the accounts from Stripe using the Stripe API or Dashboard.
-- 
-- To run this:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" or press Ctrl+Enter
--
-- Or use Supabase CLI:
--   supabase db execute -f scripts/clean-stripe-connect-accounts-direct.sql

BEGIN;

-- Show counts before deletion
DO $$
DECLARE
  partners_with_accounts INT;
BEGIN
  SELECT COUNT(*) INTO partners_with_accounts 
  FROM profiles 
  WHERE role = 'partner' AND stripe_account_id IS NOT NULL;
  
  RAISE NOTICE 'Partners with Stripe Connect accounts: %', partners_with_accounts;
END $$;

-- Clear all Stripe Connect account fields for partners
UPDATE profiles
SET 
  stripe_account_id = NULL,
  stripe_onboarding_completed = FALSE,
  stripe_account_status = 'pending',
  updated_at = NOW()
WHERE role = 'partner' 
  AND stripe_account_id IS NOT NULL;

-- Show final counts
DO $$
DECLARE
  partners_with_accounts INT;
BEGIN
  SELECT COUNT(*) INTO partners_with_accounts 
  FROM profiles 
  WHERE role = 'partner' AND stripe_account_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Final count (should be 0): %', partners_with_accounts;
  
  IF partners_with_accounts = 0 THEN
    RAISE NOTICE '✅ All Stripe Connect account records cleared!';
  ELSE
    RAISE NOTICE '⚠️  Some partners still have Stripe account IDs';
  END IF;
END $$;

COMMIT;

-- Note: This only clears the database records.
-- You must also delete the actual Stripe Connect accounts from Stripe:
-- 1. Use Stripe Dashboard: https://dashboard.stripe.com/connect/accounts
-- 2. Or use Stripe API: DELETE /v1/accounts/{account_id}
-- 3. Or use the Node.js script: node scripts/clean-all-stripe-connect-accounts.js

