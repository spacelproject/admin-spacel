/**
 * Check a specific refunded booking in Stripe
 * Fetches payment intent and refund details
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

async function checkRefundedBookingStripe(paymentIntentId, refundId) {
  try {
    console.log('\n🔍 Checking Refunded Booking in Stripe\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Payment Intent ID: ${paymentIntentId}`);
    console.log(`Refund ID: ${refundId}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Call Edge Function to get payment intent details
    const functionUrl = `${supabaseUrl}/functions/v1/stripe-get-payment-intent`;
    
    console.log('📡 Fetching payment intent from Stripe...\n');
    
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
      console.error(`❌ Failed to fetch payment intent: ${response.status}`);
      console.error(`Error: ${errorText}`);
      return;
    }

    const paymentIntentData = await response.json();

    console.log('✅ Payment Intent Retrieved\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📋 PAYMENT INTENT DETAILS:\n');
    console.log(`   ID: ${paymentIntentData.id}`);
    console.log(`   Status: ${paymentIntentData.status}`);
    console.log(`   Amount: $${(paymentIntentData.amount / 100).toFixed(2)}`);
    console.log(`   Currency: ${paymentIntentData.currency}`);
    console.log(`   Created: ${new Date(paymentIntentData.created * 1000).toLocaleString()}`);
    console.log(`   Application Fee Amount: $${((paymentIntentData.application_fee_amount || 0) / 100).toFixed(2)}`);

    if (paymentIntentData.metadata) {
      console.log('\n📝 Metadata:');
      Object.entries(paymentIntentData.metadata).forEach(([key, value]) => {
        if (typeof value === 'string' && value.includes('.')) {
          // Try to format as currency if it looks like a dollar amount
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && numValue > 0 && numValue < 10000) {
            console.log(`   ${key}: $${numValue.toFixed(2)}`);
          } else {
            console.log(`   ${key}: ${value}`);
          }
        } else {
          console.log(`   ${key}: ${value}`);
        }
      });
    }

    if (paymentIntentData.charge) {
      console.log('\n💳 CHARGE DETAILS:\n');
      console.log(`   Charge ID: ${paymentIntentData.charge.id}`);
      console.log(`   Amount: $${(paymentIntentData.charge.amount / 100).toFixed(2)}`);
      console.log(`   Amount Captured: $${(paymentIntentData.charge.amount_captured / 100).toFixed(2)}`);
      console.log(`   Application Fee: $${((paymentIntentData.charge.application_fee_amount || 0) / 100).toFixed(2)}`);
      console.log(`   Charge Fee: $${((paymentIntentData.charge.fee || 0) / 100).toFixed(2)}`);
      console.log(`   Charge Net: $${((paymentIntentData.charge.net || 0) / 100).toFixed(2)}`);
    }

    if (paymentIntentData.balance_transaction) {
      console.log('\n💰 BALANCE TRANSACTION (Original Payment):\n');
      const bt = paymentIntentData.balance_transaction;
      console.log(`   Balance Transaction ID: ${bt.id}`);
      console.log(`   Amount: $${(bt.amount / 100).toFixed(2)}`);
      console.log(`   Fees: $${(bt.fee / 100).toFixed(2)}`);
      console.log(`   Net: $${(bt.net / 100).toFixed(2)}`);
      
      if (bt.fee_details && bt.fee_details.length > 0) {
        console.log('\n   Fee Breakdown:');
        bt.fee_details.forEach((fee, index) => {
          console.log(`     ${index + 1}. ${fee.type || 'Unknown'}: $${((fee.amount || 0) / 100).toFixed(2)}`);
        });
      }
    }

    // Note about refunds
    console.log('\n⚠️  NOTE ABOUT REFUNDS:');
    console.log('   - This shows the ORIGINAL payment balance transaction');
    console.log('   - When a refund occurs, Stripe creates a separate refund balance transaction');
    console.log('   - Stripe fees from the original payment are typically NOT refunded');
    console.log('   - The refund balance transaction will show negative amounts');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Analysis Complete\n');

    // Calculate what we expect
    if (paymentIntentData.balance_transaction) {
      const originalNet = paymentIntentData.balance_transaction.net / 100;
      const originalFee = paymentIntentData.balance_transaction.fee / 100;
      const appFee = (paymentIntentData.application_fee_amount || 0) / 100;
      
      console.log('📊 EXPECTED REFUND IMPACT:\n');
      console.log(`   Original Net Application Fee Received: $${originalNet.toFixed(2)}`);
      console.log(`   Original Stripe Fees Paid: $${originalFee.toFixed(2)}`);
      console.log(`   Gross Application Fee: $${appFee.toFixed(2)}`);
      console.log('\n   On Refund:');
      console.log(`   - Application Fee Refunded: -$${appFee.toFixed(2)}`);
      console.log(`   - Stripe Fees (Non-refundable): -$${originalFee.toFixed(2)}`);
      console.log(`   - Total Platform Loss: -$${(originalNet + originalFee).toFixed(2)}`);
      console.log('\n   Platform should have:');
      console.log(`   - platform_earnings: $0.00 (or negative)`);
      console.log(`   - net_application_fee: $0.00 (or negative)`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error checking refunded booking:', error);
  }
}

// Get booking details from database first
const paymentIntentId = 'pi_3SXgCSFKyd3TG8v10vY3rA1j';
const refundId = 're_3SXgCSFKyd3TG8v10Rh0n6gr';

checkRefundedBookingStripe(paymentIntentId, refundId);

