# User Management Module - Implementation Plan

## 📋 Overview

The user-management module is currently **70% complete** with excellent real data integration for viewing and displaying users. This plan addresses the remaining **30%** that uses mock data and needs real Supabase integration.

## 🎯 Current Status

### ✅ Completed Features (70%)
- **Main User Management Page** - Real data integration with `useUsers` hook
- **User Table Component** - Real user data display with sorting and filtering
- **User Profile Modal** - Comprehensive real data fetching with `useUserProfile` hook
- **Custom Hooks** - `useUsers.js` and `useUserProfile.js` fully implemented
- **Database Integration** - All necessary tables exist with proper relationships
- **UI Components** - All components built and responsive

### ⚠️ Mock Data Remaining (30%)
- **User Search Bar** - Mock search suggestions
- **Add User Modal** - Mock API calls for user creation
- **Edit User Modal** - Mock API calls for user updates
- **Message Modal** - Mock message sending
- **Bulk Actions** - Not implemented (console.log only)

## 🗄️ Database Analysis

### Current Database Status: ✅ FULLY OPERATIONAL
- **8 users** in profiles table
- **7 listings** in listings table
- **25 bookings** in bookings table
- **2 earnings** records
- **369 notifications** for activity tracking
- **All necessary tables exist** with proper relationships

### Key Tables for User Management:
```sql
-- Core user data
profiles (8 rows) - id, email, first_name, last_name, role, avatar_url, phone, etc.

-- User activity tracking
user_presence (6 rows) - user_id, last_seen, is_online
notifications (369 rows) - user_id, type, title, message, read, created_at
booking_modifications (71 rows) - modified_by, modification_type, reason, created_at

-- Messaging system
conversations (4 rows) - participant1_id, participant2_id
messages (8 rows) - conversation_id, sender_id, content, created_at
conversation_participants (8 rows) - conversation_id, user_id, last_read_message_id

-- User preferences
user_preferences (0 rows) - user_id, theme, language, notifications_enabled
```

## 🚀 Implementation Plan

### Phase 1: Real Search Functionality (2 hours)

#### 1.1 Update UserSearchBar Component
**File**: `src/pages/user-management/components/UserSearchBar.jsx`

**Current Issue**: Lines 12-19 use mock search suggestions
```javascript
// REMOVE: Mock suggestions
const suggestions = [
  { type: 'user', name: 'John Smith', email: 'john.smith@email.com', id: 'USR001' },
  // ... more mock data
];
```

**Implementation**:
```javascript
// ADD: Real search functionality
const [suggestions, setSuggestions] = useState([]);
const [searchLoading, setSearchLoading] = useState(false);

const searchUsers = async (query) => {
  if (query.length < 2) {
    setSuggestions([]);
    return;
  }
  
  setSearchLoading(true);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);
    
    if (!error) {
      const formattedSuggestions = data.map(user => ({
        type: 'user',
        name: `${user.first_name} ${user.last_name}`.trim(),
        email: user.email,
        id: user.id,
        role: user.role
      }));
      setSuggestions(formattedSuggestions);
    }
  } catch (err) {
    console.error('Search error:', err);
  } finally {
    setSearchLoading(false);
  }
};
```

#### 1.2 Add Debounced Search
```javascript
// ADD: Debounced search hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

// Usage in component
const debouncedSearchTerm = useDebounce(searchTerm, 300);
useEffect(() => {
  searchUsers(debouncedSearchTerm);
}, [debouncedSearchTerm]);
```

### Phase 2: Real CRUD Operations (3 hours)

#### 2.1 Update AddUserModal Component
**File**: `src/pages/user-management/components/AddUserModal.jsx`

**Current Issue**: Lines 100-126 use mock API simulation
```javascript
// REMOVE: Mock API call
await new Promise(resolve => setTimeout(resolve, 1000));
const newUser = {
  id: `USR${Date.now()}`, // Mock ID generation
  // ... mock user creation
};
```

**Implementation**:
```javascript
// ADD: Real user creation
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setIsSubmitting(true);
  
  try {
    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: formData.email,
      password: formData.password,
      email_confirm: true
    });
    
    if (authError) throw authError;
    
    // Create profile in profiles table
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: formData.email,
        first_name: formData.name.split(' ')[0],
        last_name: formData.name.split(' ').slice(1).join(' '),
        role: formData.userType,
        phone: formData.phone,
        company_name: formData.userType === 'partner' ? formData.location : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (profileError) throw profileError;
    
    // Create user preferences
    await supabase
      .from('user_preferences')
      .insert({
        user_id: authData.user.id,
        theme: 'light',
        language: 'en',
        notifications_enabled: true,
        email_notifications: true,
        push_notifications: true,
        currency: 'USD',
        timezone: 'UTC'
      });
    
    // Create user presence record
    await supabase
      .from('user_presence')
      .insert({
        user_id: authData.user.id,
        last_seen: new Date().toISOString(),
        is_online: false
      });
    
    // Transform data for UI
    const newUser = {
      id: profileData.id,
      name: `${profileData.first_name} ${profileData.last_name}`.trim(),
      email: profileData.email,
      role: profileData.role,
      status: 'active',
      avatar: profileData.avatar_url,
      phone: profileData.phone,
      joinedDate: profileData.created_at,
      lastActive: profileData.updated_at,
      totalBookings: 0,
      totalSpent: 0,
      location: profileData.company_name || 'Not specified'
    };
    
    onAddUser(newUser);
    handleClose();
    
  } catch (error) {
    console.error('Error creating user:', error);
    setErrors({ general: error.message });
  } finally {
    setIsSubmitting(false);
  }
};
```

#### 2.2 Update EditUserModal Component
**File**: `src/pages/user-management/components/EditUserModal.jsx`

**Current Issue**: Lines 109-130 use mock API simulation

**Implementation**:
```javascript
// ADD: Real user update
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setIsSubmitting(true);
  
  try {
    // Update profile in profiles table
    const { data, error } = await supabase
      .from('profiles')
      .update({
        first_name: formData.name.split(' ')[0],
        last_name: formData.name.split(' ').slice(1).join(' '),
        role: formData.userType,
        phone: formData.phone,
        company_name: formData.userType === 'partner' ? formData.location : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Transform data for UI
    const updatedUser = {
      ...user,
      name: `${data.first_name} ${data.last_name}`.trim(),
      role: data.role,
      phone: data.phone,
      location: data.company_name || 'Not specified',
      status: formData.status
    };
    
    onUpdateUser(updatedUser);
    handleClose();
    
  } catch (error) {
    console.error('Error updating user:', error);
    setErrors({ general: error.message });
  } finally {
    setIsSubmitting(false);
  }
};
```

### Phase 3: Real Messaging System (2 hours)

#### 3.1 Update MessageModal Component
**File**: `src/pages/user-management/components/MessageModal.jsx`

**Current Issue**: Lines 132-157 use mock API simulation

**Implementation**:
```javascript
// ADD: Real message sending
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setIsSubmitting(true);
  
  try {
    // Get or create conversation between admin and user
    let conversationId;
    
    // Check if conversation exists
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
      .single();
    
    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          participant1_id: user.id,
          participant2_id: user.id, // Admin user ID (get from auth context)
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (convError) throw convError;
      conversationId = newConv.id;
      
      // Add participants
      await supabase
        .from('conversation_participants')
        .insert([
          {
            conversation_id: conversationId,
            user_id: user.id,
            notifications_enabled: true
          },
          {
            conversation_id: conversationId,
            user_id: user.id, // Admin user ID
            notifications_enabled: true
          }
        ]);
    }
    
    // Send message
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id, // Admin user ID
        content: messageData.message,
        message_type: 'text',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (messageError) throw messageError;
    
    // Create notification for recipient
    await supabase
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'message',
        title: 'New Message',
        message: `You have received a new message: ${messageData.subject}`,
        data: {
          conversation_id: conversationId,
          message_id: messageData.id,
          sender_id: user.id // Admin user ID
        },
        created_at: new Date().toISOString()
      });
    
    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    
    const messagePayload = {
      to: user.id,
      recipient: {
        id: user.id,
        name: userName,
        email: userEmail
      },
      subject: messageData.subject,
      message: messageData.message,
      priority: messageData.priority,
      timestamp: new Date().toISOString(),
      status: 'sent',
      conversation_id: conversationId,
      message_id: messageData.id
    };
    
    onSendMessage(messagePayload);
    handleClose();
    
  } catch (error) {
    console.error('Error sending message:', error);
    setErrors({ general: error.message });
  } finally {
    setIsSubmitting(false);
  }
};
```

### Phase 4: Fix Total Spent Calculation (1 hour)

#### 4.1 Update useUsers Hook
**File**: `src/hooks/useUsers.js`

**Current Issue**: Lines 104-122 calculate totalSpent incorrectly
```javascript
// CURRENT ISSUE: Incorrect calculation
const totalSpent = userBookings.reduce((sum, booking) => 
  sum + (parseFloat(booking.total_paid) || 0), 0
)
```

**Implementation**:
```javascript
// FIX: Correct total spent calculation
const calculateUserStats = (userId, userRole) => {
  const userBookings = bookingsData?.filter(booking => 
    userRole === 'seeker' ? booking.seeker_id === userId : false
  ) || []

  const userEarnings = earningsData?.filter(earning => 
    userRole === 'partner' ? earning.partner_id === userId : false
  ) || []

  const totalBookings = userBookings.length
  
  // FIXED: Correct total spent calculation for seekers
  const totalSpent = userBookings.reduce((sum, booking) => {
    // Use total_paid if available, otherwise use price
    const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0
    return sum + amount
  }, 0)
  
  // FIXED: Correct total earnings calculation for partners
  const totalEarnings = userEarnings.reduce((sum, earning) => 
    sum + (parseFloat(earning.net_amount) || 0), 0
  )

  return { totalBookings, totalSpent, totalEarnings }
}
```

#### 4.2 Update Database Query for Better Data
```javascript
// IMPROVE: Fetch more complete booking data
const { data: bookingsData, error: bookingsError } = await supabase
  .from('bookings')
  .select(`
    id,
    seeker_id,
    partner_id,
    total_paid,
    price,
    original_amount,
    service_fee,
    payment_processing_fee,
    status,
    payment_status,
    created_at,
    updated_at
  `)
  .eq('payment_status', 'paid') // Only count paid bookings
```

#### 4.3 Update UserProfileModal Component
**File**: `src/pages/user-management/components/UserProfileModal.jsx`

**Current Issue**: Lines 147-160 calculate totals incorrectly

**Implementation**:
```javascript
// FIXED: Correct total calculation in profile modal
<p className="text-sm text-muted-foreground">
  {userProfile.role === 'partner' 
    ? `$${userEarnings?.reduce((sum, earning) => {
        // For partners, use net_amount from earnings table
        return sum + (parseFloat(earning.net_amount) || 0);
      }, 0) || 0}`
    : `$${userBookings?.reduce((sum, booking) => {
        // For seekers, use total_paid or price
        const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0;
        return sum + amount;
      }, 0) || 0}`
  }
</p>
```

### Phase 5: Bulk Actions Implementation (2 hours)

#### 5.1 Update Main User Management Page
**File**: `src/pages/user-management/index.jsx`

**Current Issue**: Lines 235-239 use console.log for bulk actions

**Implementation**:
```javascript
// ADD: Real bulk actions
const handleBulkAction = async (actionId) => {
  if (selectedUsers.length === 0) return;
  
  setIsLoading(true);
  
  try {
    switch (actionId) {
      case 'activate':
        await bulkUpdateUserStatus(selectedUsers, 'active');
        break;
      case 'suspend':
        await bulkUpdateUserStatus(selectedUsers, 'suspended');
        break;
      case 'delete':
        await bulkDeleteUsers(selectedUsers);
        break;
      case 'export':
        await exportUsers(selectedUsers);
        break;
      case 'message':
        // Open bulk message modal
        setBulkMessageUsers(selectedUsers);
        setIsBulkMessageModalOpen(true);
        break;
      case 'role':
        // Open bulk role change modal
        setBulkRoleUsers(selectedUsers);
        setIsBulkRoleModalOpen(true);
        break;
    }
    
    setSelectedUsers([]);
    showToast(`Bulk action completed: ${actionId}`, 'success');
    
  } catch (error) {
    console.error('Bulk action error:', error);
    showToast(`Error performing bulk action: ${error.message}`, 'error');
  } finally {
    setIsLoading(false);
  }
};

// Helper functions
const bulkUpdateUserStatus = async (userIds, status) => {
  const { error } = await supabase
    .from('profiles')
    .update({ 
      updated_at: new Date().toISOString(),
      // Add status field if it doesn't exist in profiles table
      // Or create a separate user_status table
    })
    .in('id', userIds);
  
  if (error) throw error;
  
  // Update local state
  setUsers(prev => prev.map(user => 
    userIds.includes(user.id) 
      ? { ...user, status, updated_at: new Date().toISOString() }
      : user
  ));
};

const bulkDeleteUsers = async (userIds) => {
  // Delete from profiles table
  const { error } = await supabase
    .from('profiles')
    .delete()
    .in('id', userIds);
  
  if (error) throw error;
  
  // Update local state
  setUsers(prev => prev.filter(user => !userIds.includes(user.id)));
};

const exportUsers = async (userIds) => {
  const usersToExport = users.filter(user => userIds.includes(user.id));
  
  // Create CSV data
  const csvData = usersToExport.map(user => ({
    'User ID': user.id,
    'Name': user.name,
    'Email': user.email,
    'Role': user.role,
    'Status': user.status,
    'Phone': user.phone,
    'Joined Date': user.joinedDate,
    'Last Active': user.lastActive,
    'Total Bookings': user.totalBookings,
    'Total Spent': user.totalSpent
  }));
  
  // Convert to CSV and download
  const csv = convertToCSV(csvData);
  downloadCSV(csv, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
};
```

## 🔧 Required Database Updates

### 1. Add Status Field to Profiles Table
```sql
-- Add status field to profiles table if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'suspended', 'pending', 'inactive'));
```

### 2. Create User Status History Table (Optional)
```sql
-- Track status changes for audit purposes
CREATE TABLE IF NOT EXISTS user_status_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  changed_by UUID REFERENCES profiles(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 📊 Implementation Timeline

| Phase | Component | Estimated Time | Priority |
|-------|-----------|----------------|----------|
| 1 | Real Search Functionality | 2 hours | High |
| 2 | Real CRUD Operations | 3 hours | High |
| 3 | Real Messaging System | 2 hours | Medium |
| 4 | Fix Total Spent Calculation | 1 hour | High |
| 5 | Bulk Actions Implementation | 2 hours | Medium |
| **Total** | **Complete User Management** | **10 hours** | **High** |

## 🎯 Success Criteria

### Phase 1 Complete When:
- [ ] Search suggestions show real users from database
- [ ] Search is debounced and performs efficiently
- [ ] Search works by name, email, and user ID

### Phase 2 Complete When:
- [ ] Add User Modal creates real users in Supabase Auth + profiles table
- [ ] Edit User Modal updates real user data in database
- [ ] User creation includes preferences and presence records
- [ ] Error handling works for all CRUD operations

### Phase 3 Complete When:
- [ ] Message Modal sends real messages to conversations table
- [ ] Messages create proper conversation threads
- [ ] Recipients receive notifications for new messages
- [ ] Message templates work with real data

### Phase 4 Complete When:
- [ ] Total Spent shows correct amounts for seekers
- [ ] Total Earnings shows correct amounts for partners
- [ ] Calculations use proper database fields (total_paid, price, net_amount)
- [ ] Only paid bookings are counted in totals

### Phase 5 Complete When:
- [ ] Bulk activate/suspend users works with database
- [ ] Bulk delete users works with database
- [ ] Bulk export generates real CSV files
- [ ] Bulk messaging creates multiple conversations

## 🚨 Dependencies

- **Supabase Client**: Already configured and working
- **Auth Context**: Already implemented
- **Toast Notifications**: Already implemented
- **Database Tables**: All exist and ready
- **Admin Permissions**: Need to verify admin user has proper permissions

## 🔍 Testing Strategy

### Unit Tests:
- Test search functionality with various query types
- Test user creation with different roles
- Test user updates with validation
- Test message sending and conversation creation

### Integration Tests:
- Test complete user management workflow
- Test bulk operations with multiple users
- Test error handling for all operations
- Test real-time updates after operations

### Manual Testing:
- Test search performance with large datasets
- Test user creation with duplicate emails
- Test message delivery and notifications
- Test bulk operations with edge cases

## 📝 Notes

1. **Admin User ID**: Need to get admin user ID from auth context for messaging
2. **Status Field**: May need to add status field to profiles table or create separate table
3. **Permissions**: Verify admin user has proper permissions for all operations
4. **Error Handling**: Ensure all operations have proper error handling and user feedback
5. **Performance**: Consider pagination for large user lists and search results
6. **Total Spent Calculation**: Critical fix - currently showing 0 due to incorrect field mapping
7. **Payment Status**: Only count bookings with 'paid' status in totals
8. **Database Fields**: Use total_paid, price, and net_amount fields correctly

## 🎉 Expected Outcome

After completing this implementation plan, the user-management module will be **100% complete** with:
- Real-time data integration for all features
- No mock data remaining
- Full CRUD operations working with Supabase
- Real messaging system integrated
- Bulk operations fully functional
- Comprehensive error handling and user feedback

The module will provide a complete, production-ready user management system for the SPACEL admin panel.
