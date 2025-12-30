/**
 * Utility script to sync platform earnings from Stripe metadata to database
 * 
 * This script:
 * 1. Finds all bookings with commission_partner but missing platform_earnings
 * 2. Fetches platform earnings from Stripe payment intent metadata
 * 3. Updates the database with the correct platform earnings
 * 
 * Usage:
 * node scripts/sync-platform-earnings.js [--limit=N] [--dry-run]
 * 
 * Options:
 *   --limit=N    Limit to N bookings (default: all)
 *   --dry-run    Show what would be updated without making changes
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const dryRun = args.includes('--dry-run');

console.log('🔍 Platform Earnings Sync Script');
console.log('================================');
console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
if (limit) console.log(`Limit: ${limit} bookings`);
console.log('');

async function fetchPlatformEarningsFromStripe(paymentIntentId) {
  try {
    // Call the Edge Function to fetch payment intent metadata
    const functionUrl = `${SUPABASE_URL}/functions/v1/stripe-get-payment-intent`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        payment_intent_id: paymentIntentId
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log(`  ⚠️ Edge Function error: ${errorData.error || response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    // Extract platformEarnings from metadata
    if (data?.metadata?.platformEarnings) {
      const platformEarnings = parseFloat(data.metadata.platformEarnings);
      
      // If the value seems to be in cents (very large number), convert to dollars
      if (!isNaN(platformEarnings)) {
        return platformEarnings > 10000 ? platformEarnings / 100 : platformEarnings;
      }
    }
    
    return null;
  } catch (error) {
    console.log(`  ⚠️ Error fetching from Stripe: ${error.message}`);
    return null;
  }
}

async function syncPlatformEarnings() {
  try {
    console.log('📊 Fetching bookings missing platform_earnings...');
    
    // Build query
    let query = supabase
      .from('bookings')
      .select('id, stripe_payment_intent_id, commission_partner, platform_earnings, payment_status, created_at')
      .not('commission_partner', 'is', null)
      .gt('commission_partner', 0)
      .is('platform_earnings', null)
      .not('stripe_payment_intent_id', 'is', null)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('❌ Error fetching bookings:', error);
      return;
    }

    if (!bookings || bookings.length === 0) {
      console.log('✅ No bookings found that need platform earnings sync');
      return;
    }

    console.log(`✅ Found ${bookings.length} bookings missing platform_earnings\n`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const booking of bookings) {
      const { id, stripe_payment_intent_id, commission_partner, payment_status, created_at } = booking;
      
      console.log(`📝 Booking ${id.substring(0, 8)}...`);
      console.log(`   Payment Intent: ${stripe_payment_intent_id}`);
      console.log(`   Commission: $${parseFloat(commission_partner).toFixed(2)}`);
      console.log(`   Status: ${payment_status}`);
      console.log(`   Created: ${new Date(created_at).toLocaleDateString()}`);

      if (!stripe_payment_intent_id) {
        console.log(`   ⚠️ Skipped: No payment intent ID`);
        skippedCount++;
        console.log('');
        continue;
      }

      // Fetch platform earnings from Stripe
      const platformEarnings = await fetchPlatformEarningsFromStripe(stripe_payment_intent_id);

      if (platformEarnings === null) {
        console.log(`   ⚠️ Skipped: Could not fetch platform earnings from Stripe`);
        skippedCount++;
        console.log('');
        continue;
      }

      console.log(`   💰 Platform Earnings: $${platformEarnings.toFixed(2)}`);

      if (!dryRun) {
        // Update database
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            platform_earnings: platformEarnings,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.log(`   ❌ Failed to update: ${updateError.message}`);
          failCount++;
        } else {
          console.log(`   ✅ Updated successfully`);
          successCount++;
        }
      } else {
        console.log(`   🔍 Would update to: $${platformEarnings.toFixed(2)}`);
        successCount++;
      }
      
      console.log('');
    }

    console.log('\n📊 Summary:');
    console.log(`   Total bookings: ${bookings.length}`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`   Skipped: ${skippedCount}`);

    if (dryRun) {
      console.log('\n⚠️ DRY RUN MODE - No changes were made');
      console.log('   Run without --dry-run to apply changes');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the sync
syncPlatformEarnings().then(() => {
  console.log('\n✅ Sync complete');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

