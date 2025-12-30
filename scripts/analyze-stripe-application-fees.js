/**
 * Analyze Stripe payment intents to count bookings with application fees
 */

const paymentIntents = [
  {"id":"pi_3SbynXFKyd3TG8v11Bqviu9w","application_fee_amount":1826},
  {"id":"pi_3SYrf9FKyd3TG8v11NHqB5NM","application_fee_amount":2335},
  {"id":"pi_3SXyF5FKyd3TG8v10JKXc1Vh","application_fee_amount":1826},
  {"id":"pi_3SXo6dFKyd3TG8v11qEQLfev","application_fee_amount":1826},
  {"id":"pi_3SXidRFKyd3TG8v10NOeIyNS","application_fee_amount":1826},
  {"id":"pi_3SXgCSFKyd3TG8v10vY3rA1j","application_fee_amount":1826},
  {"id":"pi_3SXgByFKyd3TG8v11N9nGq6H","application_fee_amount":1826},
  {"id":"pi_3SXKoWFKyd3TG8v10P5w0slS","application_fee_amount":1826},
  {"id":"pi_3SXFltFKyd3TG8v10hrHmdge","application_fee_amount":1826},
  {"id":"pi_3SXCsxFKyd3TG8v11E5kmzZN","application_fee_amount":1826},
  {"id":"pi_3SXCroFKyd3TG8v11YmaE4Yd","application_fee_amount":1826},
  {"id":"pi_3SUOorFKyd3TG8v11Q6eiAx1","application_fee_amount":1826},
  {"id":"pi_3SUIUKFKyd3TG8v11qGaa93m","application_fee_amount":1826},
  {"id":"pi_3SUCPBFKyd3TG8v10G8qt01N","application_fee_amount":1826},
  {"id":"pi_3SUAzGFKyd3TG8v113EKwszJ","application_fee_amount":1826},
  {"id":"pi_3SU6XrFKyd3TG8v1164dhwJc","application_fee_amount":1826},
  {"id":"pi_3SU6XMFKyd3TG8v11JXuqcxa","application_fee_amount":1826},
  {"id":"pi_3SU6TpFKyd3TG8v11LUrr0qQ","application_fee_amount":1826},
  {"id":"pi_3STvyUFKyd3TG8v10OgrfYpU","application_fee_amount":1826},
  {"id":"pi_3STvfoFKyd3TG8v10NOHQ0bP","application_fee_amount":1826},
  {"id":"pi_3STvK8FKyd3TG8v1130cirGe","application_fee_amount":1826},
  {"id":"pi_3STv8uFKyd3TG8v11E0N9jBs","application_fee_amount":1826},
  {"id":"pi_3STv6CFKyd3TG8v10LJh7cCC","application_fee_amount":1826},
  {"id":"pi_3SToqmFKyd3TG8v11NwnAZYT","application_fee_amount":1826},
  {"id":"pi_3STojXFKyd3TG8v11ujXZPOf","application_fee_amount":1826},
  {"id":"pi_3SToL6FKyd3TG8v11ge5L2B6","application_fee_amount":1826},
  {"id":"pi_3STo63FKyd3TG8v10URXMYND","application_fee_amount":1826},
  {"id":"pi_3STo3IFKyd3TG8v11ACZ0TmI","application_fee_amount":1826},
  {"id":"pi_3STnrqFKyd3TG8v10CF83868","application_fee_amount":1826},
  {"id":"pi_3STnpbFKyd3TG8v11zBMvQ95","application_fee_amount":1826},
  {"id":"pi_3STnpLFKyd3TG8v10mNtYACn","application_fee_amount":1826},
  {"id":"pi_3STnjiFKyd3TG8v10DJcCrXH","application_fee_amount":1826},
  {"id":"pi_3STmjEFKyd3TG8v11SzoIKQW","application_fee_amount":1826},
  {"id":"pi_3STQdqFKyd3TG8v10YJCA32l","application_fee_amount":1826},
  {"id":"pi_3ST4Q2FKyd3TG8v11qZ2Q4dF","application_fee_amount":17990},
  {"id":"pi_3ST0eyFKyd3TG8v10KgF80lQ","application_fee_amount":1826},
  {"id":"pi_3SS2kBFKyd3TG8v10VV7wgQm","application_fee_amount":1826},
  {"id":"pi_3SRbUgFKyd3TG8v11xq01dEF","application_fee_amount":1826},
  {"id":"pi_3SRbOFFKyd3TG8v11U518V4u","application_fee_amount":1826},
  {"id":"pi_3SRbDiFKyd3TG8v11wqNrFVP","application_fee_amount":1826},
  {"id":"pi_3SRb5EFKyd3TG8v11E8Dyem6","application_fee_amount":1826},
  {"id":"pi_3SRaRgFKyd3TG8v10re0p9lN","application_fee_amount":1826},
  {"id":"pi_3SRaK5FKyd3TG8v11MjXRZqi","application_fee_amount":1826},
  {"id":"pi_3SRYJCFKyd3TG8v11h8WV0Ux","application_fee_amount":1826},
  {"id":"pi_3SRYDwFKyd3TG8v10TawZmBt","application_fee_amount":1826},
  {"id":"pi_3SQTVwFKyd3TG8v11EYefwEV","application_fee_amount":1826},
  {"id":"pi_3SQMA7FKyd3TG8v11AI8suhf","application_fee_amount":2239},
  {"id":"pi_3SQM2wFKyd3TG8v11Y5KA0ju","application_fee_amount":1826},
  {"id":"pi_3SQLtPFKyd3TG8v10h3ZUXzk","application_fee_amount":1826},
  {"id":"pi_3SPScbFKyd3TG8v10UDEtJV6","application_fee_amount":1826}
];

// Count payment intents with application fees
const withApplicationFees = paymentIntents.filter(pi => pi.application_fee_amount && pi.application_fee_amount > 0);
const withoutApplicationFees = paymentIntents.filter(pi => !pi.application_fee_amount || pi.application_fee_amount === 0);

console.log('📊 Stripe Payment Intent Analysis:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Total Payment Intents: ${paymentIntents.length}`);
console.log(`With Application Fees: ${withApplicationFees.length} (${(withApplicationFees.length / paymentIntents.length * 100).toFixed(1)}%)`);
console.log(`Without Application Fees: ${withoutApplicationFees.length}`);
console.log('');

// Calculate total application fees
const totalApplicationFees = withApplicationFees.reduce((sum, pi) => sum + (pi.application_fee_amount / 100), 0);
console.log(`Total Application Fees (Gross): $${totalApplicationFees.toFixed(2)}`);
console.log('');

// Group by application fee amount
const feeGroups = {};
withApplicationFees.forEach(pi => {
  const amount = pi.application_fee_amount;
  feeGroups[amount] = (feeGroups[amount] || 0) + 1;
});

console.log('Application Fee Distribution:');
Object.entries(feeGroups)
  .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
  .forEach(([amount, count]) => {
    console.log(`  $${(amount / 100).toFixed(2)}: ${count} bookings`);
  });

