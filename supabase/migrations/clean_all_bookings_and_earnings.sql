-- Clean All Bookings and Earnings Migration
-- 
-- WARNING: This migration will DELETE ALL booking and earnings records.
-- This is a destructive operation and cannot be undone.
-- 
-- Run this migration only if you want to completely clean the database.
-- 
-- Usage:
--   supabase migration new clean_all_bookings_and_earnings
--   # Copy this SQL to the migration file
--   supabase db reset  # or apply migration

BEGIN;

-- Disable triggers temporarily to speed up deletion
SET session_replication_role = 'replica';

-- Delete in order to respect foreign key constraints

-- 1. Delete booking_modifications (references bookings)
DELETE FROM booking_modifications;

-- 2. Delete payment_logs (may reference bookings via booking_id)
DELETE FROM payment_logs;

-- 3. Delete earnings (may reference bookings via booking_id)
DELETE FROM earnings;

-- 4. Delete platform_earnings
DELETE FROM platform_earnings;

-- 5. Delete payout_requests (may reference bookings or earnings)
DELETE FROM payout_requests;

-- 6. Delete all bookings (main table)
DELETE FROM bookings;

-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- Verify deletion (optional - uncomment to check)
-- SELECT 
--   (SELECT COUNT(*) FROM bookings) as bookings_count,
--   (SELECT COUNT(*) FROM earnings) as earnings_count,
--   (SELECT COUNT(*) FROM platform_earnings) as platform_earnings_count,
--   (SELECT COUNT(*) FROM booking_modifications) as booking_modifications_count,
--   (SELECT COUNT(*) FROM payment_logs) as payment_logs_count,
--   (SELECT COUNT(*) FROM payout_requests) as payout_requests_count;

