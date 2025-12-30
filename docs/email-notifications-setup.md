# Email Notifications Setup Guide

This guide explains how to set up email notifications for pending listings and new support tickets.

## Overview

The email notification system sends emails to all admins and support agents when:
- A listing status becomes "pending" (new listing or resubmission)
- A new support ticket is created

## Architecture

1. **Database Triggers**: Automatically create notifications in `admin_activity_notifications` table
2. **Edge Functions**: Handle sending emails via Resend API
3. **Application Code**: Processes notifications and triggers email sending

## Setup Steps

### 1. Deploy Edge Functions

Deploy the Edge Functions to Supabase:

```bash
# Deploy notify-pending-listing function
supabase functions deploy notify-pending-listing

# Deploy notify-new-ticket function
supabase functions deploy notify-new-ticket
```

### 2. Set Required Secrets

In Supabase Dashboard → Project Settings → Edge Functions → Secrets, set:

- `RESEND_API_KEY`: Your Resend API key for sending emails
- `SUPABASE_URL`: Your Supabase project URL (usually auto-set)
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (usually auto-set)
- `APP_LOGO_URL` (optional): URL to your app logo for email templates

### 3. Run Database Migration

Run the migration to create the email notification queue table and update trigger functions:

```sql
-- Run the migration file
-- supabase/migrations/add_email_notifications_for_listings_and_tickets.sql
```

This migration:
- Creates `email_notification_queue` table
- Updates trigger functions to queue email notifications
- Maintains backward compatibility with existing notifications

### 4. Enable Real-time for Email Queue (Optional)

If you want real-time processing of the queue:

```sql
-- Enable real-time replication for email_notification_queue
ALTER PUBLICATION supabase_realtime ADD TABLE email_notification_queue;
```

### 5. Initialize Queue Processing Hook

The `useEmailNotificationQueue` hook processes the queue automatically. Make sure it's initialized in your app (it will process automatically when an admin is logged in).

Alternatively, you can process the queue manually:

```javascript
import EmailNotificationService from './services/emailNotificationService';

// Process queued notifications
await EmailNotificationService.processNotificationQueue();
```

## How It Works

### Flow for Pending Listings

1. A listing is created/updated with `status = 'pending'`
2. Database trigger `notify_admins_on_listing_pending()` fires
3. Creates notification in `admin_activity_notifications` table
4. Queues email notification in `email_notification_queue` table
5. Application code detects new notification via real-time
6. Calls `notify-pending-listing` Edge Function
7. Edge Function fetches all admin/support emails and sends via Resend

### Flow for New Support Tickets

1. A support ticket is created with `status = 'open'`
2. Database trigger `notify_admins_on_ticket_created()` fires
3. Creates notification in `admin_activity_notifications` table
4. Queues email notification in `email_notification_queue` table
5. Application code detects new notification via real-time
6. Calls `notify-new-ticket` Edge Function
7. Edge Function fetches all admin/support emails and sends via Resend

## Email Recipients

Emails are sent to all active users in the `admin_users` table with roles:
- `admin`
- `super_admin`
- `support`

Only users with `is_active = true` receive emails.

## Email Templates

Both Edge Functions use HTML email templates with:
- Company branding (logo)
- Clear subject lines with priority indicators
- Detailed information about the listing/ticket
- Direct links to review/respond in the admin panel

## Testing

### Test Pending Listing Notification

1. Create a new listing with `status = 'pending'`
2. Or update an existing listing to `status = 'pending'`
3. Check that:
   - Notification appears in admin panel
   - Email is sent to all admins/support agents
   - Email contains correct listing information

### Test New Ticket Notification

1. Create a new support ticket with `status = 'open'`
2. Check that:
   - Notification appears in admin panel
   - Email is sent to all admins/support agents
   - Email contains correct ticket information and priority badge

### Manual Testing

You can also test the Edge Functions directly:

```javascript
// Test pending listing notification
const { data, error } = await supabase.functions.invoke('notify-pending-listing', {
  body: { listingId: 'your-listing-id' }
});

// Test new ticket notification
const { data, error } = await supabase.functions.invoke('notify-new-ticket', {
  body: { ticketId: 'your-ticket-id' }
});
```

## Troubleshooting

### Emails Not Sending

1. **Check Edge Function Logs**: Supabase Dashboard → Edge Functions → Logs
2. **Verify Resend API Key**: Ensure `RESEND_API_KEY` secret is set correctly
3. **Check Recipients**: Verify there are active admin/support users in `admin_users` table
4. **Check Queue**: Query `email_notification_queue` table to see if items are queued
5. **Check System Logs**: Edge Functions log to `system_logs` table

### Queue Not Processing

1. Ensure `useEmailNotificationQueue` hook is mounted (it's automatic for admins)
2. Check real-time subscription is working
3. Manually process queue: `EmailNotificationService.processNotificationQueue()`

### Edge Function Errors

Common errors:
- `Missing RESEND_API_KEY`: Set the secret in Supabase Dashboard
- `No admin or support users found`: Create admin users in `admin_users` table
- `Listing not found` / `Ticket not found`: Ensure the ID exists in the database

## Alternative: Database Webhooks

Instead of using the queue table, you can use Supabase Database Webhooks:

1. Go to Database → Webhooks in Supabase Dashboard
2. Create webhook for `listings` table:
   - Trigger: INSERT/UPDATE when `status = 'pending'`
   - URL: `https://your-project.supabase.co/functions/v1/notify-pending-listing`
   - HTTP Method: POST
   - Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`, `apikey: YOUR_SERVICE_ROLE_KEY`
   - Body: `{"listingId": "{{$json.id}}"}`

3. Create webhook for `support_tickets` table:
   - Trigger: INSERT when `status = 'open'`
   - URL: `https://your-project.supabase.co/functions/v1/notify-new-ticket`
   - HTTP Method: POST
   - Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`, `apikey: YOUR_SERVICE_ROLE_KEY`
   - Body: `{"ticketId": "{{$json.id}}"}`

This approach bypasses the queue table and calls Edge Functions directly from triggers.

## Monitoring

Monitor email notification success:
- Check `system_logs` table for Edge Function logs
- Check `email_notification_queue` for processed/unprocessed items
- Monitor Resend dashboard for email delivery status

## Future Enhancements

Potential improvements:
- Email templates customization in admin panel
- User preferences for email notifications
- Retry logic for failed email sends
- Email digest (daily summary of notifications)
- Different email templates for different notification types

