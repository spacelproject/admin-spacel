# 🎯 Database Webhooks Setup Guide

This guide will help you set up Supabase Database Webhooks for reliable email notifications that work even when no admin is online.

## ✅ What's Already Done

- ✅ Edge Functions updated to handle webhook payloads
- ✅ Edge Functions deployed with `verify_jwt: false` (required for webhooks)
- ✅ Service role key available in database

## 📋 Step-by-Step Setup

### Step 1: Choose Webhook Type

When creating a webhook, you'll see two options:
- **HTTP Request** - Manual configuration (more complex)
- **Supabase Edge Functions** - Automatic configuration (recommended) ✅

**Select "Supabase Edge Functions"** - This automatically:
- Handles authentication with your service role key
- Formats the payload correctly
- Sets up headers automatically

You don't need to manually configure headers or URLs when using this option!

---

### Step 2: Create Webhook for Pending Listings

1. **Go to Database Webhooks:**
   - Navigate to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/database/webhooks
   - Or: Dashboard → **Database** → **Webhooks** (in left sidebar)

2. **Click "New Webhook"** or **"Create Webhook"**

3. **Fill in the webhook configuration:**

   **Basic Settings:**
   - **Name**: `notify-pending-listing-webhook`
   - **Table**: Select `listings` from dropdown
   - **Events**: Check ✅ `INSERT` and ✅ `UPDATE`
   
   **Filter (Important!):**
   - Click **"Add Filter"**
   - **Column**: `status`
   - **Operator**: `=`
   - **Value**: `pending`
   - This ensures the webhook only fires when status is 'pending'
   
   **Type of webhook:**
   - Select **"Supabase Edge Functions"** (NOT "HTTP Request")
   - This automatically handles authentication and payload format
   
   **Edge Function Configuration:**
   - **Edge Function**: Select `notify-pending-listing` from dropdown
   - **HTTP Method**: `POST` (default)
   - **Timeout**: `5000` (5 seconds) or `10000` (10 seconds)
     - ⚠️ **Important**: Don't use 1000ms (1 second) - it's too short!
     - Email sending can take 2-5 seconds, so use at least 5000ms
     - 10000ms (10 seconds) is the safest option
   
   **HTTP Headers:**
   - Click **"Add new header"** → **"Add auth header with service key"**
   - This automatically adds the `Authorization` and `apikey` headers with your service role key
   - Keep `Content-Type: application/json` (should be there by default)

4. **Click "Save"** or **"Create Webhook"**

---

### Step 3: Create Webhook for New Support Tickets

1. **Click "New Webhook"** again

2. **Fill in the webhook configuration:**

   **Basic Settings:**
   - **Name**: `notify-new-ticket-webhook`
   - **Table**: Select `support_tickets` from dropdown
   - **Events**: Check ✅ `INSERT` only
   
   **Filter (Important!):**
   - Click **"Add Filter"**
   - **Column**: `status`
   - **Operator**: `=`
   - **Value**: `open`
   - This ensures the webhook only fires for open tickets
   
   **Type of webhook:**
   - Select **"Supabase Edge Functions"** (NOT "HTTP Request")
   - This automatically handles authentication and payload format
   
   **Edge Function Configuration:**
   - **Edge Function**: Select `notify-new-ticket` from dropdown
   - **HTTP Method**: `POST` (default)
   - **Timeout**: `5000` (5 seconds) or `10000` (10 seconds)
     - ⚠️ **Important**: Don't use 1000ms (1 second) - it's too short!
     - Email sending can take 2-5 seconds, so use at least 5000ms
     - 10000ms (10 seconds) is the safest option
   
   **HTTP Headers:**
   - Click **"Add new header"** → **"Add auth header with service key"**
   - This automatically adds the `Authorization` and `apikey` headers with your service role key
   - Keep `Content-Type: application/json` (should be there by default)

3. **Click "Save"** or **"Create Webhook"**

---

### Step 4: Create Webhook for Ticket Assignment (Support Agents)

1. **Click "New Webhook"** again

2. **Fill in the webhook configuration:**

   **Basic Settings:**
   - **Name**: `notify-ticket-assignment`
   - **Table**: Select `support_tickets` from dropdown
   - **Events**: Check ✅ `UPDATE` only
   
   **Filter (Important!):**
   - Click **"Add Filter"**
   - **Column**: `assigned_to`
   - **Operator**: `IS NOT NULL`
   - This ensures the webhook only fires when a ticket is assigned
   - **Note**: The Edge Function will further filter to only notify when assignment changes
   
   **Type of webhook:**
   - Select **"Supabase Edge Functions"** (NOT "HTTP Request")
   
   **Edge Function Configuration:**
   - **Edge Function**: Select `notify-ticket-assignment` from dropdown
   - **HTTP Method**: `POST` (default)
   - **Timeout**: `5000` (5 seconds) or `10000` (10 seconds)
   
   **HTTP Headers:**
   - Click **"Add new header"** → **"Add auth header with service key"**

3. **Click "Save"** or **"Create Webhook"**

---

### Step 5: Create Webhook for Ticket Activity - Customer Messages

1. **Click "New Webhook"** again

2. **Fill in the webhook configuration:**

   **Basic Settings:**
   - **Name**: `notify-ticket-activity-replies`
   - **Table**: Select `support_ticket_replies` from dropdown
   - **Events**: Check ✅ `INSERT` only
   
   **Filter:**
   - (No filter needed - all new messages will be checked)
   
   **Type of webhook:**
   - Select **"Supabase Edge Functions"** (NOT "HTTP Request")
   
   **Edge Function Configuration:**
   - **Edge Function**: Select `notify-ticket-activity` from dropdown
   - **HTTP Method**: `POST` (default)
   - **Timeout**: `5000` (5 seconds) or `10000` (10 seconds)
   
   **HTTP Headers:**
   - Click **"Add new header"** → **"Add auth header with service key"**

3. **Click "Save"** or **"Create Webhook"**

---

### Step 6: Create Webhook for Ticket Activity - Priority Changes

1. **Click "New Webhook"** again

2. **Fill in the webhook configuration:**

   **Basic Settings:**
   - **Name**: `notify-ticket-activity-priority`
   - **Table**: Select `support_tickets` from dropdown
   - **Events**: Check ✅ `UPDATE` only
   
   **Filter (Important!):**
   - Click **"Add Filter"**
   - **Column**: `assigned_to`
   - **Operator**: `IS NOT NULL`
   - This ensures we only notify for assigned tickets
   - **Note**: The Edge Function will detect if priority actually changed
   
   **Type of webhook:**
   - Select **"Supabase Edge Functions"** (NOT "HTTP Request")
   
   **Edge Function Configuration:**
   - **Edge Function**: Select `notify-ticket-activity` from dropdown
   - **HTTP Method**: `POST` (default)
   - **Timeout**: `5000` (5 seconds) or `10000` (10 seconds)
   
   **HTTP Headers:**
   - Click **"Add new header"** → **"Add auth header with service key"**

3. **Click "Save"** or **"Create Webhook"**

---

### Step 7: Create Webhook for Customer Reply Notifications

1. **Click "New Webhook"** again

2. **Fill in the webhook configuration:**

   **Basic Settings:**
   - **Name**: `notify-customer-reply`
   - **Table**: Select `support_ticket_replies` from dropdown
   - **Events**: Check ✅ `INSERT` only
   
   **Filter (Important!):**
   - Click **"Add Filter"**
   - **Column**: `admin_id`
   - **Operator**: `IS NOT NULL`
   - This ensures the webhook only fires when a support agent replies (not customer messages)
   
   **Type of webhook:**
   - Select **"Supabase Edge Functions"** (NOT "HTTP Request")
   
   **Edge Function Configuration:**
   - **Edge Function**: Select `notify-customer-reply` from dropdown
   - **HTTP Method**: `POST` (default)
   - **Timeout**: `5000` (5 seconds) or `10000` (10 seconds)
   
   **HTTP Headers:**
   - Click **"Add new header"** → **"Add auth header with service key"**

3. **Click "Save"** or **"Create Webhook"**

---

### Step 8: Create Webhook for Status Change Notifications (Customers)

1. **Click "New Webhook"** again

2. **Fill in the webhook configuration:**

   **Basic Settings:**
   - **Name**: `notify-status-change`
   - **Table**: Select `support_tickets` from dropdown
   - **Events**: Check ✅ `UPDATE` only
   
   **Filter:**
   - (No filter needed - all updates will be checked)
   - **Note**: The Edge Function will verify that the status actually changed before sending email
   
   **Type of webhook:**
   - Select **"Supabase Edge Functions"** (NOT "HTTP Request")
   
   **Edge Function Configuration:**
   - **Edge Function**: Select `notify-status-change` from dropdown
   - **HTTP Method**: `POST` (default)
   - **Timeout**: `5000` (5 seconds) or `10000` (10 seconds)
   
   **HTTP Headers:**
   - Click **"Add new header"** → **"Add auth header with service key"**

3. **Click "Save"** or **"Create Webhook"**

---

## ✅ Verification

### Test Pending Listing Email:

1. **Log out of the admin panel** (or use incognito mode)
2. **Create a new listing** with status "pending" (or update an existing one to pending)
3. **Check your email inbox** - you should receive an email notification
4. **Check Supabase Dashboard** → **Database** → **Webhooks** → Click on the webhook → See execution history

### Test New Ticket Email:

1. **Create a new support ticket** with status "open"
2. **Check your email inbox** (only admins/super_admins should receive)
3. **Verify in webhook logs**

### Test Ticket Assignment Email (Support Agents):

1. **Assign a ticket to a support agent** (user with role "support")
2. **Check the support agent's email inbox** - they should receive an assignment email
3. **Verify in webhook logs**

### Test Ticket Activity Email (Support Agents):

1. **Have a customer send a message** on a ticket assigned to a support agent
2. **Check the support agent's email inbox** - they should receive an activity email
3. **Change the priority** of an assigned ticket - support agent should receive email
4. **Add an internal note** to an assigned ticket - support agent should receive email
5. **Verify in webhook logs**

### Test Customer Reply Email:

1. **Have a support agent reply** to a customer's ticket
2. **Check the customer's email inbox** - they should receive a reply notification
3. **Verify in webhook logs**

### Test Status Change Email:

1. **Change the status** of a customer's ticket (e.g., from "open" to "resolved")
2. **Check the customer's email inbox** - they should receive a status change notification
3. **Verify in webhook logs**

---

## 🔍 Monitoring

### Check Webhook Logs:

1. Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/database/webhooks
2. Click on each webhook to see execution history
3. You should see successful requests (status 200)

### Check Edge Function Logs:

1. Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/functions
2. Select `notify-pending-listing` or `notify-new-ticket`
3. Click **"Logs"** tab
4. Look for entries showing successful email sends

### Check System Logs:

```sql
SELECT * FROM system_logs 
WHERE source LIKE '%notify%' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🐛 Troubleshooting

### Webhook not firing:
- ✅ Check the filter conditions match your data (`status = 'pending'` or `status = 'open'`)
- ✅ Verify the table name is correct (`listings` or `support_tickets`)
- ✅ Check webhook is enabled (not paused)
- ✅ Verify events are selected correctly (`INSERT` and/or `UPDATE`)

### Edge Function returns 401/403:
- ✅ Verify service role key is correct in headers
- ✅ Check both `Authorization` and `apikey` headers are set
- ✅ Ensure the key matches exactly (no extra spaces)

### Edge Function returns 500:
- ✅ Check Edge Function logs for error details
- ✅ Verify `RESEND_API_KEY` is set in Edge Function secrets
- ✅ Check `ADMIN_PANEL_URL` is set if you customized it (for admin notifications)
- ✅ Check `CUSTOMER_PORTAL_URL` is set if you customized it (for customer notifications)
- ✅ Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

### Emails not received:
- ✅ Check spam folder
- ✅ Verify admin/support user emails are correct in `admin_users` table
- ✅ Check Resend dashboard for email delivery status
- ✅ Verify the webhook actually fired (check webhook logs)

---

## 🎉 Success!

Once both webhooks are set up:
- ✅ Emails will be sent immediately when listings/tickets are created
- ✅ No admin needs to be online for emails to be sent
- ✅ The queue system still works as a backup
- ✅ Webhooks are more reliable than pg_net direct calls

---

## 📝 Quick Reference

**Edge Functions:**
- `notify-pending-listing` - Handles pending listing notifications (admins/super_admins only)
- `notify-new-ticket` - Handles new ticket notifications (admins/super_admins only)
- `notify-ticket-assignment` - Handles ticket assignment notifications (support agents only)
- `notify-ticket-activity` - Handles ticket activity notifications (support agents only)
- `notify-customer-reply` - Handles customer reply notifications when support agents respond
- `notify-status-change` - Handles status change notifications (customers)

**Email Recipients:**
- **Admins/Super Admins**: Receive emails for new tickets and pending listings
- **Support Agents**: Receive emails ONLY for tickets assigned to them (assignment, messages, priority changes, internal notes)
- **Customers**: Receive emails when support agents reply to their tickets AND when ticket status changes

**Dashboard Links:**
- Webhooks: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/database/webhooks
- Edge Functions: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/functions
- API Settings: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/settings/api

**Note:** When using "Supabase Edge Functions" webhook type, you don't need to manually configure URLs or service role keys - it's all handled automatically!

