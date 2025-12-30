/**
 * Script to check actual Stripe fees and balance transactions
 * for a booking to verify platform earnings calculation
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

async function checkStripeFees(paymentIntentId) {
  try {
    console.log(`\n🔍 Checking Stripe fees for Payment Intent: ${paymentIntentId}\n`);
    
    // Call the Edge Function to get payment intent details
    const { data: { session } } = await supabase.auth.admin.createUser({
      email: 'temp@example.com',
      password: 'temp123456',
      email_confirm: true
    });
    
    // Alternative: Use service role to call Edge Function
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
      console.error('❌ Failed to fetch payment intent:', response.status, errorText);
      return;
    }

    const data = await response.json();
    
    console.log('📊 Payment Intent Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Payment Intent ID: ${data.id}`);
    console.log(`Status: ${data.status}`);
    console.log(`Total Amount: $${(data.amount / 100).toFixed(2)} (${data.amount} cents)`);
    console.log(`Currency: ${data.currency.toUpperCase()}`);
    console.log(`Application Fee: $${((data.application_fee_amount || 0) / 100).toFixed(2)} (${data.application_fee_amount || 0} cents)`);
    
    if (data.metadata) {
      console.log('\n📝 Metadata:');
      Object.entries(data.metadata).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`);
      });
    }
    
    if (data.charge) {
      console.log('\n💳 Charge Details:');
      console.log(`  Charge ID: ${data.charge.id}`);
      console.log(`  Amount: $${(data.charge.amount / 100).toFixed(2)}`);
      console.log(`  Amount Captured: $${(data.charge.amount_captured / 100).toFixed(2)}`);
      console.log(`  Application Fee: $${((data.charge.application_fee_amount || 0) / 100).toFixed(2)}`);
      console.log(`  Charge Fee: $${((data.charge.fee || 0) / 100).toFixed(2)}`);
      console.log(`  Charge Net: $${((data.charge.net || 0) / 100).toFixed(2)}`);
    }
    
    if (data.balance_transaction) {
      const bt = data.balance_transaction;
      console.log('\n💰 Balance Transaction (What Actually Lands in Platform Account):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`  Balance Transaction ID: ${bt.id}`);
      console.log(`  Gross Amount: $${(bt.amount / 100).toFixed(2)} (${bt.amount} cents)`);
      console.log(`  Stripe Fees: $${(bt.fee / 100).toFixed(2)} (${bt.fee} cents)`);
      console.log(`  NET Amount (Platform Receives): $${(bt.net / 100).toFixed(2)} (${bt.net} cents)`);
      console.log(`  Currency: ${bt.currency.toUpperCase()}`);
      
      if (bt.fee_details && bt.fee_details.length > 0) {
        console.log('\n  Fee Breakdown:');
        bt.fee_details.forEach((fee, index) => {
          console.log(`    ${index + 1}. ${fee.type}: $${(fee.amount / 100).toFixed(2)} (${fee.amount} cents)`);
          if (fee.description) {
            console.log(`       Description: ${fee.description}`);
          }
        });
      }
      
      // Calculate effective fee rate
      if (bt.amount > 0) {
        const feeRate = (bt.fee / bt.amount) * 100;
        console.log(`\n  Effective Stripe Fee Rate: ${feeRate.toFixed(2)}%`);
      }
    }
    
    if (data.transfer_data) {
      console.log('\n🔄 Stripe Connect Transfer:');
      console.log(`  Destination Account: ${data.transfer_data.destination}`);
      if (data.transfer_data.amount) {
        console.log(`  Transfer Amount: $${(data.transfer_data.amount / 100).toFixed(2)}`);
      }
    }
    
    // Extract commission from metadata
    if (data.metadata?.partnerFee) {
      const partnerFeeStr = data.metadata.partnerFee.toString();
      const partnerFee = partnerFeeStr.includes('.') 
        ? parseFloat(partnerFeeStr)
        : parseFloat(partnerFeeStr) / 100;
      
      console.log('\n📈 Commission Analysis:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`  Commission (from metadata): $${partnerFee.toFixed(2)}`);
      
      if (data.balance_transaction) {
        const bt = data.balance_transaction;
        const applicationFee = (data.application_fee_amount || 0) / 100;
        const totalPlatformRevenue = (bt.net / 100);
        
        console.log(`  Application Fee (total platform revenue): $${applicationFee.toFixed(2)}`);
        console.log(`  Net Platform Receives: $${totalPlatformRevenue.toFixed(2)}`);
        console.log(`  Stripe Fees on Total: $${(bt.fee / 100).toFixed(2)}`);
        
        // Estimate commission portion of fees
        if (applicationFee > 0) {
          const commissionPercentOfApplicationFee = (partnerFee / applicationFee) * 100;
          const estimatedStripeFeesOnCommission = (bt.fee / 100) * (commissionPercentOfApplicationFee / 100);
          const estimatedNetCommission = partnerFee - estimatedStripeFeesOnCommission;
          
          console.log(`\n  Commission is ${commissionPercentOfApplicationFee.toFixed(1)}% of application fee`);
          console.log(`  Estimated Stripe Fees on Commission: $${estimatedStripeFeesOnCommission.toFixed(2)}`);
          console.log(`  Estimated Net Commission: $${estimatedNetCommission.toFixed(2)}`);
        }
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error checking Stripe fees:', error);
  }
}

// Get payment intent ID from command line or use a sample
const paymentIntentId = process.argv[2] || 'pi_3SUCPBFKyd3TG8v10G8qt01N';

checkStripeFees(paymentIntentId);

