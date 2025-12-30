/**
 * Update net_application_fee for all bookings using the corrected Stripe fee calculation
 * Uses 3.96% fee rate based on actual Stripe payment data
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

/**
 * Calculate estimated net application fee using the corrected Stripe fee rate (3.96%)
 */
function calculateNetApplicationFee(baseAmount, serviceFee, processingFee, commissionAmount) {
  if (!baseAmount || baseAmount <= 0) return 0;
  
  // Use provided fees or estimate
  let estimatedServiceFee = serviceFee;
  let estimatedProcessingFee = processingFee;
  
  if (estimatedServiceFee === null || estimatedServiceFee === undefined) {
    estimatedServiceFee = baseAmount * 0.12; // 12% of base
  }
  
  if (estimatedProcessingFee === null || estimatedProcessingFee === undefined) {
    const totalForProcessingFee = baseAmount + (estimatedServiceFee || 0);
    estimatedProcessingFee = (totalForProcessingFee * 0.0175) + 0.30; // 1.75% + $0.30
  }
  
  // Application fee gross = service fee + processing fee + commission
  const applicationFeeGross = (estimatedServiceFee || 0) + (estimatedProcessingFee || 0) + (commissionAmount || 0);
  
  // Total transaction = base + service fee + processing fee
  const totalTransaction = baseAmount + (estimatedServiceFee || 0) + (estimatedProcessingFee || 0);
  
  // Stripe fees using actual observed rate: 3.96% of total transaction
  const STRIPE_FEE_RATE = 0.0396;
  const stripeFees = totalTransaction * STRIPE_FEE_RATE;
  
  // Net application fee = gross - Stripe fees
  const netApplicationFee = applicationFeeGross - stripeFees;
  
  return Math.max(0, netApplicationFee);
}

async function updateAllBookings() {
  try {
    console.log('\n🔄 Updating Net Application Fees for All Bookings\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Using corrected Stripe fee rate: 3.96% (based on actual Stripe payment data)\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Get all bookings with commission
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, base_amount, service_fee, payment_processing_fee, commission_partner, net_application_fee, payment_status')
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
    let errorCount = 0;
    const updates = [];

    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      const {
        id,
        base_amount,
        service_fee,
        payment_processing_fee,
        commission_partner,
        net_application_fee: currentNetFee
      } = booking;

      process.stdout.write(`[${i + 1}/${bookings.length}] Processing ${id.substring(0, 8)}... `);

      // Calculate new net application fee
      const newNetFee = calculateNetApplicationFee(
        parseFloat(base_amount || 0),
        service_fee ? parseFloat(service_fee) : null,
        payment_processing_fee ? parseFloat(payment_processing_fee) : null,
        parseFloat(commission_partner || 0)
      );

      // Check if update needed
      const currentFee = currentNetFee ? parseFloat(currentNetFee) : null;
      const needsUpdate = !currentFee || Math.abs(currentFee - newNetFee) > 0.01;

      if (!needsUpdate) {
        console.log(`✅ OK (${newNetFee.toFixed(2)})`);
        unchangedCount++;
        continue;
      }

      // Update database
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          net_application_fee: newNetFee,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) {
        console.log(`❌ Failed: ${updateError.message}`);
        errorCount++;
      } else {
        const change = currentFee ? (newNetFee - currentFee).toFixed(2) : 'NEW';
        const changeSymbol = currentFee ? (newNetFee > currentFee ? '+' : '') : '';
        console.log(`✅ Updated: $${newNetFee.toFixed(2)} (${changeSymbol}$${change})`);
        updatedCount++;
        updates.push({
          bookingId: id,
          oldValue: currentFee,
          newValue: newNetFee,
          change: newNetFee - (currentFee || 0)
        });
      }

      // Rate limiting
      if (i < bookings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Calculate new totals
    const { data: summaryData } = await supabase
      .from('bookings')
      .select('net_application_fee, commission_partner')
      .not('net_application_fee', 'is', null)
      .not('commission_partner', 'is', null)
      .gt('commission_partner', 0);

    const totalNetApplicationFee = summaryData?.reduce((sum, b) => sum + parseFloat(b.net_application_fee || 0), 0) || 0;
    const totalCommission = summaryData?.reduce((sum, b) => sum + parseFloat(b.commission_partner || 0), 0) || 0;

    // Show biggest changes
    const biggestChanges = updates
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 5);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Summary:');
    console.log(`   Total bookings: ${bookings.length}`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ✅ Unchanged: ${unchangedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`\n💰 Totals:`);
    console.log(`   Total Commission: $${totalCommission.toFixed(2)}`);
    console.log(`   Total Net Application Fee: $${totalNetApplicationFee.toFixed(2)}`);
    
    if (biggestChanges.length > 0) {
      console.log(`\n📈 Biggest Changes:`);
      biggestChanges.forEach((change, idx) => {
        const symbol = change.change > 0 ? '+' : '';
        console.log(`   ${idx + 1}. Booking ${change.bookingId.substring(0, 8)}...: ${symbol}$${change.change.toFixed(2)} (${change.oldValue ? '$' + change.oldValue.toFixed(2) : 'NULL'} → $${change.newValue.toFixed(2)})`);
      });
    }
    
    console.log('\n✅ Update complete\n');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the update
updateAllBookings();

