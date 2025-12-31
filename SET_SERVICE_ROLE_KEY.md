# Set Service Role Key - Step by Step

## Option 1: Set via Supabase Dashboard (Recommended)

1. **Go to Supabase SQL Editor**:
   - https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/sql/new

2. **Paste this SQL**:
   ```sql
   ALTER DATABASE postgres SET app.settings.service_role_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3Z3dvcXl3bWxhZXZ5eWdrYWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYxMTM1MywiZXhwIjoyMDc0MTg3MzUzfQ.WfcRmA6xBvgvKbsdtGV99DMVSUQ5-dKkNIh3PzJEJd8';
   ```

3. **Click "Run"** (or press Ctrl+Enter)

4. **Verify it's set**:
   ```sql
   SELECT current_setting('app.settings.service_role_key', true) IS NOT NULL as key_is_set;
   ```
   Should return `true`.

## Option 2: Use Database Webhooks (Alternative - More Reliable)

If setting the database parameter doesn't work, use Supabase Database Webhooks instead. This is actually more reliable!

### Create Webhook for Pending Listings:

1. Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/database/webhooks
2. Click **"New Webhook"**
3. Fill in:
   - **Name**: `notify-pending-listing`
   - **Table**: `listings`
   - **Events**: `INSERT`, `UPDATE`
   - **Filter**: `status = 'pending'`
   - **URL**: `https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/notify-pending-listing`
   - **Method**: `POST`
   - **Headers**:
     - `Authorization`: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3Z3dvcXl3bWxhZXZ5eWdrYWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYxMTM1MywiZXhwIjoyMDc0MTg3MzUzfQ.WfcRmA6xBvgvKbsdtGV99DMVSUQ5-dKkNIh3PzJEJd8`
     - `apikey`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3Z3dvcXl3bWxhZXZ5eWdrYWZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODYxMTM1MywiZXhwIjoyMDc0MTg3MzUzfQ.WfcRmA6xBvgvKbsdtGV99DMVSUQ5-dKkNIh3PzJEJd8`
     - `Content-Type`: `application/json`
   - **Body**: `{"listingId": "{{$json.id}}"}`
4. Click **"Save"**

### Create Webhook for New Tickets:

1. Click **"New Webhook"** again
2. Fill in:
   - **Name**: `notify-new-ticket`
   - **Table**: `support_tickets`
   - **Events**: `INSERT`
   - **Filter**: `status = 'open'`
   - **URL**: `https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/notify-new-ticket`
   - **Method**: `POST`
   - **Headers**: (same as above)
   - **Body**: `{"ticketId": "{{$json.id}}"}`
3. Click **"Save"**

## After Setup

1. **Test it**: Log out, create a pending listing, check your email
2. **Check logs**: Go to Edge Functions → Logs to see if emails are being sent


