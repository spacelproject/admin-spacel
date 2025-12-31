# Step-by-Step Guide: Setting Up Database Webhooks for Offline Email Notifications

This guide will help you set up Supabase Database Webhooks so emails are sent even when no admin is online.

## Prerequisites

1. Access to Supabase Dashboard
2. Your service role key (found in Project Settings → API)

## Step 1: Get Your Service Role Key

1. Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg
2. Click **Project Settings** (gear icon in left sidebar)
3. Click **API** in the settings menu
4. Find the **service_role** key (it's a long JWT token starting with `eyJ...`)
5. **Copy this key** - you'll need it for the webhook headers

⚠️ **Security Note**: The service_role key has full database access. Keep it secret!

## Step 2: Create Webhook for Pending Listings

1. In Supabase Dashboard, go to **Database** → **Webhooks** (in the left sidebar)
2. Click **"New Webhook"** or **"Create Webhook"**
3. Fill in the following:

   **Basic Settings:**
   - **Name**: `notify-pending-listing-webhook`
   - **Table**: Select `listings` from dropdown
   - **Events**: Check `INSERT` and `UPDATE`
   
   **Filter (Optional but Recommended):**
   - Click **"Add Filter"**
   - **Column**: `status`
   - **Operator**: `=`
   - **Value**: `pending`
   - This ensures the webhook only fires when status is 'pending'

   **HTTP Request:**
   - **URL**: `https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/notify-pending-listing`
   - **HTTP Method**: `POST`
   
   **HTTP Headers** (click "Add Header" for each):
   - Header 1:
     - **Name**: `Authorization`
     - **Value**: `Bearer YOUR_SERVICE_ROLE_KEY` (replace with your actual key)
   - Header 2:
     - **Name**: `apikey`
     - **Value**: `YOUR_SERVICE_ROLE_KEY` (same key as above)
   - Header 3:
     - **Name**: `Content-Type`
     - **Value**: `application/json`

   **HTTP Request Body:**
   ```json
   {
     "listingId": "{{$json.id}}"
   }
   ```
   (The `{{$json.id}}` is a template variable that will be replaced with the actual listing ID)

4. Click **"Save"** or **"Create Webhook"**

## Step 3: Create Webhook for New Support Tickets

1. Click **"New Webhook"** again
2. Fill in:

   **Basic Settings:**
   - **Name**: `notify-new-ticket-webhook`
   - **Table**: Select `support_tickets` from dropdown
   - **Events**: Check `INSERT` only
   
   **Filter:**
   - Click **"Add Filter"**
   - **Column**: `status`
   - **Operator**: `=`
   - **Value**: `open`
   - This ensures the webhook only fires for open tickets

   **HTTP Request:**
   - **URL**: `https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/notify-new-ticket`
   - **HTTP Method**: `POST`
   
   **HTTP Headers** (same as above):
   - `Authorization`: `Bearer YOUR_SERVICE_ROLE_KEY`
   - `apikey`: `YOUR_SERVICE_ROLE_KEY`
   - `Content-Type`: `application/json`

   **HTTP Request Body:**
   ```json
   {
     "ticketId": "{{$json.id}}"
   }
   ```

3. Click **"Save"** or **"Create Webhook"**

## Step 4: Test the Setup

1. **Test Pending Listing Email:**
   - Log out of the admin panel (or use incognito mode)
   - Create a new listing with status "pending" (or update an existing one to pending)
   - Check your email inbox - you should receive an email notification
   - Check Supabase Dashboard → **Edge Functions** → **Logs** to see if the function was called

2. **Test New Ticket Email:**
   - Create a new support ticket with status "open"
   - Check your email inbox
   - Verify in Edge Function logs

## Verification

To verify webhooks are working:

1. **Check Webhook Logs:**
   - In Supabase Dashboard → **Database** → **Webhooks**
   - Click on each webhook to see execution history
   - You should see successful requests (status 200)

2. **Check Edge Function Logs:**
   - Go to **Edge Functions** → Select function → **Logs**
   - Look for entries showing successful email sends

3. **Check System Logs:**
   ```sql
   SELECT * FROM system_logs 
   WHERE source LIKE '%notify%' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

## Troubleshooting

**Webhook not firing:**
- Check the filter conditions match your data
- Verify the table name is correct
- Check webhook is enabled (not paused)

**Edge Function returns 401/403:**
- Verify service role key is correct in headers
- Check both `Authorization` and `apikey` headers are set

**Edge Function returns 500:**
- Check Edge Function logs for error details
- Verify `RESEND_API_KEY` is set in Edge Function secrets
- Check `ADMIN_PANEL_URL` is set if you customized it

**Emails not received:**
- Check spam folder
- Verify admin/support user emails are correct in `admin_users` table
- Check Resend dashboard for email delivery status

## Alternative: Using pg_net (If Webhooks Don't Work)

If Database Webhooks aren't available or don't work, you can use the `pg_net` approach:

1. Set the service role key in database:
   ```sql
   ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
   ```

2. The database triggers will automatically use `pg_net` to call Edge Functions

## Next Steps

Once webhooks are set up:
- Emails will be sent immediately when listings/tickets are created
- No admin needs to be online for emails to be sent
- The queue system still works as a backup

