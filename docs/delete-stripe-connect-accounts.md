# Delete All Stripe Connect Accounts

## Status

✅ **Database records cleared** - All Stripe Connect account references have been removed from the database.

⚠️ **Stripe accounts still exist** - The actual Stripe Connect accounts still exist in Stripe and need to be deleted.

## What Was Done

1. ✅ Cleared all `stripe_account_id` fields in the `profiles` table
2. ✅ Reset `stripe_onboarding_completed` to `false`
3. ✅ Reset `stripe_account_status` to `pending`

## Next Steps: Delete from Stripe

You have 3 options to delete the Stripe Connect accounts:

### Option 1: Use Stripe Dashboard (Easiest)

1. Go to [Stripe Connect Accounts](https://dashboard.stripe.com/connect/accounts)
2. Find each account from the list below
3. Click on the account → Settings → Delete account

**Account IDs to delete:**
- `acct_1SOHF0FXNprlvwdp`
- `acct_1SRuVKFJo9TaauxI`
- `acct_1Sg1zhFWXGuG9U5A`
- `acct_1Sg0IkF23F5jXQTq`
- `acct_1SfjypFL9Vv4egls`
- `acct_1SRyIaFHtDFNarjB`
- `acct_1SNoc6FObsQKpnjI`
- `acct_1SOWNGFSQLa4wnhp`
- `acct_1STvljFDjmhJUeqR`
- `acct_1SS2AyFMWgTR662c`
- `acct_1SdgWLF38VKxRo1p`

### Option 2: Use Node.js Script (Automated)

```bash
# Set your Stripe secret key
export STRIPE_SECRET_KEY=sk_live_xxx

# Or add to .env file
echo "STRIPE_SECRET_KEY=sk_live_xxx" >> .env

# Run the script
node scripts/delete-stripe-accounts-direct.js
```

### Option 3: Use Stripe API Directly

```bash
# For each account ID, run:
curl https://api.stripe.com/v1/accounts/{account_id} \
  -u sk_live_xxx: \
  -X DELETE
```

## Impact

After deleting the Stripe accounts:
- ✅ Partners will need to complete Stripe Connect onboarding again
- ✅ All existing Stripe Connect account data will be permanently deleted
- ✅ Partners cannot receive payouts until they reconnect

## Verification

To verify all accounts are deleted:

```sql
-- Should return 0
SELECT COUNT(*) 
FROM profiles 
WHERE role = 'partner' 
  AND stripe_account_id IS NOT NULL;
```

## Files Created

- `scripts/clean-all-stripe-connect-accounts.js` - Full cleanup script (database + Stripe)
- `scripts/delete-stripe-accounts-direct.js` - Direct Stripe deletion script
- `scripts/clean-stripe-connect-accounts-direct.sql` - SQL-only cleanup
- `scripts/delete-stripe-accounts-list.txt` - List of account IDs

