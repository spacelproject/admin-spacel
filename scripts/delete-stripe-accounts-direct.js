/**
 * Delete Stripe Connect Accounts Directly
 * 
 * This script deletes Stripe Connect accounts directly using Stripe SDK.
 * Requires STRIPE_SECRET_KEY environment variable.
 * 
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/delete-stripe-accounts-direct.js
 * 
 * Or set in .env file:
 *   STRIPE_SECRET_KEY=sk_live_xxx
 */

import Stripe from 'stripe';
import 'dotenv/config';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ Missing STRIPE_SECRET_KEY environment variable');
  console.error('Set it in .env file or as environment variable');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

// List of account IDs to delete (from the database cleanup)
const accountIds = [
  'acct_1SOHF0FXNprlvwdp',
  'acct_1SRuVKFJo9TaauxI',
  'acct_1Sg1zhFWXGuG9U5A',
  'acct_1Sg0IkF23F5jXQTq',
  'acct_1SfjypFL9Vv4egls',
  'acct_1SRyIaFHtDFNarjB',
  'acct_1SNoc6FObsQKpnjI',
  'acct_1SOWNGFSQLa4wnhp',
  'acct_1STvljFDjmhJUeqR',
  'acct_1SS2AyFMWgTR662c',
  'acct_1SdgWLF38VKxRo1p',
];

async function deleteStripeAccounts() {
  console.log('🗑️  Deleting Stripe Connect accounts...\n');
  console.log(`Found ${accountIds.length} accounts to delete\n`);

  const results = {
    total: accountIds.length,
    deleted: 0,
    errors: 0,
    errorsList: []
  };

  for (const accountId of accountIds) {
    try {
      console.log(`Deleting ${accountId}...`);
      
      // Delete the account
      const deletedAccount = await stripe.accounts.del(accountId);
      
      console.log(`✅ Deleted: ${accountId}`);
      console.log(`   Deleted: ${deletedAccount.deleted}`);
      console.log(`   ID: ${deletedAccount.id}\n`);
      
      results.deleted++;
    } catch (error) {
      console.error(`❌ Error deleting ${accountId}:`, error.message);
      
      // Check if account doesn't exist (already deleted)
      if (error.code === 'resource_missing') {
        console.log(`   ℹ️  Account already deleted or doesn't exist\n`);
        results.deleted++; // Count as success
      } else {
        results.errors++;
        results.errorsList.push({
          accountId,
          error: error.message
        });
        console.log('');
      }
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total accounts: ${results.total}`);
  console.log(`   Successfully deleted: ${results.deleted}`);
  console.log(`   Errors: ${results.errors}`);

  if (results.errorsList.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    results.errorsList.forEach(({ accountId, error }) => {
      console.log(`   - ${accountId}: ${error}`);
    });
  }

  if (results.deleted === results.total) {
    console.log('\n✅ All accounts successfully deleted from Stripe!');
  }
}

// Run the deletion
deleteStripeAccounts()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

