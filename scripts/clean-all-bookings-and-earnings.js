/**
 * Clean All Bookings and Earnings Script
 * 
 * WARNING: This script will DELETE ALL booking and earnings records from the database.
 * This is a destructive operation and cannot be undone.
 * 
 * Usage:
 *   node scripts/clean-all-bookings-and-earnings.js
 * 
 * For dry run (preview only):
 *   node scripts/clean-all-bookings-and-earnings.js --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const dryRun = process.argv.includes('--dry-run');

async function getRecordCounts() {
  console.log('📊 Getting record counts...\n');
  
  const counts = {};
  
  // Count bookings
  const { count: bookingsCount } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true });
  counts.bookings = bookingsCount || 0;
  
  // Count earnings
  const { count: earningsCount } = await supabase
    .from('earnings')
    .select('*', { count: 'exact', head: true });
  counts.earnings = earningsCount || 0;
  
  // Count platform_earnings
  const { count: platformEarningsCount } = await supabase
    .from('platform_earnings')
    .select('*', { count: 'exact', head: true });
  counts.platform_earnings = platformEarningsCount || 0;
  
  // Count booking_modifications
  const { count: bookingModsCount } = await supabase
    .from('booking_modifications')
    .select('*', { count: 'exact', head: true });
  counts.booking_modifications = bookingModsCount || 0;
  
  // Count payment_logs
  const { count: paymentLogsCount } = await supabase
    .from('payment_logs')
    .select('*', { count: 'exact', head: true });
  counts.payment_logs = paymentLogsCount || 0;
  
  // Count payout_requests
  const { count: payoutRequestsCount } = await supabase
    .from('payout_requests')
    .select('*', { count: 'exact', head: true });
  counts.payout_requests = payoutRequestsCount || 0;
  
  // Count reviews with booking references
  const { count: reviewsCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .not('booking_id', 'is', null);
  counts.reviews_with_booking = reviewsCount || 0;
  
  // Count review_requests with booking references
  const { count: reviewRequestsCount } = await supabase
    .from('review_requests')
    .select('*', { count: 'exact', head: true })
    .not('booking_id', 'is', null);
  counts.review_requests_with_booking = reviewRequestsCount || 0;
  
  return counts;
}

async function cleanAllData() {
  console.log('🧹 Starting cleanup process...\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No data will be deleted\n');
  } else {
    console.log('⚠️  WARNING: This will DELETE ALL data!\n');
  }
  
  // Get counts first
  const counts = await getRecordCounts();
  
  console.log('📋 Records to be deleted:');
  console.log(`   - Bookings: ${counts.bookings}`);
  console.log(`   - Earnings: ${counts.earnings}`);
  console.log(`   - Platform Earnings: ${counts.platform_earnings}`);
  console.log(`   - Booking Modifications: ${counts.booking_modifications}`);
  console.log(`   - Payment Logs: ${counts.payment_logs}`);
  console.log(`   - Payout Requests: ${counts.payout_requests}`);
  console.log(`   - Reviews (with booking): ${counts.reviews_with_booking}`);
  console.log(`   - Review Requests (with booking): ${counts.review_requests_with_booking}`);
  console.log('');
  
  if (dryRun) {
    console.log('✅ Dry run complete. No data was deleted.');
    console.log('   Run without --dry-run to actually delete the data.');
    return;
  }
  
  // Delete in order to respect foreign key constraints
  const results = {
    deleted: {},
    errors: []
  };
  
  try {
    // 1. Delete booking_modifications (references bookings)
    console.log('1️⃣  Deleting booking_modifications...');
    const { error: modsError } = await supabase
      .from('booking_modifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (modsError) {
      console.error('   ❌ Error:', modsError.message);
      results.errors.push({ table: 'booking_modifications', error: modsError.message });
    } else {
      results.deleted.booking_modifications = counts.booking_modifications;
      console.log(`   ✅ Deleted ${counts.booking_modifications} booking_modifications`);
    }
    
    // 2. Delete payment_logs (may reference bookings)
    console.log('2️⃣  Deleting payment_logs...');
    const { error: paymentLogsError } = await supabase
      .from('payment_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (paymentLogsError) {
      console.error('   ❌ Error:', paymentLogsError.message);
      results.errors.push({ table: 'payment_logs', error: paymentLogsError.message });
    } else {
      results.deleted.payment_logs = counts.payment_logs;
      console.log(`   ✅ Deleted ${counts.payment_logs} payment_logs`);
    }
    
    // 3. Delete earnings (may reference bookings)
    console.log('3️⃣  Deleting earnings...');
    const { error: earningsError } = await supabase
      .from('earnings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (earningsError) {
      console.error('   ❌ Error:', earningsError.message);
      results.errors.push({ table: 'earnings', error: earningsError.message });
    } else {
      results.deleted.earnings = counts.earnings;
      console.log(`   ✅ Deleted ${counts.earnings} earnings`);
    }
    
    // 4. Delete platform_earnings
    console.log('4️⃣  Deleting platform_earnings...');
    const { error: platformEarningsError } = await supabase
      .from('platform_earnings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (platformEarningsError) {
      console.error('   ❌ Error:', platformEarningsError.message);
      results.errors.push({ table: 'platform_earnings', error: platformEarningsError.message });
    } else {
      results.deleted.platform_earnings = counts.platform_earnings;
      console.log(`   ✅ Deleted ${counts.platform_earnings} platform_earnings`);
    }
    
    // 5. Delete payout_requests (may reference bookings or earnings)
    console.log('5️⃣  Deleting payout_requests...');
    const { error: payoutRequestsError } = await supabase
      .from('payout_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (payoutRequestsError) {
      console.error('   ❌ Error:', payoutRequestsError.message);
      results.errors.push({ table: 'payout_requests', error: payoutRequestsError.message });
    } else {
      results.deleted.payout_requests = counts.payout_requests;
      console.log(`   ✅ Deleted ${counts.payout_requests} payout_requests`);
    }
    
    // 6. Delete reviews that reference bookings
    console.log('6️⃣  Deleting reviews with booking references...');
    const { error: reviewsError } = await supabase
      .from('reviews')
      .delete()
      .not('booking_id', 'is', null);
    if (reviewsError) {
      console.error('   ❌ Error:', reviewsError.message);
      results.errors.push({ table: 'reviews', error: reviewsError.message });
    } else {
      results.deleted.reviews_with_booking = counts.reviews_with_booking;
      console.log(`   ✅ Deleted ${counts.reviews_with_booking} reviews with booking references`);
    }
    
    // 7. Delete review_requests that reference bookings
    console.log('7️⃣  Deleting review_requests with booking references...');
    const { error: reviewRequestsError } = await supabase
      .from('review_requests')
      .delete()
      .not('booking_id', 'is', null);
    if (reviewRequestsError) {
      console.error('   ❌ Error:', reviewRequestsError.message);
      results.errors.push({ table: 'review_requests', error: reviewRequestsError.message });
    } else {
      results.deleted.review_requests_with_booking = counts.review_requests_with_booking;
      console.log(`   ✅ Deleted ${counts.review_requests_with_booking} review_requests with booking references`);
    }
    
    // 8. Finally, delete bookings (this is the main table)
    console.log('6️⃣  Deleting bookings...');
    const { error: bookingsError } = await supabase
      .from('bookings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    if (bookingsError) {
      console.error('   ❌ Error:', bookingsError.message);
      results.errors.push({ table: 'bookings', error: bookingsError.message });
    } else {
      results.deleted.bookings = counts.bookings;
      console.log(`   ✅ Deleted ${counts.bookings} bookings`);
    }
    
    console.log('\n✅ Cleanup complete!\n');
    
    // Summary
    console.log('📊 Summary:');
    Object.entries(results.deleted).forEach(([table, count]) => {
      console.log(`   - ${table}: ${count} deleted`);
    });
    
    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      results.errors.forEach(({ table, error }) => {
        console.log(`   - ${table}: ${error}`);
      });
    }
    
    // Verify deletion
    console.log('\n🔍 Verifying deletion...');
    const finalCounts = await getRecordCounts();
    const allZero = Object.values(finalCounts).every(count => count === 0);
    
    if (allZero) {
      console.log('✅ All records successfully deleted!');
    } else {
      console.log('⚠️  Some records may still exist:');
      Object.entries(finalCounts).forEach(([table, count]) => {
        if (count > 0) {
          console.log(`   - ${table}: ${count} remaining`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanAllData()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

