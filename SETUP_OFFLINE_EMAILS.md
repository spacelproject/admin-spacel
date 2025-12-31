# Quick Setup: Offline Email Notifications

## Choose Your Method

### ✅ Method 1: Database Webhooks (Recommended - 5 minutes)

**Why**: More reliable, easier to manage, works 100% of the time

**Steps**:

1. **Get Service Role Key**:
   - Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/settings/api
   - Copy the **service_role** key (long JWT token)

2. **Create Webhook 1 - Pending Listings**:
   - Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/database/webhooks
   - Click **"New Webhook"**
   - **Name**: `notify-pending-listing`
   - **Table**: `listings`
   - **Events**: `INSERT`, `UPDATE`
   - **Filter**: `status = 'pending'`
   - **URL**: `https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/notify-pending-listing`
   - **Method**: `POST`
   - **Headers**:
     - `Authorization`: `Bearer YOUR_SERVICE_ROLE_KEY`
     - `apikey`: `YOUR_SERVICE_ROLE_KEY`
     - `Content-Type`: `application/json`
   - **Body**: `{"listingId": "{{$json.id}}"}`
   - Click **Save**

3. **Create Webhook 2 - New Tickets**:
   - Click **"New Webhook"** again
   - **Name**: `notify-new-ticket`
   - **Table**: `support_tickets`
   - **Events**: `INSERT`
   - **Filter**: `status = 'open'`
   - **URL**: `https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/notify-new-ticket`
   - **Method**: `POST`
   - **Headers**: (same as above)
   - **Body**: `{"ticketId": "{{$json.id}}"}`
   - Click **Save**

**Done!** Emails will now send even when admins are offline.

---

### 🔧 Method 2: pg_net (Alternative - Requires SQL)

**Why**: Works if webhooks aren't available, but requires service role key setup

**Steps**:

1. **Get Service Role Key** (same as above)

2. **Set it in Database**:
   - Go to Supabase SQL Editor
   - Run:
   ```sql
   ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY_HERE';
   ```
   (Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual key)

**Done!** The database triggers will automatically call Edge Functions.

---

## Test It

1. Log out of admin panel
2. Create a pending listing or new ticket
3. Check your email - you should receive it!

## Need Help?

See detailed guides:
- `docs/setup-database-webhooks-guide.md` - Full webhook setup guide
- `docs/email-notifications-offline-setup.md` - Technical details

