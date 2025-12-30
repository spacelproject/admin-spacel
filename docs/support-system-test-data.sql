-- ============================================
-- Support System Test Data Setup Script
-- ============================================
-- Run this in Supabase SQL Editor to create test data

-- Step 1: Create a test support agent user
-- Note: You'll need to create the auth user first via Dashboard or API
-- Then replace 'SUPPORT_USER_UUID' with the actual UUID

-- First, check if we have any users to use
SELECT id, email, first_name, last_name FROM profiles LIMIT 5;

-- Option A: Create support agent from existing user
-- Replace 'USER_EMAIL' with an existing user email
INSERT INTO admin_users (user_id, email, role, is_active, permissions)
SELECT 
  id,
  email,
  'support',
  true,
  '{}'::jsonb
FROM profiles
WHERE email = 'USER_EMAIL'  -- Replace with actual email
AND NOT EXISTS (
  SELECT 1 FROM admin_users WHERE user_id = profiles.id
)
RETURNING *;

-- Option B: If you know the UUID directly
-- INSERT INTO admin_users (user_id, email, role, is_active, permissions)
-- VALUES (
--   'SUPPORT_USER_UUID',  -- Replace with actual UUID
--   'support@test.com',
--   'support',
--   true,
--   '{}'::jsonb
-- );

-- Step 2: Create test tickets
-- Get a user ID for ticket creation
DO $$
DECLARE
  test_user_id UUID;
  support_user_id UUID;
BEGIN
  -- Get first regular user (not admin)
  SELECT id INTO test_user_id
  FROM profiles
  WHERE id NOT IN (SELECT user_id FROM admin_users WHERE user_id IS NOT NULL)
  LIMIT 1;
  
  -- Get support agent user ID
  SELECT user_id INTO support_user_id
  FROM admin_users
  WHERE role = 'support'
  LIMIT 1;
  
  -- Create test tickets
  INSERT INTO support_tickets (
    user_id,
    subject,
    description,
    category,
    priority,
    status,
    assigned_to
  ) VALUES
    -- Unassigned urgent ticket
    (
      test_user_id,
      'Payment processing failed - Urgent',
      'I tried to book a space but my payment keeps failing. I need this resolved ASAP as I have a meeting tomorrow.',
      'payment',
      'urgent',
      'open',
      NULL
    ),
    -- Assigned high priority ticket
    (
      test_user_id,
      'Account verification not working',
      'I received the verification email but when I click the link, it says expired. I cannot access my account.',
      'account',
      'high',
      'open',
      support_user_id
    ),
    -- Assigned medium priority ticket
    (
      test_user_id,
      'Need help updating space availability',
      'I want to update my space calendar but I cannot find the option. Can someone guide me?',
      'space',
      'medium',
      'in-progress',
      support_user_id
    ),
    -- Resolved ticket
    (
      test_user_id,
      'Booking cancellation request',
      'I need to cancel my booking due to emergency. Please process refund.',
      'booking',
      'high',
      'resolved',
      support_user_id
    ),
    -- Low priority general inquiry
    (
      test_user_id,
      'How do I change my profile picture?',
      'I want to update my profile picture but cannot find where to upload it.',
      'general',
      'low',
      'open',
      NULL
    )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Test tickets created successfully!';
  RAISE NOTICE 'User ID used: %', test_user_id;
  RAISE NOTICE 'Support agent ID: %', support_user_id;
END $$;

-- Step 3: Verify tickets were created
SELECT 
  ticket_id,
  subject,
  category,
  priority,
  status,
  CASE 
    WHEN assigned_to IS NULL THEN 'Unassigned'
    ELSE 'Assigned'
  END as assignment_status,
  created_at
FROM support_tickets
ORDER BY created_at DESC
LIMIT 10;

-- Step 4: Add some test replies to assigned tickets
INSERT INTO support_ticket_replies (ticket_id, admin_id, content)
SELECT 
  st.id,
  au.user_id,
  'Thank you for contacting support. I have received your ticket and will investigate this issue. I will get back to you shortly.'
FROM support_tickets st
JOIN admin_users au ON au.user_id = st.assigned_to
WHERE st.assigned_to IS NOT NULL
AND st.status IN ('open', 'in-progress')
LIMIT 1;

-- Step 5: Verify support categories exist
SELECT code, label, is_active FROM support_categories ORDER BY sort_order;

-- ============================================
-- Verification Queries
-- ============================================

-- Check support agents
SELECT 
  au.email,
  au.role,
  au.is_active,
  p.first_name,
  p.last_name
FROM admin_users au
LEFT JOIN profiles p ON p.id = au.user_id
WHERE au.role = 'support';

-- Check ticket distribution
SELECT 
  CASE 
    WHEN assigned_to IS NULL THEN 'Unassigned'
    ELSE 'Assigned'
  END as status,
  COUNT(*) as count
FROM support_tickets
GROUP BY status;

-- Check tickets by priority
SELECT 
  priority,
  COUNT(*) as count
FROM support_tickets
GROUP BY priority
ORDER BY 
  CASE priority
    WHEN 'urgent' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END;

