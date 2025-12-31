# ✅ Webhook Setup Complete!

I've created webhook-style triggers that will automatically call your Edge Functions when:
- A listing becomes pending (INSERT or UPDATE)
- A new support ticket is created with status 'open'

## What Was Done

✅ Created trigger functions that call Edge Functions via `pg_net`  
✅ Set up triggers on `listings` and `support_tickets` tables  
✅ Triggers work even when no admin is online  

## One Final Step Required

To enable the webhooks, you need to set your **service role key** in the database:

1. **Get your service role key**:
   - Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/settings/api
   - Copy the **service_role** key (long JWT token)

2. **Set it in the database**:
   - Go to Supabase SQL Editor
   - Run this SQL (replace `YOUR_SERVICE_ROLE_KEY` with your actual key):
   ```sql
   ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
   ```

## How It Works

1. When a listing becomes pending → Trigger fires → Calls Edge Function → Email sent
2. When a new ticket is created → Trigger fires → Calls Edge Function → Email sent
3. Works **even when no admin is online** ✅

## Testing

1. Log out of admin panel
2. Create a pending listing or new ticket
3. Check your email - you should receive it!

## Fallback

If the direct Edge Function call fails (e.g., service role key not set), emails are still queued and will be sent when an admin logs in.

---

**Status**: ✅ Triggers created, waiting for service role key configuration

