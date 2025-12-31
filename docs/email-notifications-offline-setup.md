# Email Notifications When Admins Are Offline

## Current Status

**Answer: Currently, emails are NOT sent if no admin is online.**

The email queue processor (`useEmailNotificationQueue`) only runs when an admin is logged into the admin panel. If no one is online, the queue isn't processed and emails aren't sent.

## Solution: Enable Offline Email Notifications

I've updated the database triggers to call Edge Functions directly using `pg_net`, so emails are sent immediately even when no admin is logged in.

### How It Works Now

1. **Database Trigger** fires when:
   - A listing becomes pending
   - A new support ticket is created

2. **Two-Path Approach**:
   - **Primary**: Calls Edge Function directly via `pg_net` (works offline)
   - **Backup**: Queues email in `email_notification_queue` (processed when admin logs in)

3. **Edge Function** sends emails via Resend API to all active admins/support agents

### Setup Required

To enable offline email notifications, you need to configure the service role key:

#### Option 1: Set Database Setting (Recommended for pg_net)

Run this SQL in Supabase SQL Editor:

```sql
-- Get your service role key from: Supabase Dashboard → Project Settings → API → service_role key
ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key-here';
```

**Important**: Replace `'your-service-role-key-here'` with your actual service role key from Supabase Dashboard.

#### Option 2: Use Supabase Database Webhooks (Alternative - More Reliable)

Instead of using `pg_net`, you can use Supabase Database Webhooks which are more reliable:

1. **Go to Supabase Dashboard** → **Database** → **Webhooks**

2. **Create Webhook for Pending Listings**:
   - **Name**: `notify-pending-listing-webhook`
   - **Table**: `listings`
   - **Events**: `INSERT`, `UPDATE`
   - **Filter**: `status = 'pending'`
   - **URL**: `https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/notify-pending-listing`
   - **HTTP Method**: `POST`
   - **HTTP Headers**:
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     apikey: YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
   - **HTTP Request Body**:
     ```json
     {
       "listingId": "{{$json.id}}"
     }
     ```

3. **Create Webhook for New Tickets**:
   - **Name**: `notify-new-ticket-webhook`
   - **Table**: `support_tickets`
   - **Events**: `INSERT`
   - **Filter**: `status = 'open'`
   - **URL**: `https://bwgwoqywmlaevyygkafg.supabase.co/functions/v1/notify-new-ticket`
   - **HTTP Method**: `POST`
   - **HTTP Headers**: (same as above)
   - **HTTP Request Body**:
     ```json
     {
       "ticketId": "{{$json.id}}"
     }
     ```

### Testing

1. **Test with admin offline**:
   - Log out of admin panel
   - Create a pending listing or new support ticket
   - Check email inbox - you should receive the email

2. **Verify in logs**:
   - Check `system_logs` table for Edge Function execution logs
   - Look for entries from `edge/notify-pending-listing` or `edge/notify-new-ticket`

### Fallback Behavior

- If the direct Edge Function call fails (e.g., service role key not set), the email is still queued
- When an admin logs in, the queue processor will send any pending emails
- This ensures emails are never lost, even if the direct call fails

### Troubleshooting

**Emails not sending when offline**:
1. Check if service role key is set: `SELECT current_setting('app.settings.service_role_key', true);`
2. Check Edge Function logs in `system_logs` table
3. Verify `pg_net` extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'pg_net';`
4. Consider using Database Webhooks instead (more reliable)

**Service Role Key Security**:
- Never commit the service role key to version control
- Only set it in the database settings (not in code)
- The key is stored securely in PostgreSQL settings

