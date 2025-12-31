# 🔴 URGENT: Fix Offline Email Notifications

## Problem Identified
**Service role key is NOT set** - This is why emails aren't being sent when admins are offline.

## Quick Fix (2 minutes)

### Step 1: Get Your Service Role Key

1. Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/settings/api
2. Scroll down to find the **service_role** key (it's a long JWT token starting with `eyJ...`)
3. Click the **eye icon** to reveal it, then **copy the entire key**

⚠️ **Security Warning**: This key has full database access. Never share it publicly!

### Step 2: Set It in Database

1. Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/sql/new
2. Paste this SQL and **replace `YOUR_SERVICE_ROLE_KEY`** with the key you copied:

```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

3. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify It's Set

Run this to confirm:
```sql
SELECT current_setting('app.settings.service_role_key', true) IS NOT NULL as key_is_set;
```

Should return `true`.

### Step 4: Test It

1. **Log out** of admin panel completely
2. Create a new pending listing (or have someone else create one)
3. **Check your email** - you should receive it immediately!

## What's Happening Now

- ✅ Triggers are firing (emails are being queued)
- ✅ Edge Functions are deployed
- ❌ **Service role key is missing** - Edge Functions can't be called from database
- ⏳ Emails sit in queue until an admin logs in

## After Fix

- ✅ Emails sent **immediately** when listings/tickets are created
- ✅ Works **even when no admin is online**
- ✅ Queue still works as backup

## Current Pending Notification

There's 1 unprocessed email notification in the queue from `2025-12-31 07:24:21`. After setting the service role key, you can manually process it or wait for the next listing submission.

