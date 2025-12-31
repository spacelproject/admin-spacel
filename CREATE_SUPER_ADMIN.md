# How to Create a Super Admin Account

There are **3 ways** to create a `super_admin` account:

---

## Method 1: Automatic (First User) ✅

**The first user to register automatically becomes `super_admin`**

- When the first user signs up, the system automatically assigns them the `super_admin` role
- This only works if there are **no existing admin users** in the database
- After the first user, all subsequent users get the role from their invite token (`admin` or `support`)

---

## Method 2: Update Existing Admin via SQL (Recommended) 🔧

**Update an existing admin user to `super_admin` using SQL:**

1. **Go to Supabase SQL Editor:**
   - https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/sql/new

2. **Run this SQL** (replace `USER_EMAIL_HERE` with the actual email):
   ```sql
   -- Update an existing admin user to super_admin
   UPDATE admin_users
   SET 
     role = 'super_admin',
     permissions = '["all"]'::jsonb
   WHERE user_id IN (
     SELECT id FROM profiles WHERE email = 'USER_EMAIL_HERE'
   )
   RETURNING *;
   ```

3. **Example** (to make `bremchevy@gmail.com` a super_admin):
   ```sql
   UPDATE admin_users
   SET 
     role = 'super_admin',
     permissions = '["all"]'::jsonb
   WHERE user_id IN (
     SELECT id FROM profiles WHERE email = 'bremchevy@gmail.com'
   )
   RETURNING *;
   ```

---

## Method 3: Create New Super Admin via SQL 🆕

**Create a completely new super_admin account:**

1. **First, create the auth user** (you'll need to do this via Supabase Auth API or Dashboard)
   - Go to: https://supabase.com/dashboard/project/bwgwoqywmlaevyygkafg/auth/users
   - Click "Add User" → Enter email and password → Create

2. **Then, get the user ID** from the auth.users table

3. **Run this SQL** (replace `USER_ID_HERE` and `USER_EMAIL_HERE`):
   ```sql
   -- Create profile (if it doesn't exist)
   INSERT INTO profiles (id, email, first_name, last_name, role, created_at, updated_at)
   VALUES (
     'USER_ID_HERE'::uuid,
     'USER_EMAIL_HERE',
     'First',
     'Last',
     'admin',
     NOW(),
     NOW()
   )
   ON CONFLICT (id) DO NOTHING;

   -- Create admin_users entry with super_admin role
   INSERT INTO admin_users (user_id, email, role, permissions, is_active)
   VALUES (
     'USER_ID_HERE'::uuid,
     'USER_EMAIL_HERE',
     'super_admin',
     '["all"]'::jsonb,
     true
   )
   ON CONFLICT (user_id) DO UPDATE
   SET 
     role = 'super_admin',
     permissions = '["all"]'::jsonb,
     is_active = true
   RETURNING *;
   ```

---

## Method 4: Using the Setup Script (Browser Console) 💻

**If you're already logged in as an admin, you can use the setup script:**

1. **Open your browser console** (F12) while logged into the admin panel
2. **Run this code:**
   ```javascript
   // This will make your current logged-in user a super_admin
   async function makeSuperAdmin() {
     const { data: { user } } = await supabase.auth.getUser();
     
     if (!user) {
       console.error('❌ No user found. Please log in first.');
       return;
     }
     
     const { data, error } = await supabase
       .from('admin_users')
       .update({
         role: 'super_admin',
         permissions: ['all']
       })
       .eq('user_id', user.id)
       .select()
       .single();
     
     if (error) {
       console.error('❌ Error:', error);
     } else {
       console.log('✅ You are now a super_admin! Refresh the page.');
     }
   }
   
   makeSuperAdmin();
   ```

---

## Quick SQL to Check Current Admins 👀

```sql
-- See all admin users and their roles
SELECT 
  au.id,
  au.role,
  au.is_active,
  p.email,
  p.first_name,
  p.last_name
FROM admin_users au
LEFT JOIN profiles p ON p.id = au.user_id
ORDER BY au.role, p.email;
```

---

## Quick SQL to Make Someone Super Admin 🚀

```sql
-- Replace 'EMAIL_HERE' with the actual email
UPDATE admin_users
SET role = 'super_admin', permissions = '["all"]'::jsonb
WHERE user_id = (SELECT id FROM profiles WHERE email = 'EMAIL_HERE')
RETURNING *;
```

---

## Valid Roles

The system supports these roles:
- `super_admin` - Full access to everything
- `admin` - Standard admin access
- `support` - Support agent access
- `moderator` - Moderator access

---

## Notes

- ✅ `super_admin` has `permissions: ["all"]`
- ✅ Only `super_admin` and `admin` roles can access admin routes
- ✅ `support` role has limited access (support tickets only)
- ✅ The first user automatically becomes `super_admin` (if no admins exist)

