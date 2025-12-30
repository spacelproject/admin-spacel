# Testing Database-Backed Admin Notifications

## Prerequisites
✅ Database migration applied (already done via MCP)
✅ Code updated to use database-backed notifications
✅ Admin users exist in the database

## Test Scenarios

### 1. Test Automatic Notification Creation

#### Test 1.1: New Booking Notification
1. **Create a new booking** (as a seeker user)
2. **Check the database:**
   ```sql
   SELECT * FROM admin_activity_notifications 
   WHERE activity_type = 'booking' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
3. **Expected Result:** All active admin users should have a new notification with:
   - `activity_type = 'booking'`
   - `title = 'New Booking'`
   - `message` containing seeker name and space name
   - `read = false`

#### Test 1.2: Pending Listing Notification
1. **Submit a new listing** (as a partner) with status `pending`
2. **Check the database:**
   ```sql
   SELECT * FROM admin_activity_notifications 
   WHERE activity_type IN ('listing_pending', 'listing_resubmitted')
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
3. **Expected Result:** All active admin users should have a notification

#### Test 1.3: Resubmitted Listing Notification
1. **Reject a listing** (as admin)
2. **Resubmit the same listing** (as partner) - set status back to `pending`
3. **Check the database:**
   ```sql
   SELECT * FROM admin_activity_notifications 
   WHERE activity_type = 'listing_resubmitted'
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
4. **Expected Result:** Notification with `activity_type = 'listing_resubmitted'`

#### Test 1.4: Support Ticket Notification
1. **Create a new support ticket** with status `open`
2. **Check the database:**
   ```sql
   SELECT * FROM admin_activity_notifications 
   WHERE activity_type = 'ticket'
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
3. **Expected Result:** All active admin users should have a notification

#### Test 1.5: Content Report Notification
1. **Create a new content report** with status `pending`
2. **Check the database:**
   ```sql
   SELECT * FROM admin_activity_notifications 
   WHERE activity_type = 'report'
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
3. **Expected Result:** All active admin users should have a notification

---

### 2. Test Notification Fetching (Frontend)

#### Test 2.1: Load Notifications in UI
1. **Log in as an admin user**
2. **Open the notifications dropdown/bell icon**
3. **Check browser console** for any errors
4. **Expected Result:** 
   - Notifications should load from database
   - Both regular and admin activity notifications should appear
   - No console errors

#### Test 2.2: Verify Notification Count
1. **Log in as an admin user**
2. **Check the notification badge count**
3. **Expected Result:** 
   - Badge should show total unread count (regular + admin activity)
   - Count should match database:
   ```sql
   SELECT COUNT(*) FROM admin_activity_notifications 
   WHERE admin_user_id = 'YOUR_ADMIN_USER_ID' 
   AND read = false;
   ```

---

### 3. Test Mark as Read

#### Test 3.1: Mark Single Notification as Read
1. **Log in as an admin user**
2. **Click on a notification** to mark it as read
3. **Check the database:**
   ```sql
   SELECT read, read_at FROM admin_activity_notifications 
   WHERE id = 'NOTIFICATION_ID';
   ```
4. **Expected Result:**
   - `read = true`
   - `read_at` should be set to current timestamp
   - Badge count should decrease by 1

#### Test 3.2: Mark All as Read
1. **Log in as an admin user**
2. **Click "Mark all as read"**
3. **Check the database:**
   ```sql
   SELECT COUNT(*) FROM admin_activity_notifications 
   WHERE admin_user_id = 'YOUR_ADMIN_USER_ID' 
   AND read = false;
   ```
4. **Expected Result:**
   - Count should be 0
   - Badge should disappear or show 0

#### Test 3.3: Persistence Across Sessions
1. **Mark some notifications as read**
2. **Refresh the page** (or close and reopen browser)
3. **Expected Result:**
   - Previously read notifications should still show as read
   - Badge count should remain the same
   - No duplicate notifications

---

### 4. Test Real-Time Updates

#### Test 4.1: Real-Time Notification Delivery
1. **Log in as an admin user in Browser Tab 1**
2. **Open browser console** to see real-time events
3. **In Browser Tab 2 (or different device):**
   - Create a new booking
   - OR submit a new listing
4. **Expected Result:**
   - Tab 1 should receive the notification in real-time
   - Badge count should update automatically
   - Notification should appear in dropdown without refresh

---

### 5. Test Edge Cases

#### Test 5.1: Multiple Admins
1. **Verify that when an event occurs, ALL active admins get notified:**
   ```sql
   -- After creating a booking, check:
   SELECT 
     admin_user_id,
     activity_type,
     title,
     created_at
   FROM admin_activity_notifications 
   WHERE activity_type = 'booking'
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
2. **Expected Result:** Each active admin should have their own notification record

#### Test 5.2: Inactive Admin
1. **Deactivate an admin user:**
   ```sql
   UPDATE admin_users 
   SET is_active = false 
   WHERE user_id = 'ADMIN_USER_ID';
   ```
2. **Create a new booking**
3. **Check notifications:**
   ```sql
   SELECT * FROM admin_activity_notifications 
   WHERE admin_user_id = 'INACTIVE_ADMIN_ID' 
   AND activity_type = 'booking'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
4. **Expected Result:** Inactive admin should NOT receive new notifications

#### Test 5.3: Duplicate Prevention
1. **Create the same booking twice** (if possible)
2. **Check for duplicates:**
   ```sql
   SELECT 
     admin_user_id,
     activity_type,
     data,
     COUNT(*) as count
   FROM admin_activity_notifications 
   GROUP BY admin_user_id, activity_type, data
   HAVING COUNT(*) > 1;
   ```
3. **Expected Result:** No duplicates (unique constraint should prevent this)

---

## Quick Test Script

Run this SQL to see all recent notifications:

```sql
SELECT 
  aan.id,
  p.email as admin_email,
  aan.activity_type,
  aan.title,
  aan.message,
  aan.read,
  aan.read_at,
  aan.created_at,
  aan.data
FROM admin_activity_notifications aan
JOIN profiles p ON p.id = aan.admin_user_id
ORDER BY aan.created_at DESC
LIMIT 20;
```

---

## Manual UI Testing Checklist

- [ ] Login as admin user
- [ ] Check notification bell icon appears
- [ ] Check badge count is correct
- [ ] Click bell to open dropdown
- [ ] Verify notifications are displayed
- [ ] Click on a notification to mark as read
- [ ] Verify badge count decreases
- [ ] Click "Mark all as read"
- [ ] Verify all notifications marked as read
- [ ] Refresh page
- [ ] Verify read status persists
- [ ] Create a new booking (as seeker)
- [ ] Verify admin receives notification in real-time
- [ ] Verify badge count updates automatically

---

## Troubleshooting

### Notifications not appearing?
1. Check if triggers are active:
   ```sql
   SELECT * FROM information_schema.triggers 
   WHERE trigger_name LIKE '%notify_admins%';
   ```

2. Check if admin user is active:
   ```sql
   SELECT * FROM admin_users WHERE user_id = 'YOUR_USER_ID';
   ```

3. Check browser console for errors

### Real-time not working?
1. Check Supabase connection
2. Check browser console for subscription errors
3. Verify WebSocket connection is active

### Read status not persisting?
1. Check database directly:
   ```sql
   SELECT read, read_at FROM admin_activity_notifications 
   WHERE id = 'NOTIFICATION_ID';
   ```
2. Check browser console for update errors

---

## Success Criteria

✅ All triggers are active and creating notifications
✅ Notifications appear in UI correctly
✅ Mark as read works and persists
✅ Badge count is accurate
✅ Real-time updates work
✅ Read status persists across sessions
✅ No duplicate notifications
✅ Only active admins receive notifications

