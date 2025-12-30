/**
 * Extract net application fee from Stripe payment intents using MCP
 * Since Stripe MCP doesn't expose balance transactions, we'll use metadata
 * and calculate from application_fee_amount
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

// Note: Since Stripe MCP doesn't provide balance transactions,
// we'll need to calculate estimated net application fee
function calculateEstimatedNetApplicationFee(baseAmount, serviceFee, processingFee, commissionAmount) {
  // Application fee gross = service fee + processing fee + commission
  const applicationFeeGross = (serviceFee || 0) + (processingFee || 0) + (commissionAmount || 0);
  
  // If service/processing fees not provided, estimate
  let estimatedServiceFee = serviceFee;
  let estimatedProcessingFee = processingFee;
  
  if (estimatedServiceFee === null || estimatedServiceFee === undefined) {
    estimatedServiceFee = baseAmount * 0.12; // 12%
  }
  
  if (estimatedProcessingFee === null || estimatedProcessingFee === undefined) {
    const totalForProcessingFee = baseAmount + (estimatedServiceFee || 0);
    estimatedProcessingFee = (totalForProcessingFee * 0.0175) + 0.30; // 1.75% + $0.30
  }
  
  const totalApplicationFeeGross = (estimatedServiceFee || 0) + (estimatedProcessingFee || 0) + (commissionAmount || 0);
  const totalTransaction = baseAmount + (estimatedServiceFee || 0) + (estimatedProcessingFee || 0);
  
  // Estimate Stripe fees (~2.9% + $0.30)
  const estimatedStripeFees = totalTransaction > 0 ? (totalTransaction * 0.029) + 0.30 : 0;
  
  // Application fee portion of Stripe fees
  const applicationFeeRatio = totalTransaction > 0 ? totalApplicationFeeGross / totalTransaction : 0;
  const stripeFeesOnApplicationFee = estimatedStripeFees * applicationFeeRatio;
  
  const netApplicationFee = totalApplicationFeeGross - stripeFeesOnApplicationFee;
  
  return Math.max(0, netApplicationFee);
}

async function syncFromStripeMetadata() {
  try {
    console.log('\n🔄 Extracting Net Application Fees from Stripe Payment Intents\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  Note: Stripe MCP doesn\'t provide balance transactions directly.');
    console.log('   Using estimated calculations based on application fee amounts.\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get all bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, base_amount, commission_partner, service_fee, payment_processing_fee, net_application_fee, stripe_payment_intent_id, payment_status')
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

    console.log(`📊 Found ${bookings.length} bookings to process\n`);

    let updatedCount = 0;
    let unchangedCount = 0;

    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      const { 
        id, 
        base_amount, 
        commission_partner, 
        service_fee, 
        payment_processing_fee, 
        net_application_fee: currentNetFee,
        payment_status 
      } = booking;
      
      process.stdout.write(`[${i + 1}/${bookings.length}] ${id.substring(0, 8)}... `);

      // Calculate estimated net application fee
      const estimatedNetFee = calculateEstimatedNetApplicationFee(
        parseFloat(base_amount),
        service_fee ? parseFloat(service_fee) : null,
        payment_processing_fee ? parseFloat(payment_processing_fee) : null,
        parseFloat(commission_partner)
      );

      // Check if update needed
      const currentFee = currentNetFee ? parseFloat(currentNetFee) : null;
      const needsUpdate = !currentFee || Math.abs(currentFee - estimatedNetFee) > 0.5; // Allow 50 cent difference

      if (!needsUpdate) {
        console.log(`✅ OK (${estimatedNetFee.toFixed(2)})`);
        unchangedCount++;
        continue;
      }

      // Update database
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          net_application_fee: estimatedNetFee,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.log(`❌ Failed: ${updateError.message}`);
      } else {
        const change = currentFee ? (estimatedNetFee - currentFee).toFixed(2) : 'NEW';
        console.log(`✅ Updated: $${estimatedNetFee.toFixed(2)} (${change >= 0 ? '+' : ''}$${change})`);
        updatedCount++;
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
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ✅ Unchanged: ${unchangedCount}`);
    console.log(`\n💰 Estimated Total Net Application Fee: $${totalNetApplicationFee.toFixed(2)}`);
    console.log('\n⚠️  These are ESTIMATED values. For accurate values, balance transaction data from Stripe is needed.');
    console.log('\n✅ Sync complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

syncFromStripeMetadata();

