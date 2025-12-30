/**
 * Check actual Stripe fees from a payment intent
 * Uses Edge Function to fetch balance transaction data
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

async function checkStripePaymentFees() {
  try {
    console.log('\n🔍 Checking Stripe Payment Fees\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get a succeeded payment intent from database
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, base_amount, stripe_payment_intent_id, payment_status, commission_partner, service_fee, payment_processing_fee')
      .eq('payment_status', 'paid')
      .not('stripe_payment_intent_id', 'is', null)
      .limit(1)
      .single();

    if (error || !booking) {
      console.log('⚠️  No paid bookings found, trying with any payment intent...');
      
      // Try any booking with payment intent
      const { data: anyBooking } = await supabase
        .from('bookings')
        .select('id, base_amount, stripe_payment_intent_id, payment_status, commission_partner')
        .not('stripe_payment_intent_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!anyBooking) {
        console.error('❌ No bookings found');
        return;
      }
      
      booking = anyBooking;
    }

    const paymentIntentId = booking.stripe_payment_intent_id;
    console.log(`📋 Checking Payment Intent: ${paymentIntentId}\n`);
    console.log(`   Booking ID: ${booking.id.substring(0, 8)}...`);
    console.log(`   Base Amount: $${parseFloat(booking.base_amount || 0).toFixed(2)}`);
    console.log(`   Commission: $${parseFloat(booking.commission_partner || 0).toFixed(2)}`);
    console.log(`   Status: ${booking.payment_status}\n`);

    // Try to fetch via Edge Function
    console.log('🔌 Fetching from Stripe via Edge Function...\n');
    
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
      console.error(`❌ Edge Function Error (${response.status}):`, errorText.substring(0, 200));
      console.log('\n⚠️  Cannot access balance transaction data. Using metadata instead...\n');
      
      // Fallback: Use payment intent metadata from Stripe MCP
      console.log('💡 Alternative: Check Stripe dashboard or use Stripe API directly for balance transaction data.\n');
      return;
    }

    const data = await response.json();
    
    console.log('✅ Payment Intent Data Retrieved:\n');
    
    // Parse metadata
    const metadata = data.metadata || {};
    const baseAmount = parseFloat(metadata.originalAmount || 0) / 100;
    const serviceFee = parseFloat(metadata.serviceFee || 0) / 100;
    const processingFee = parseFloat(metadata.paymentProcessingFee || 0) / 100;
    const commission = parseFloat(metadata.partnerFee || 0) / 100;
    const totalPaid = parseFloat(metadata.totalPaid || 0) / 100;
    const platformEarnings = parseFloat(metadata.platformEarnings || 0) / 100;
    
    console.log('📊 Transaction Breakdown:\n');
    console.log(`   Base Amount: $${baseAmount.toFixed(2)}`);
    console.log(`   Service Fee: $${serviceFee.toFixed(2)}`);
    console.log(`   Processing Fee: $${processingFee.toFixed(2)}`);
    console.log(`   Commission: $${commission.toFixed(2)}`);
    console.log(`   Total Paid: $${totalPaid.toFixed(2)}\n`);
    
    // Application fee breakdown
    const applicationFeeGross = serviceFee + processingFee + commission;
    console.log('💰 Application Fee (Gross):\n');
    console.log(`   Service Fee: $${serviceFee.toFixed(2)}`);
    console.log(`   Processing Fee: $${processingFee.toFixed(2)}`);
    console.log(`   Commission: $${commission.toFixed(2)}`);
    console.log(`   Total (Gross): $${applicationFeeGross.toFixed(2)}\n`);
    
    // Balance transaction data
    if (data.balance_transaction) {
      const bt = data.balance_transaction;
      const netAmount = (bt.net || 0) / 100;
      const totalFees = (bt.fee || 0) / 100;
      const grossAmount = (bt.amount || 0) / 100;
      
      console.log('💳 Stripe Balance Transaction:\n');
      console.log(`   Balance Transaction ID: ${bt.id}`);
      console.log(`   Gross Amount: $${grossAmount.toFixed(2)}`);
      console.log(`   Total Stripe Fees: $${totalFees.toFixed(2)}`);
      console.log(`   Net Amount (Platform Receives): $${netAmount.toFixed(2)}\n`);
      
      // Fee breakdown
      if (bt.fee_details && bt.fee_details.length > 0) {
        console.log('📋 Fee Details Breakdown:\n');
        bt.fee_details.forEach((fee, index) => {
          const feeAmount = (fee.amount || 0) / 100;
          console.log(`   ${index + 1}. ${fee.type || 'Unknown'}: $${feeAmount.toFixed(2)}`);
          if (fee.description) {
            console.log(`      Description: ${fee.description}`);
          }
        });
        console.log('');
      }
      
      // Calculate effective fees
      const effectiveFeeOnAppFee = applicationFeeGross - netAmount;
      const effectivePercentage = (effectiveFeeOnAppFee / applicationFeeGross) * 100;
      
      console.log('📈 Fee Analysis:\n');
      console.log(`   Application Fee (Gross): $${applicationFeeGross.toFixed(2)}`);
      console.log(`   Stripe Fees (Total): $${totalFees.toFixed(2)}`);
      console.log(`   Net Application Fee: $${netAmount.toFixed(2)}`);
      console.log(`   Effective Fee on App Fee: $${effectiveFeeOnAppFee.toFixed(2)}`);
      console.log(`   Effective Percentage: ${effectivePercentage.toFixed(2)}%\n`);
      
      // Calculate Stripe fee percentage
      const stripeFeePercentage = (totalFees / grossAmount) * 100;
      console.log(`   Stripe Fee Rate: ${stripeFeePercentage.toFixed(2)}% of total transaction\n`);
      
    } else {
      console.log('⚠️  No balance transaction data available\n');
      console.log('💡 Using metadata values:\n');
      console.log(`   Application Fee (Gross): $${applicationFeeGross.toFixed(2)}`);
      console.log(`   Platform Earnings (from metadata): $${platformEarnings.toFixed(2)}`);
      console.log(`   Estimated Stripe Fees: $${(applicationFeeGross - platformEarnings).toFixed(2)}`);
      console.log(`   Effective Percentage: ${(((applicationFeeGross - platformEarnings) / applicationFeeGross) * 100).toFixed(2)}%\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkStripePaymentFees();

