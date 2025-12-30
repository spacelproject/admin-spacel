/**
 * Test the booking calculation flow:
 * - Base booking: $100
 * - Seeker paid: $114.26
 * - Partner gets: $96
 * - Platform gets: $18.26 (gross)
 * - Stripe fees deducted
 * - Platform net amount
 */

function calculateBookingBreakdown(baseAmount, commissionPercent = 0.04) {
  console.log('\n💰 Booking Calculation Breakdown\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Step 1: Calculate fees
  const serviceFee = baseAmount * 0.12; // 12% of base
  const processingFee = ((baseAmount + serviceFee) * 0.0175) + 0.30; // 1.75% + $0.30
  const commission = baseAmount * commissionPercent; // Commission (default 4%)
  
  // Step 2: Calculate totals
  const totalPaid = baseAmount + serviceFee + processingFee; // What seeker pays
  const partnerPayout = baseAmount - commission; // What partner receives
  const applicationFeeGross = serviceFee + processingFee + commission; // Platform revenue (gross)
  
  // Step 3: Calculate Stripe fees
  // Based on actual Stripe payment data: effective rate is ~3.96% of transaction
  // This matches actual Stripe fees better than standard 2.9% + $0.30
  const STRIPE_FEE_RATE = 0.0396; // 3.96% - based on actual payment data
  const stripeFees = totalPaid * STRIPE_FEE_RATE;
  
  // Step 4: Calculate net application fee
  // Platform receives application fee gross, Stripe deducts fees from platform balance
  const netApplicationFee = applicationFeeGross - stripeFees;
  
  // Step 5: Calculate net commission (commission portion of net application fee)
  const commissionRatio = commission / applicationFeeGross;
  const netCommission = netApplicationFee * commissionRatio;
  
  console.log(`📋 Input:`);
  console.log(`   Base Amount: $${baseAmount.toFixed(2)}`);
  console.log(`   Commission Rate: ${(commissionPercent * 100).toFixed(1)}%\n`);
  
  console.log(`💵 Fee Breakdown:`);
  console.log(`   Service Fee (12%): $${serviceFee.toFixed(2)}`);
  console.log(`   Processing Fee (1.75% + $0.30): $${processingFee.toFixed(2)}`);
  console.log(`   Commission: $${commission.toFixed(2)}\n`);
  
  console.log(`💰 Payment Flow:`);
  console.log(`   Seeker Pays: $${totalPaid.toFixed(2)}`);
  console.log(`   Partner Receives: $${partnerPayout.toFixed(2)}`);
  console.log(`   Platform Revenue (Gross): $${applicationFeeGross.toFixed(2)}\n`);
  
  console.log(`💳 Stripe Fees:`);
  console.log(`   Fee on Total Transaction: $${stripeFees.toFixed(2)}`);
  console.log(`   Fee Percentage: ${((stripeFees / totalPaid) * 100).toFixed(2)}%\n`);
  
  console.log(`✅ Platform Net Amount:`);
  console.log(`   Application Fee (Gross): $${applicationFeeGross.toFixed(2)}`);
  console.log(`   Stripe Fees: -$${stripeFees.toFixed(2)}`);
  console.log(`   Net Application Fee: $${netApplicationFee.toFixed(2)}\n`);
  
  console.log(`📊 Commission Breakdown:`);
  console.log(`   Commission (Gross): $${commission.toFixed(2)}`);
  console.log(`   Commission Ratio: ${(commissionRatio * 100).toFixed(2)}% of app fee`);
  console.log(`   Net Commission: $${netCommission.toFixed(2)}\n`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  return {
    baseAmount,
    serviceFee,
    processingFee,
    commission,
    totalPaid,
    partnerPayout,
    applicationFeeGross,
    stripeFees,
    netApplicationFee,
    netCommission
  };
}

// Test with $100 base booking
console.log('Example 1: $100 Base Booking (4% Commission)');
calculateBookingBreakdown(100, 0.04);

console.log('\n\nExample 2: $100 Base Booking (10.8% Commission)');
calculateBookingBreakdown(100, 0.108);

console.log('\n\nExample 3: $50 Base Booking (4% Commission)');
calculateBookingBreakdown(50, 0.04);

