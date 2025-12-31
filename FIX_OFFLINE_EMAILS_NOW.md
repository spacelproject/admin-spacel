# 🔴 URGENT: Fix Offline Email Notifications

## Problem
Emails are NOT being sent when admins are offline because the **service role key is not set** in the database.

## Quick Fix (2 minutes)

### Step 1: Get Your Service Role Key

1. Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/settings/api
2. Find the **service_role** key (it's a long JWT token starting with `eyJ...`)
3. **Copy this key** - you'll need it in the next step

⚠️ **Security**: This key has full database access. Keep it secret!

### Step 2: Set It in Database

1. Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/sql/new
2. Run this SQL (replace `YOUR_SERVICE_ROLE_KEY` with the key you copied):

```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

3. Click **Run**

### Step 3: Test It

1. Log out of admin panel
2. Create a new pending listing (or resubmit an existing one)
3. Check your email - you should receive it immediately!

## Current Status

✅ Triggers are set up  
✅ Edge Functions are deployed  
✅ pg_net extension is enabled  
❌ **Service role key is NOT set** ← This is the problem!

## What Happens After Fix

- Emails will be sent **immediately** when listings/tickets are created
- Works **even when no admin is online**
- Queue will still work as backup if Edge Function call fails

## Alternative: Use Database Webhooks

If setting the service role key doesn't work, you can use Supabase Database Webhooks instead. See `docs/setup-database-webhooks-guide.md` for instructions.

