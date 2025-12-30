/**
 * Calculate Stripe fee percentages from payment intent metadata
 * Using Stripe MCP data to understand actual fee structure
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

async function calculateStripeFeePercentage() {
  try {
    console.log('\n📊 Calculating Stripe Fee Percentages\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get bookings with payment intent metadata
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, base_amount, service_fee, payment_processing_fee, commission_partner, stripe_payment_intent_id, net_application_fee')
      .not('stripe_payment_intent_id', 'is', null)
      .not('commission_partner', 'is', null)
      .gt('commission_partner', 0)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching bookings:', error);
      return;
    }

    if (!bookings || bookings.length === 0) {
      console.log('✅ No bookings found');
      return;
    }

    console.log(`📋 Analyzing ${bookings.length} bookings...\n`);

    const feeAnalysis = [];

    for (const booking of bookings) {
      const {
        id,
        base_amount,
        service_fee,
        payment_processing_fee,
        commission_partner,
        stripe_payment_intent_id
      } = booking;

      // Calculate application fee gross
      const serviceFee = parseFloat(service_fee || 0);
      const processingFee = parseFloat(payment_processing_fee || 0);
      const commission = parseFloat(commission_partner || 0);
      
      // If fees not in DB, estimate from base amount
      const estimatedServiceFee = serviceFee || parseFloat(base_amount) * 0.12;
      const estimatedProcessingFee = processingFee || ((parseFloat(base_amount) + estimatedServiceFee) * 0.0175) + 0.30;
      
      const applicationFeeGross = estimatedServiceFee + estimatedProcessingFee + commission;
      const totalTransaction = parseFloat(base_amount) + estimatedServiceFee + estimatedProcessingFee;

      feeAnalysis.push({
        bookingId: id.substring(0, 8),
        baseAmount: parseFloat(base_amount),
        applicationFeeGross,
        totalTransaction,
        paymentIntentId: stripe_payment_intent_id
      });
    }

    // Calculate Stripe fee percentages
    console.log('💳 Standard Stripe Fee Structure:\n');
    console.log('   For Australian cards: 2.9% + $0.30 per transaction');
    console.log('   For Stripe Connect: Fees charged on ENTIRE transaction amount\n');

    console.log('📈 Fee Analysis by Transaction Size:\n');
    
    // Group by transaction size
    const smallTransactions = feeAnalysis.filter(b => b.totalTransaction < 50);
    const mediumTransactions = feeAnalysis.filter(b => b.totalTransaction >= 50 && b.totalTransaction < 200);
    const largeTransactions = feeAnalysis.filter(b => b.totalTransaction >= 200);

    function calculateFeePercentage(transactionAmount) {
      const stripeFees = (transactionAmount * 0.029) + 0.30;
      const percentage = (stripeFees / transactionAmount) * 100;
      return { stripeFees, percentage };
    }

    function calculateEffectivePercentage(applicationFeeGross, totalTransaction) {
      const stripeFees = (totalTransaction * 0.029) + 0.30;
      // Calculate what percentage of application fee is lost to Stripe fees
      const feeRatio = stripeFees / totalTransaction;
      const effectiveFeeOnApplicationFee = applicationFeeGross * feeRatio;
      const effectivePercentage = (effectiveFeeOnApplicationFee / applicationFeeGross) * 100;
      return { stripeFees, effectiveFeeOnApplicationFee, effectivePercentage };
    }

    if (smallTransactions.length > 0) {
      const sample = smallTransactions[0];
      const { stripeFees, percentage } = calculateFeePercentage(sample.totalTransaction);
      const { effectiveFeeOnApplicationFee, effectivePercentage } = calculateEffectivePercentage(
        sample.applicationFeeGross,
        sample.totalTransaction
      );
      
      console.log(`   Small Transactions (< $50):`);
      console.log(`     Transaction: $${sample.totalTransaction.toFixed(2)}`);
      console.log(`     Application Fee (Gross): $${sample.applicationFeeGross.toFixed(2)}`);
      console.log(`     Stripe Fees (on transaction): $${stripeFees.toFixed(2)} (${percentage.toFixed(2)}% of transaction)`);
      console.log(`     Effective Fee on Application Fee: $${effectiveFeeOnApplicationFee.toFixed(2)} (${effectivePercentage.toFixed(2)}% of app fee)`);
      console.log(`     Net Application Fee: $${(sample.applicationFeeGross - effectiveFeeOnApplicationFee).toFixed(2)}\n`);
    }

    if (mediumTransactions.length > 0) {
      const sample = mediumTransactions[0];
      const { stripeFees, percentage } = calculateFeePercentage(sample.totalTransaction);
      const { effectiveFeeOnApplicationFee, effectivePercentage } = calculateEffectivePercentage(
        sample.applicationFeeGross,
        sample.totalTransaction
      );
      
      console.log(`   Medium Transactions ($50 - $200):`);
      console.log(`     Transaction: $${sample.totalTransaction.toFixed(2)}`);
      console.log(`     Application Fee (Gross): $${sample.applicationFeeGross.toFixed(2)}`);
      console.log(`     Stripe Fees (on transaction): $${stripeFees.toFixed(2)} (${percentage.toFixed(2)}% of transaction)`);
      console.log(`     Effective Fee on Application Fee: $${effectiveFeeOnApplicationFee.toFixed(2)} (${effectivePercentage.toFixed(2)}% of app fee)`);
      console.log(`     Net Application Fee: $${(sample.applicationFeeGross - effectiveFeeOnApplicationFee).toFixed(2)}\n`);
    }

    // Calculate for a typical $100 booking
    console.log('💰 Example: $100 Base Booking\n');
    const baseAmount = 100;
    const serviceFee = baseAmount * 0.12; // $12.00
    const processingFee = ((baseAmount + serviceFee) * 0.0175) + 0.30; // ~$2.26
    const commission = 4.00; // $4.00
    const applicationFeeGross = serviceFee + processingFee + commission; // $18.26
    const totalTransaction = baseAmount + serviceFee + processingFee; // $114.26
    
    const { stripeFees, percentage } = calculateFeePercentage(totalTransaction);
    const { effectiveFeeOnApplicationFee, effectivePercentage } = calculateEffectivePercentage(
      applicationFeeGross,
      totalTransaction
    );
    
    console.log(`   Base Amount: $${baseAmount.toFixed(2)}`);
    console.log(`   Service Fee: $${serviceFee.toFixed(2)}`);
    console.log(`   Processing Fee: $${processingFee.toFixed(2)}`);
    console.log(`   Commission: $${commission.toFixed(2)}`);
    console.log(`   Application Fee (Gross): $${applicationFeeGross.toFixed(2)}`);
    console.log(`   Total Transaction: $${totalTransaction.toFixed(2)}\n`);
    
    console.log(`   Stripe Fees (on total transaction):`);
    console.log(`     Amount: $${stripeFees.toFixed(2)}`);
    console.log(`     Percentage of Transaction: ${percentage.toFixed(2)}%\n`);
    
    console.log(`   Effective Fee on Application Fee:`);
    console.log(`     Amount: $${effectiveFeeOnApplicationFee.toFixed(2)}`);
    console.log(`     Percentage of Application Fee: ${effectivePercentage.toFixed(2)}%\n`);
    
    console.log(`   Net Application Fee: $${(applicationFeeGross - effectiveFeeOnApplicationFee).toFixed(2)}`);
    console.log(`   (${((applicationFeeGross - effectiveFeeOnApplicationFee) / applicationFeeGross * 100).toFixed(2)}% of gross application fee)\n`);

    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📋 Summary:\n');
    console.log('   Stripe charges: 2.9% + $0.30 on the ENTIRE transaction amount');
    console.log('   For Stripe Connect, fees are deducted from platform balance');
    console.log(`   Effective fee on application fee: ~${effectivePercentage.toFixed(2)}%`);
    console.log('   (This varies based on transaction size and application fee ratio)\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

calculateStripeFeePercentage();

