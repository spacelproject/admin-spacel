-- Direct SQL Script to Clean All Bookings and Earnings
-- 
-- WARNING: This will DELETE ALL booking and earnings records permanently!
-- This cannot be undone. Make sure you have a backup if needed.
--
-- To run this:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" or press Ctrl+Enter
--
-- Or use Supabase CLI:
--   supabase db execute -f scripts/clean-bookings-earnings-direct.sql

BEGIN;

-- Show counts before deletion
DO $$
DECLARE
  bookings_count INT;
  earnings_count INT;
  platform_earnings_count INT;
  booking_mods_count INT;
  payment_logs_count INT;
  payout_requests_count INT;
BEGIN
  SELECT COUNT(*) INTO bookings_count FROM bookings;
  SELECT COUNT(*) INTO earnings_count FROM earnings;
  SELECT COUNT(*) INTO platform_earnings_count FROM platform_earnings;
  SELECT COUNT(*) INTO booking_mods_count FROM booking_modifications;
  SELECT COUNT(*) INTO payment_logs_count FROM payment_logs;
  SELECT COUNT(*) INTO payout_requests_count FROM payout_requests;
  
  RAISE NOTICE 'Records to be deleted:';
  RAISE NOTICE '  - Bookings: %', bookings_count;
  RAISE NOTICE '  - Earnings: %', earnings_count;
  RAISE NOTICE '  - Platform Earnings: %', platform_earnings_count;
  RAISE NOTICE '  - Booking Modifications: %', booking_mods_count;
  RAISE NOTICE '  - Payment Logs: %', payment_logs_count;
  RAISE NOTICE '  - Payout Requests: %', payout_requests_count;
END $$;

-- Delete in order to respect foreign key constraints

-- 1. Delete booking_modifications (references bookings)
DELETE FROM booking_modifications;
RAISE NOTICE 'Deleted booking_modifications';

-- 2. Delete payment_logs (may reference bookings)
DELETE FROM payment_logs;
RAISE NOTICE 'Deleted payment_logs';

-- 3. Delete earnings (may reference bookings)
DELETE FROM earnings;
RAISE NOTICE 'Deleted earnings';

-- 4. Delete platform_earnings
DELETE FROM platform_earnings;
RAISE NOTICE 'Deleted platform_earnings';

-- 5. Delete payout_requests (may reference bookings or earnings)
DELETE FROM payout_requests;
RAISE NOTICE 'Deleted payout_requests';

-- 6. Delete reviews that reference bookings
DELETE FROM reviews WHERE booking_id IS NOT NULL;
RAISE NOTICE 'Deleted reviews with booking references';

-- 7. Delete review_requests that reference bookings
DELETE FROM review_requests WHERE booking_id IS NOT NULL;
RAISE NOTICE 'Deleted review_requests with booking references';

-- 8. Finally, delete all bookings (main table)
DELETE FROM bookings;
RAISE NOTICE 'Deleted bookings';

-- Show final counts
DO $$
DECLARE
  bookings_count INT;
  earnings_count INT;
  platform_earnings_count INT;
  booking_mods_count INT;
  payment_logs_count INT;
  payout_requests_count INT;
BEGIN
  SELECT COUNT(*) INTO bookings_count FROM bookings;
  SELECT COUNT(*) INTO earnings_count FROM earnings;
  SELECT COUNT(*) INTO platform_earnings_count FROM platform_earnings;
  SELECT COUNT(*) INTO booking_mods_count FROM booking_modifications;
  SELECT COUNT(*) INTO payment_logs_count FROM payment_logs;
  SELECT COUNT(*) INTO payout_requests_count FROM payout_requests;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Final counts (should all be 0):';
  RAISE NOTICE '  - Bookings: %', bookings_count;
  RAISE NOTICE '  - Earnings: %', earnings_count;
  RAISE NOTICE '  - Platform Earnings: %', platform_earnings_count;
  RAISE NOTICE '  - Booking Modifications: %', booking_mods_count;
  RAISE NOTICE '  - Payment Logs: %', payment_logs_count;
  RAISE NOTICE '  - Payout Requests: %', payout_requests_count;
END $$;

COMMIT;

