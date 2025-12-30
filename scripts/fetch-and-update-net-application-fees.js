/**
 * Fetch net application fees directly from Stripe using Edge Function
 * and update the database with accurate values
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchNetApplicationFeeFromStripe(paymentIntentId) {
  try {
    // Call the Edge Function to get payment intent with balance transaction
    const functionUrl = `${supabaseUrl}/functions/v1/stripe-get-payment-intent`;
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        payment_intent_id: paymentIntentId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`  ❌ Failed to fetch payment intent: ${response.status} - ${errorText.substring(0, 100)}`);
      return null;
    }

    const data = await response.json();
    
    // Get net application fee from balance transaction
    if (data?.balance_transaction?.net) {
      const netApplicationFee = data.balance_transaction.net / 100; // Convert from cents to dollars
      
      // Also get gross application fee for comparison
      const grossApplicationFee = (data.application_fee_amount || 0) / 100;
      const stripeFees = (data.balance_transaction.fee || 0) / 100;
      
      return {
        netApplicationFee,
        grossApplicationFee,
        stripeFees,
        balanceTransactionId: data.balance_transaction?.id
      };
    }
    
    return null;
  } catch (error) {
    console.warn(`  ❌ Error fetching from Stripe: ${error.message}`);
    return null;
  }
}

async function fetchAndUpdateNetApplicationFees() {
  try {
    console.log('\n🔄 Fetching Net Application Fees from Stripe\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get all bookings with payment intents
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, base_amount, commission_partner, stripe_payment_intent_id, payment_status, net_application_fee')
      .not('stripe_payment_intent_id', 'is', null)
      .not('commission_partner', 'is', null)
      .gt('commission_partner', 0)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching bookings:', error);
      return;
    }

    if (!bookings || bookings.length === 0) {
      console.log('✅ No bookings found with payment intents');
      return;
    }

    console.log(`📊 Found ${bookings.length} bookings to sync\n`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    for (const booking of bookings) {
      const { id, base_amount, commission_partner, stripe_payment_intent_id, payment_status, net_application_fee: currentNetFee } = booking;
      
      console.log(`📝 Booking ${id.substring(0, 8)}...`);
      console.log(`   Payment Intent: ${stripe_payment_intent_id}`);
      console.log(`   Base Amount: $${parseFloat(base_amount).toFixed(2)}`);
      console.log(`   Commission: $${parseFloat(commission_partner).toFixed(2)}`);
      console.log(`   Status: ${payment_status}`);
      if (currentNetFee) {
        console.log(`   Current DB Value: $${parseFloat(currentNetFee).toFixed(2)}`);
      }

      // Fetch net application fee from Stripe
      const stripeData = await fetchNetApplicationFeeFromStripe(stripe_payment_intent_id);

      if (!stripeData) {
        console.log(`   ⚠️ Skipped: Could not fetch from Stripe`);
        skippedCount++;
        console.log('');
        continue;
      }

      const { netApplicationFee, grossApplicationFee, stripeFees } = stripeData;
      
      console.log(`   💰 Stripe Data:`);
      console.log(`      Gross Application Fee: $${grossApplicationFee.toFixed(2)}`);
      console.log(`      Stripe Fees: $${stripeFees.toFixed(2)}`);
      console.log(`      Net Application Fee: $${netApplicationFee.toFixed(2)}`);

      // Check if update is needed
      const needsUpdate = !currentNetFee || 
                         Math.abs(parseFloat(currentNetFee) - netApplicationFee) > 0.01;

      if (!needsUpdate) {
        console.log(`   ✅ Already correct (no update needed)`);
        unchangedCount++;
        console.log('');
        continue;
      }

      // Update database
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          net_application_fee: netApplicationFee,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.log(`   ❌ Failed to update: ${updateError.message}`);
        failCount++;
      } else {
        if (currentNetFee) {
          const diff = netApplicationFee - parseFloat(currentNetFee);
          console.log(`   ✅ Updated: ${diff >= 0 ? '+' : ''}$${diff.toFixed(2)} (${diff >= 0 ? 'increase' : 'decrease'})`);
          updatedCount++;
        } else {
          console.log(`   ✅ Added: $${netApplicationFee.toFixed(2)}`);
          updatedCount++;
        }
        successCount++;
      }
      
      console.log('');
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Summary:');
    console.log(`   Total bookings: ${bookings.length}`);
    console.log(`   ✅ Successfully updated: ${updatedCount}`);
    console.log(`   ✅ Already correct: ${unchangedCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⚠️ Skipped: ${skippedCount}`);
    
    // Calculate new total
    const { data: summaryData } = await supabase
      .from('bookings')
      .select('net_application_fee')
      .not('net_application_fee', 'is', null)
      .not('commission_partner', 'is', null)
      .gt('commission_partner', 0);
    
    if (summaryData) {
      const totalNetApplicationFee = summaryData.reduce((sum, b) => sum + parseFloat(b.net_application_fee || 0), 0);
      console.log(`\n💰 Total Net Application Fee: $${totalNetApplicationFee.toFixed(2)}`);
    }
    
    console.log('\n✅ Sync complete\n');

  } catch (error) {
    console.error('❌ Error syncing net application fees:', error);
  }
}

// Run the sync
fetchAndUpdateNetApplicationFees();

