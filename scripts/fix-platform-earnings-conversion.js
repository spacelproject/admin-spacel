/**
 * Fix script to correct platform_earnings that were stored incorrectly
 * 
 * Problem: Some platform_earnings were stored as cents instead of dollars
 * (e.g., 1374.00 instead of 13.74)
 * 
 * This script:
 * 1. Identifies bookings with suspiciously high platform_earnings
 * 2. Fetches correct values from Stripe metadata
 * 3. Updates the database with correct values
 * 
 * Usage:
 * node scripts/fix-platform-earnings-conversion.js [--dry-run] [--limit=N]
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Parse command line arguments
const args = process.argv.slice(2);
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const dryRun = args.includes('--dry-run');

console.log('🔧 Platform Earnings Conversion Fix Script');
console.log('==========================================');
console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE'}`);
if (limit) console.log(`Limit: ${limit} bookings`);
console.log('');

/**
 * Convert platform earnings from Stripe metadata
 * Stripe stores amounts in cents as integers, so "1374" = $13.74
 */
function convertPlatformEarnings(earningsStr) {
  if (!earningsStr) return null;
  
  const earnings = parseFloat(earningsStr);
  if (isNaN(earnings)) return null;
  
  const str = earningsStr.toString();
  
  // If it has a decimal point, it's already in dollars
  if (str.includes('.')) {
    return earnings;
  }
  
  // Otherwise, it's in cents - convert to dollars
  return earnings / 100;
}

async function fetchPlatformEarningsFromStripe(paymentIntentId) {
  try {
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
      return null;
    }

    const data = await response.json();
    
    if (data?.metadata?.platformEarnings) {
      return convertPlatformEarnings(data.metadata.platformEarnings);
    }
    
    return null;
  } catch (error) {
    console.log(`  ⚠️ Error fetching from Stripe: ${error.message}`);
    return null;
  }
}

async function fixPlatformEarnings() {
  try {
    console.log('📊 Finding bookings with incorrect platform_earnings...');
    
    // Find bookings where platform_earnings is suspiciously high
    // (more than 10x the commission_partner, which indicates cents stored as dollars)
    let query = supabase
      .from('bookings')
      .select('id, base_amount, commission_partner, platform_earnings, stripe_payment_intent_id, payment_status, created_at')
      .not('commission_partner', 'is', null)
      .gt('commission_partner', 0)
      .not('platform_earnings', 'is', null)
      .not('stripe_payment_intent_id', 'is', null);

    if (limit) {
      query = query.limit(limit);
    }

    const { data: bookings, error } = await query;

    if (error) {
      console.error('❌ Error fetching bookings:', error);
      return;
    }

    if (!bookings || bookings.length === 0) {
      console.log('✅ No bookings found');
      return;
    }

    // Filter to only bookings where platform_earnings seems wrong
    // (platform_earnings > commission_partner * 10 suggests cents stored as dollars)
    const suspiciousBookings = bookings.filter(booking => {
      const commission = parseFloat(booking.commission_partner);
      const earnings = parseFloat(booking.platform_earnings);
      return earnings > commission * 10;
    });

    console.log(`✅ Found ${suspiciousBookings.length} bookings with suspicious platform_earnings\n`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const booking of suspiciousBookings) {
      const { id, base_amount, commission_partner, platform_earnings, stripe_payment_intent_id, payment_status, created_at } = booking;
      
      console.log(`📝 Booking ${id.substring(0, 8)}...`);
      console.log(`   Payment Intent: ${stripe_payment_intent_id}`);
      console.log(`   Commission: $${parseFloat(commission_partner).toFixed(2)}`);
      console.log(`   Current Platform Earnings: $${parseFloat(platform_earnings).toFixed(2)}`);
      console.log(`   Status: ${payment_status}`);
      console.log(`   Created: ${new Date(created_at).toLocaleDateString()}`);

      // Fetch correct value from Stripe
      const correctEarnings = await fetchPlatformEarningsFromStripe(stripe_payment_intent_id);

      if (correctEarnings === null) {
        console.log(`   ⚠️ Skipped: Could not fetch from Stripe`);
        skippedCount++;
        console.log('');
        continue;
      }

      const currentEarnings = parseFloat(platform_earnings);
      const difference = Math.abs(currentEarnings - correctEarnings);

      console.log(`   💰 Correct Platform Earnings: $${correctEarnings.toFixed(2)}`);
      console.log(`   📊 Difference: $${difference.toFixed(2)}`);

      // Only update if there's a significant difference (more than 1% or $0.01)
      if (difference < 0.01 && Math.abs(currentEarnings - correctEarnings) / Math.max(currentEarnings, correctEarnings) < 0.01) {
        console.log(`   ✅ Already correct`);
        skippedCount++;
        console.log('');
        continue;
      }

      if (!dryRun) {
        // Update database
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            platform_earnings: correctEarnings,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.log(`   ❌ Failed to update: ${updateError.message}`);
          failCount++;
        } else {
          console.log(`   ✅ Updated from $${currentEarnings.toFixed(2)} to $${correctEarnings.toFixed(2)}`);
          successCount++;
        }
      } else {
        console.log(`   🔍 Would update from $${currentEarnings.toFixed(2)} to $${correctEarnings.toFixed(2)}`);
        successCount++;
      }
      
      console.log('');
    }

    console.log('\n📊 Summary:');
    console.log(`   Total suspicious bookings: ${suspiciousBookings.length}`);
    console.log(`   Would fix: ${successCount}`);
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

// Run the fix
fixPlatformEarnings().then(() => {
  console.log('\n✅ Fix complete');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

