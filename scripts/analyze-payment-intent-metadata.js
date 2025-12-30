/**
 * Analyze payment intent metadata to determine actual Stripe fees
 */

// Based on payment intent metadata from Stripe
const paymentIntents = [
  {
    id: 'pi_3SXgCSFKyd3TG8v10vY3rA1j',
    metadata: {
      originalAmount: "10000", // $100.00
      serviceFee: "1200", // $12.00
      paymentProcessingFee: "225.99999999999997", // $2.26
      partnerFee: "400", // $4.00
      totalPaid: "11426", // $114.26
      platformEarnings: "1374" // $13.74 (in cents)
    },
    application_fee_amount: 1826 // $18.26
  }
];

console.log('\n📊 Stripe Fees Analysis from Payment Intent Metadata\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

paymentIntents.forEach((pi, index) => {
  const baseAmount = parseInt(pi.metadata.originalAmount) / 100;
  const serviceFee = parseInt(pi.metadata.serviceFee) / 100;
  const processingFee = parseFloat(pi.metadata.paymentProcessingFee) / 100;
  const commission = parseInt(pi.metadata.partnerFee) / 100;
  const totalPaid = parseInt(pi.metadata.totalPaid) / 100;
  const platformEarnings = parseInt(pi.metadata.platformEarnings) / 100;
  const applicationFeeGross = parseInt(pi.application_fee_amount) / 100;
  
  const actualStripeFees = applicationFeeGross - platformEarnings;
  const feePercentageOfTransaction = (actualStripeFees / totalPaid) * 100;
  const feePercentageOfAppFee = (actualStripeFees / applicationFeeGross) * 100;
  
  // Estimated using standard formula
  const estimatedFees = (totalPaid * 0.029) + 0.30;
  const difference = actualStripeFees - estimatedFees;
  
  console.log(`Example ${index + 1}: $${baseAmount} Base Booking\n`);
  console.log(`📋 Transaction Breakdown:`);
  console.log(`   Base Amount: $${baseAmount.toFixed(2)}`);
  console.log(`   Service Fee: $${serviceFee.toFixed(2)}`);
  console.log(`   Processing Fee: $${processingFee.toFixed(2)}`);
  console.log(`   Commission: $${commission.toFixed(2)}`);
  console.log(`   Total Paid: $${totalPaid.toFixed(2)}\n`);
  
  console.log(`💰 Application Fee:`);
  console.log(`   Gross: $${applicationFeeGross.toFixed(2)}`);
  console.log(`   Net (Platform Receives): $${platformEarnings.toFixed(2)}\n`);
  
  console.log(`💳 Stripe Fees:`);
  console.log(`   Actual Fees: $${actualStripeFees.toFixed(2)}`);
  console.log(`   Estimated (2.9% + $0.30): $${estimatedFees.toFixed(2)}`);
  console.log(`   Difference: $${difference.toFixed(2)} (${difference > 0 ? '+' : ''}${((difference / estimatedFees) * 100).toFixed(1)}%)\n`);
  
  console.log(`📈 Fee Percentages:`);
  console.log(`   ${feePercentageOfTransaction.toFixed(2)}% of total transaction`);
  console.log(`   ${feePercentageOfAppFee.toFixed(2)}% of application fee\n`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

