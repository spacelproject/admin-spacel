/**
 * Clean All Stripe Connect Accounts Script
 * 
 * WARNING: This script will DELETE ALL Stripe Connect accounts from Stripe
 * and clear the database records. This is a destructive operation.
 * 
 * Usage:
 *   node scripts/clean-all-stripe-connect-accounts.js
 * 
 * For dry run (preview only):
 *   node scripts/clean-all-stripe-connect-accounts.js --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const dryRun = process.argv.includes('--dry-run');

/**
 * Delete Stripe Connect account via Edge Function
 */
async function deleteStripeAccount(accountId) {
  try {
    // Get admin session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // Try to get service role session
      const functionUrl = `${supabaseUrl}/functions/v1/stripe-api-proxy`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey
        },
        body: JSON.stringify({
          action: 'delete_account',
          account_id: accountId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Stripe API error: ${response.statusText}`);
      }

      return await response.json();
    } else {
      // Use regular session
      const functionUrl = `${supabaseUrl}/functions/v1/stripe-api-proxy`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || session.access_token
        },
        body: JSON.stringify({
          action: 'delete_account',
          account_id: accountId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Stripe API error: ${response.statusText}`);
      }

      return await response.json();
    }
  } catch (error) {
    console.error(`Error deleting Stripe account ${accountId}:`, error);
    throw error;
  }
}

async function cleanAllStripeAccounts() {
  console.log('🧹 Starting Stripe Connect account cleanup...\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No accounts will be deleted\n');
  } else {
    console.log('⚠️  WARNING: This will DELETE ALL Stripe Connect accounts!\n');
  }
  
  try {
    // Get all partners with Stripe Connect accounts
    const { data: partners, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, stripe_account_id, stripe_onboarding_completed, stripe_account_status')
      .eq('role', 'partner')
      .not('stripe_account_id', 'is', null);
    
    if (error) {
      throw error;
    }
    
    if (!partners || partners.length === 0) {
      console.log('✅ No partners with Stripe Connect accounts found.');
      return;
    }
    
    console.log(`📋 Found ${partners.length} partners with Stripe Connect accounts:\n`);
    partners.forEach((partner, index) => {
      console.log(`${index + 1}. ${partner.first_name} ${partner.last_name} (${partner.email})`);
      console.log(`   Account ID: ${partner.stripe_account_id}`);
      console.log(`   Status: ${partner.stripe_account_status}`);
      console.log(`   Onboarding Completed: ${partner.stripe_onboarding_completed}\n`);
    });
    
    if (dryRun) {
      console.log('✅ Dry run complete. No accounts were deleted.');
      console.log('   Run without --dry-run to actually delete the accounts.');
      return;
    }
    
    const results = {
      total: partners.length,
      deleted: 0,
      errors: 0,
      skipped: 0,
      errorsList: []
    };
    
    // Delete each Stripe Connect account
    for (const partner of partners) {
      try {
        console.log(`🗑️  Deleting Stripe account for ${partner.first_name} ${partner.last_name}...`);
        console.log(`   Account ID: ${partner.stripe_account_id}`);
        
        // Delete from Stripe
        await deleteStripeAccount(partner.stripe_account_id);
        console.log(`   ✅ Deleted from Stripe`);
        
        // Clear database fields
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            stripe_account_id: null,
            stripe_onboarding_completed: false,
            stripe_account_status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', partner.id);
        
        if (updateError) {
          console.error(`   ⚠️  Error clearing database: ${updateError.message}`);
          results.errorsList.push({
            partner: `${partner.first_name} ${partner.last_name}`,
            accountId: partner.stripe_account_id,
            error: `Database error: ${updateError.message}`
          });
        } else {
          console.log(`   ✅ Cleared database fields`);
          results.deleted++;
        }
        
        console.log('');
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        results.errors++;
        results.errorsList.push({
          partner: `${partner.first_name} ${partner.last_name}`,
          accountId: partner.stripe_account_id,
          error: error.message
        });
        console.log('');
      }
    }
    
    console.log('\n✅ Cleanup complete!\n');
    console.log('📊 Summary:');
    console.log(`   Total partners: ${results.total}`);
    console.log(`   Successfully deleted: ${results.deleted}`);
    console.log(`   Errors: ${results.errors}`);
    console.log(`   Skipped: ${results.skipped}`);
    
    if (results.errorsList.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      results.errorsList.forEach(({ partner, accountId, error }) => {
        console.log(`   - ${partner} (${accountId}): ${error}`);
      });
    }
    
    // Verify deletion
    console.log('\n🔍 Verifying deletion...');
    const { data: remainingPartners, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, stripe_account_id')
      .eq('role', 'partner')
      .not('stripe_account_id', 'is', null);
    
    if (verifyError) {
      console.error('⚠️  Error verifying:', verifyError.message);
    } else if (remainingPartners && remainingPartners.length > 0) {
      console.log(`⚠️  ${remainingPartners.length} partners still have Stripe accounts:`);
      remainingPartners.forEach(p => {
        console.log(`   - ${p.email}: ${p.stripe_account_id}`);
      });
    } else {
      console.log('✅ All Stripe Connect accounts successfully deleted!');
    }
    
  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanAllStripeAccounts()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

