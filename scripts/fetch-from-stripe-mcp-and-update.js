/**
 * Fetch net application fees from Stripe using MCP and update database
 * Note: Stripe MCP doesn't provide balance transactions directly,
 * so we'll use the Edge Function which uses Stripe API
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

async function fetchBalanceTransactionFromStripe(paymentIntentId) {
  try {
    // Use Edge Function which calls Stripe API (best we can do with current MCP limitations)
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
      console.warn(`  Error ${response.status}: ${errorText.substring(0, 100)}`);
      return null;
    }

    const data = await response.json();
    
    if (data?.balance_transaction?.net) {
      return {
        netApplicationFee: data.balance_transaction.net / 100,
        grossApplicationFee: (data.application_fee_amount || 0) / 100,
        stripeFees: (data.balance_transaction.fee || 0) / 100,
        balanceTransactionId: data.balance_transaction.id
      };
    }
    
    return null;
  } catch (error) {
    console.warn(`Error fetching for ${paymentIntentId}:`, error.message);
    return null;
  }
}

async function syncAllNetApplicationFees() {
  try {
    console.log('\n🔄 Fetching Net Application Fees from Stripe (via Edge Function)\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get all bookings with payment intents
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, stripe_payment_intent_id, base_amount, commission_partner, net_application_fee, payment_status')
      .not('stripe_payment_intent_id', 'is', null)
      .not('commission_partner', 'is', null)
      .gt('commission_partner', 0)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching bookings:', error);
      return;
    }

    if (!bookings || bookings.length === 0) {
      console.log('✅ No bookings found');
      return;
    }

    console.log(`📊 Found ${bookings.length} bookings to sync\n`);

    let successCount = 0;
    let failCount = 0;
    let skippedCount = 0;
    let unchangedCount = 0;
    const updates = [];

    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      const { id, stripe_payment_intent_id, base_amount, commission_partner, net_application_fee: currentNetFee, payment_status } = booking;
      
      process.stdout.write(`[${i + 1}/${bookings.length}] Processing ${id.substring(0, 8)}... `);

      // Fetch from Stripe
      const stripeData = await fetchBalanceTransactionFromStripe(stripe_payment_intent_id);

      if (!stripeData) {
        console.log('⚠️  Skipped (no Stripe data)');
        skippedCount++;
        continue;
      }

      const { netApplicationFee, grossApplicationFee, stripeFees } = stripeData;

      // Check if update needed
      const currentFee = currentNetFee ? parseFloat(currentNetFee) : null;
      const needsUpdate = !currentFee || Math.abs(currentFee - netApplicationFee) > 0.01;

      if (!needsUpdate) {
        console.log(`✅ OK (${netApplicationFee.toFixed(2)})`);
        unchangedCount++;
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
        console.log(`❌ Failed: ${updateError.message}`);
        failCount++;
      } else {
        const change = currentFee ? (netApplicationFee - currentFee).toFixed(2) : 'NEW';
        console.log(`✅ Updated: $${netApplicationFee.toFixed(2)} (${change >= 0 ? '+' : ''}$${change})`);
        successCount++;
        updates.push({
          bookingId: id,
          oldValue: currentFee,
          newValue: netApplicationFee
        });
      }

      // Rate limiting
      if (i < bookings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }

    // Calculate new total
    const { data: summaryData } = await supabase
      .from('bookings')
      .select('net_application_fee')
      .not('net_application_fee', 'is', null)
      .not('commission_partner', 'is', null)
      .gt('commission_partner', 0);
    
    const totalNetApplicationFee = summaryData?.reduce((sum, b) => sum + parseFloat(b.net_application_fee || 0), 0) || 0;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Summary:');
    console.log(`   Total bookings: ${bookings.length}`);
    console.log(`   ✅ Updated: ${successCount}`);
    console.log(`   ✅ Unchanged: ${unchangedCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   ⚠️  Skipped: ${skippedCount}`);
    console.log(`\n💰 New Total Net Application Fee: $${totalNetApplicationFee.toFixed(2)}`);
    console.log('\n✅ Sync complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the sync
syncAllNetApplicationFees();

