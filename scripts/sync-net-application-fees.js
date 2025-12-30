/**
 * Script to sync net application fees from Stripe for all bookings
 * Fetches balance transaction data from Stripe and updates the database
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
      console.warn(`Failed to fetch payment intent: ${response.status}`, errorText);
      return null;
    }

    const data = await response.json();
    
    // Get net application fee from balance transaction
    if (data?.balance_transaction?.net) {
      const netApplicationFee = data.balance_transaction.net / 100; // Convert from cents to dollars
      return netApplicationFee;
    }
    
    return null;
  } catch (error) {
    console.warn('Error fetching net application fee:', error);
    return null;
  }
}

async function syncNetApplicationFees() {
  try {
    console.log('\n🔄 Syncing Net Application Fees from Stripe\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get bookings that need syncing
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, base_amount, commission_partner, stripe_payment_intent_id, payment_status, created_at')
      .not('commission_partner', 'is', null)
      .gt('commission_partner', 0)
      .not('stripe_payment_intent_id', 'is', null)
      .or('net_application_fee.is.null,net_application_fee.eq.0')
      .order('created_at', { ascending: false })
      .limit(50); // Process in batches

    if (error) {
      console.error('Error fetching bookings:', error);
      return;
    }

    if (!bookings || bookings.length === 0) {
      console.log('✅ No bookings need syncing');
      return;
    }

    console.log(`📊 Found ${bookings.length} bookings to sync\n`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;

    for (const booking of bookings) {
      const { id, base_amount, commission_partner, stripe_payment_intent_id, payment_status, created_at } = booking;
      
      console.log(`📝 Booking ${id.substring(0, 8)}...`);
      console.log(`   Payment Intent: ${stripe_payment_intent_id}`);
      console.log(`   Base Amount: $${parseFloat(base_amount).toFixed(2)}`);
      console.log(`   Commission: $${parseFloat(commission_partner).toFixed(2)}`);
      console.log(`   Status: ${payment_status}`);
      console.log(`   Created: ${new Date(created_at).toLocaleDateString()}`);

      // Try to fetch net application fee from Stripe first
      let netApplicationFee = await fetchNetApplicationFeeFromStripe(stripe_payment_intent_id);

      // If Stripe data unavailable, calculate estimated value
      if (netApplicationFee === null) {
        console.log(`   ⚠️ Could not fetch from Stripe, calculating estimate...`);
        
        // Import StripeService for calculation
        const { default: StripeService } = await import('../src/services/stripeService.js');
        
        // Get service fee and processing fee if available
        const { data: bookingDetails } = await supabase
          .from('bookings')
          .select('service_fee, payment_processing_fee')
          .eq('id', id)
          .single();
        
        const serviceFee = parseFloat(bookingDetails?.service_fee || 0);
        const processingFee = parseFloat(bookingDetails?.payment_processing_fee || 0);
        
        // Calculate estimated net application fee
        netApplicationFee = StripeService.calculateEstimatedNetApplicationFee(
          parseFloat(base_amount),
          serviceFee || null,
          processingFee || null,
          parseFloat(commission_partner)
        );
        
        console.log(`   💰 Estimated Net Application Fee: $${netApplicationFee.toFixed(2)}`);
      } else {
        console.log(`   💰 Net Application Fee (from Stripe): $${netApplicationFee.toFixed(2)}`);
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
        console.log(`   ✅ Updated successfully`);
        successCount++;
      }
      
      console.log('');
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Summary:');
    console.log(`   Total bookings: ${bookings.length}`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log('\n✅ Sync complete\n');

  } catch (error) {
    console.error('❌ Error syncing net application fees:', error);
  }
}

// Run the sync
syncNetApplicationFees();

