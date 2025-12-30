# Support System Testing Guide

This guide will help you test the new support ticket system with both admin and support agent roles.

## Prerequisites

1. **Admin User**: Already exists (`admin@spacio.com` with `super_admin` role)
2. **Support User**: Needs to be created (see Step 1)
3. **Regular User**: Need at least one regular user to create tickets

---

## Step 1: Create a Support Agent User

### Option A: Via Supabase Dashboard (Recommended)

1. Go to Authentication → Users in Supabase Dashboard
2. Create a new user with email: `support@test.com` and password: Support123!``
3. Note the user's UUID from the users table
4. Go to SQL Editor and run:

```sql
-- Replace USER_UUID with the actual UUID from step 3
INSERT INTO admin_users (user_id, email, role, is_active, permissions)
VALUES (
  'USER_UUID', 
  'support@test.com', 
  'support', 
  true, 
  '{}'::jsonb
);
```

### Option B: Via Application (If registration is enabled)

1. Go to `/admin-register`
2. Register with email: `support@test.com`
3. After registration, update the role in database:

```sql
UPDATE admin_users 
SET role = 'support' 
WHERE email = 'support@test.com';
```

---

## Step 2: Create Test Tickets

### Via SQL (Quick Setup)

Run this SQL to create test tickets:

```sql
-- First, get a regular user ID (or create one)
-- Replace USER_ID with an actual user ID from profiles table
INSERT INTO support_tickets (
  user_id, 
  subject, 
  description, 
  category, 
  priority, 
  status,
  assigned_to  -- Leave NULL for unassigned tickets
) VALUES
  -- Unassigned ticket
  (
    (SELECT id FROM profiles LIMIT 1),
    'Payment processing issue',
    'I cannot complete my payment. The card keeps getting declined.',
    'payment',
    'high',
    'open',
    NULL
  ),
  -- Assigned ticket (will be assigned to support agent)
  (
    (SELECT id FROM profiles LIMIT 1),
    'Account verification problem',
    'I cannot verify my account. The verification link expired.',
    'account',
    'medium',
    'open',
    (SELECT user_id FROM admin_users WHERE role = 'support' LIMIT 1)
  ),
  -- Resolved ticket
  (
    (SELECT id FROM profiles LIMIT 1),
    'Booking cancellation request',
    'I need to cancel my booking and get a refund.',
    'booking',
    'urgent',
    'resolved',
    (SELECT user_id FROM admin_users WHERE role = 'support' LIMIT 1)
  );
```

**Note**: Ticket IDs will be auto-generated in format `TCK-<hex>` by the trigger function.

---

## Step 3: Test Admin UI (`)

### Login as Admin

1. Go to `/admin-login`
2. Login with: `admin@spacio.com` and your admin password
3. You should be redirected to `/dashboard-overview`

### Test Admin Features

1. **Navigate to Support Tickets**:
   - Go to `/support-ticket-system`
   - You should see all tickets (assigned and unassigned)

2. **View Assignment Panel**:
   - Should show support agents with their workload
   - Should show unassigned tickets count

3. **Assign Tickets**:
   - Select one or more unassigned tickets (checkboxes)
   - Use bulk assign dropdown or individual ticket assignment
   - Assign to support agent
   - Verify ticket appears in "assigned" filter

4. **Test Filters**:
   - Filter by priority (urgent, high, medium, low)
   - Filter by category
   - Filter by status
   - Filter by assignee (including "Unassigned")
   - Search by ticket ID, user name, or subject

5. **Open Ticket Detail**:
   - Click on any ticket
   - Verify all tabs work: Conversation, User Details, Internal Notes, Related Items
   - Test updating status and priority
   - Test assigning ticket to different agent

6. **Test Real-time Updates**:
   - Open ticket detail in one browser tab
   - In another tab, update ticket status
   - First tab should update automatically

---

## Step 4: Test Support Agent UI (`/support-agent-tickets`)

### Login as Support Agent

1. **Logout** from admin account
2. Go to `/admin-login`
3. Login with: `support@test.com` and password `Support123!`
4. **You should be redirected to `/support-agent-tickets`** (not dashboard)

### Test Support Agent Features

1. **Verify Access**:
   - Should see simplified sidebar (only "Support Tickets")
   - Should NOT see admin sidebar or other admin features
   - Try accessing `/support-ticket-system` directly - should be blocked
   - Try accessing `/dashboard-overview` - should be blocked

2. **View Personal Stats**:
   - Check "My Open Tickets" count
   - Check "Resolved Today" count
   - Check "Avg Response Time" (may show "-" if no replies yet)
   - Check "Unread Replies" count

3. **View My Tickets**:
   - Should only see tickets assigned to support agent
   - Should NOT see unassigned tickets
   - Should NOT see tickets assigned to other agents

4. **Open Ticket Detail**:
   - Click on assigned ticket
   - Verify conversation thread loads
   - Test sending a reply
   - Verify reply appears in conversation

5. **Update Ticket**:
   - Change ticket status (e.g., open → in-progress → resolved)
   - Change priority
   - Save changes
   - Verify updates persist

6. **Test Real-time Updates**:
   - Open ticket detail
   - Admin assigns a new ticket to you in another tab
   - Your ticket list should update automatically

---

## Step 5: Test RLS Policies (Security)

### Test Support Agent Cannot Access Other Tickets

1. Login as support agent
2. Note ticket IDs you can see
3. Try to query tickets not assigned to you via browser console:

```javascript
// This should return empty or error
const { data, error } = await supabase
  .from('support_tickets')
  .select('*')
  .neq('assigned_to', 'YOUR_USER_ID')
```

4. Verify you can only see tickets where `assigned_to = YOUR_USER_ID`

### Test Support Agent Cannot Access Admin Routes

1. Login as support agent
2. Try accessing these URLs directly:
   - `/support-ticket-system` - Should redirect to login
   - `/dashboard-overview` - Should redirect to login
   - `/user-management` - Should redirect to login
   - `/support-agent-tickets` - Should work ✓

### Test Admin Can Access Everything

1. Login as admin
2. Verify you can access:
   - `/support-ticket-system` ✓
   - `/dashboard-overview` ✓
   - `/support-agent-tickets` ✓ (admins can access support routes too)

---

## Step 6: Test Ticket ID Generation

### Verify Auto-Generation

1. Create a new ticket (via admin UI or SQL)
2. Check the `ticket_id` field
3. Should be in format: `TCK-<6-8 hex characters>`
4. Example: `TCK-a3f2b1c`

### Verify Uniqueness

1. Create multiple tickets
2. Verify all have unique `ticket_id` values
3. If collision occurs, function should retry with salt

---

## Step 7: Test Categories

### Verify Categories are Enforced

1. Try creating ticket with invalid category (via SQL):

```sql
-- This should fail due to check constraint
INSERT INTO support_tickets (user_id, subject, description, category)
VALUES (
  (SELECT id FROM profiles LIMIT 1),
  'Test',
  'Test description',
  'invalid_category'  -- Should fail
);
```

2. Verify only valid categories from `support_categories` table work

### Test Category Dropdown

1. In admin UI, when creating/editing ticket
2. Category dropdown should show only active categories
3. Categories should be: technical, billing, general, booking, space, account, payment, refund, other

---

## Step 8: Test Storage Bucket

### Verify Bucket Exists

1. Go to Supabase Dashboard → Storage
2. Should see `support-attachments` bucket
3. Should be private (not public)

### Test Upload (Future Implementation)

Once file upload is implemented in UI:
1. Upload a file to ticket
2. Verify file appears in `support-attachments/tickets/{ticket_id}/` folder
3. Verify only support agents/admins can access

---

## Step 9: Test Internal Notes (Future Implementation)

Once internal notes UI is implemented:
1. As support agent, add internal note to ticket
2. Verify note appears in "Internal Notes" tab
3. Verify regular users cannot see internal notes
4. Verify note is stored in `support_ticket_notes` table

---

## Common Issues & Troubleshooting

### Issue: Support agent cannot login

**Solution**: 
- Verify user exists in `admin_users` table with `role = 'support'`
- Verify `is_active = true`
- Check browser console for errors

### Issue: Support agent sees no tickets

**Solution**:
- Verify tickets exist with `assigned_to` matching support agent's user_id
- Check RLS policies are enabled
- Verify support agent's user_id matches `assigned_to` field

### Issue: Ticket ID not generating

**Solution**:
- Check trigger exists: `trigger_set_ticket_id`
- Check function exists: `generate_ticket_id()`
- Verify trigger is enabled on `support_tickets` table

### Issue: Real-time updates not working

**Solution**:
- Check Supabase Realtime is enabled in project settings
- Verify WebSocket connection in browser console
- Check subscription is active

---

## Test Checklist

- [ ] Support agent user created
- [ ] Test tickets created
- [ ] Admin can access `/support-ticket-system`
- [ ] Admin can assign tickets
- [ ] Admin can see all tickets
- [ ] Support agent redirected to `/support-agent-tickets` on login
- [ ] Support agent can only see assigned tickets
- [ ] Support agent cannot access admin routes
- [ ] Support agent can reply to tickets
- [ ] Support agent can update ticket status/priority
- [ ] Real-time updates work
- [ ] Ticket IDs auto-generate correctly
- [ ] Categories are enforced
- [ ] RLS policies work correctly
- [ ] Storage bucket exists

---

## Next Steps

After testing, you may want to:
1. Integrate internal notes UI into ticket detail modal
2. Add file upload functionality for attachments
3. Add email notifications for ticket assignments
4. Add ticket creation UI for regular users
5. Add reporting/analytics for support metrics

