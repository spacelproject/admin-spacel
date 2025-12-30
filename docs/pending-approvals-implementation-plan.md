# Pending Approvals Feature Implementation Plan

## 🎯 Overview

This document outlines the implementation plan for converting the `PendingApprovals` component from mock data to real database integration, completing the dashboard-overview functionality.

## 📋 Current Status

- **Component**: `src/pages/dashboard-overview/components/PendingApprovals.jsx`
- **Status**: Using hardcoded mock data
- **Priority**: High (last remaining mock data in dashboard)
- **Estimated Time**: 2-3 hours

## 🗂️ Data Sources Analysis

### Available Tables for Pending Items

1. **Listings** (`listings` table)
   - Status: `pending` → needs approval
   - Fields: `id`, `name`, `description`, `partner_id`, `created_at`, `status`
   - Related: `profiles` table for partner info

2. **Support Tickets** (`support_tickets` table)
   - Status: `open` → needs attention
   - Fields: `id`, `subject`, `description`, `user_id`, `priority`, `created_at`
   - Related: `profiles` table for user info

3. **Content Management** (Multiple tables)
   - `announcements`: Status `draft` → needs publishing
   - `documentation`: Status `draft` → needs review
   - `legal_pages`: Status `draft` → needs approval

4. **User Verifications** (`profiles` table)
   - Partners needing verification
   - Phone verification status
   - Company verification

## 🔧 Implementation Plan

### Phase 1: Create usePendingApprovals Hook

**File**: `src/hooks/usePendingApprovals.js`

#### Hook Structure
```javascript
export const usePendingApprovals = () => {
  const [pendingItems, setPendingItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Fetch all pending items from different sources
  const fetchPendingItems = async () => {
    // Implementation details below
  }
  
  // Approval actions
  const approveItem = async (itemId, itemType) => {
    // Implementation details below
  }
  
  const rejectItem = async (itemId, itemType, reason) => {
    // Implementation details below
  }
  
  return {
    pendingItems,
    loading,
    error,
    approveItem,
    rejectItem,
    refetch: fetchPendingItems
  }
}
```

#### Database Queries Required

1. **Pending Listings**
```sql
SELECT 
  l.id,
  l.name,
  l.description,
  l.created_at,
  l.status,
  p.first_name,
  p.last_name,
  p.avatar_url,
  'space' as type,
  'high' as priority
FROM listings l
JOIN profiles p ON l.partner_id = p.id
WHERE l.status = 'pending'
ORDER BY l.created_at DESC
LIMIT 10;
```

2. **Pending Support Tickets**
```sql
SELECT 
  st.id,
  st.subject as title,
  st.description,
  st.created_at,
  st.priority,
  p.first_name,
  p.last_name,
  p.avatar_url,
  'support_ticket' as type
FROM support_tickets st
JOIN profiles p ON st.user_id = p.id
WHERE st.status = 'open'
ORDER BY st.created_at DESC
LIMIT 5;
```

3. **Pending Content**
```sql
-- Announcements
SELECT 
  id,
  title,
  content as description,
  created_at,
  'content' as type,
  'medium' as priority,
  'Admin Team' as author_name,
  NULL as avatar_url
FROM announcements
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 3;

-- Documentation
SELECT 
  id,
  title,
  content as description,
  created_at,
  'content' as type,
  'medium' as priority,
  'Support Team' as author_name,
  NULL as avatar_url
FROM documentation
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 3;

-- Legal Pages
SELECT 
  id,
  title,
  content as description,
  created_at,
  'content' as type,
  'high' as priority,
  'Legal Team' as author_name,
  NULL as avatar_url
FROM legal_pages
WHERE status = 'draft'
ORDER BY created_at DESC
LIMIT 3;
```

4. **Pending User Verifications**
```sql
SELECT 
  id,
  CONCAT(first_name, ' ', last_name) as title,
  'Business Account Verification' as description,
  created_at,
  'user' as type,
  'normal' as priority,
  first_name,
  last_name,
  avatar_url
FROM profiles
WHERE role = 'partner' 
  AND (is_phone_verified = false OR company_name IS NULL)
ORDER BY created_at DESC
LIMIT 5;
```

### Phase 2: Approval Actions Implementation

#### Approve Item Function
```javascript
const approveItem = async (itemId, itemType) => {
  try {
    switch (itemType) {
      case 'space':
        await supabase
          .from('listings')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('id', itemId)
        break
        
      case 'support_ticket':
        await supabase
          .from('support_tickets')
          .update({ status: 'resolved', resolved_at: new Date().toISOString() })
          .eq('id', itemId)
        break
        
      case 'content':
        // Determine content type and update accordingly
        await supabase
          .from('announcements') // or documentation, legal_pages
          .update({ status: 'published', published_at: new Date().toISOString() })
          .eq('id', itemId)
        break
        
      case 'user':
        await supabase
          .from('profiles')
          .update({ is_phone_verified: true, updated_at: new Date().toISOString() })
          .eq('id', itemId)
        break
    }
    
    // Refresh pending items
    await fetchPendingItems()
    
    // Show success notification
    console.log(`✅ Approved: ${itemType} ${itemId}`)
    
  } catch (error) {
    console.error('Error approving item:', error)
    throw error
  }
}
```

#### Reject Item Function
```javascript
const rejectItem = async (itemId, itemType, reason) => {
  try {
    switch (itemType) {
      case 'space':
        await supabase
          .from('listings')
          .update({ 
            status: 'rejected', 
            moderation_notes: reason,
            updated_at: new Date().toISOString() 
          })
          .eq('id', itemId)
        break
        
      case 'support_ticket':
        await supabase
          .from('support_tickets')
          .update({ 
            status: 'closed',
            resolved_at: new Date().toISOString() 
          })
          .eq('id', itemId)
        break
        
      case 'content':
        await supabase
          .from('announcements') // or documentation, legal_pages
          .update({ 
            status: 'archived',
            updated_at: new Date().toISOString() 
          })
          .eq('id', itemId)
        break
        
      case 'user':
        // Could add a rejection reason or flag
        await supabase
          .from('profiles')
          .update({ 
            updated_at: new Date().toISOString() 
          })
          .eq('id', itemId)
        break
    }
    
    // Refresh pending items
    await fetchPendingItems()
    
    // Show success notification
    console.log(`❌ Rejected: ${itemType} ${itemId}`)
    
  } catch (error) {
    console.error('Error rejecting item:', error)
    throw error
  }
}
```

### Phase 3: Update PendingApprovals Component

**File**: `src/pages/dashboard-overview/components/PendingApprovals.jsx`

#### Key Changes
1. Replace mock data with `usePendingApprovals` hook
2. Update approval/rejection handlers to use real functions
3. Add proper error handling and loading states
4. Implement real-time updates

#### Component Updates
```javascript
import React from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../../components/AppIcon'
import Image from '../../../components/AppImage'
import Button from '../../../components/ui/Button'
import { usePendingApprovals } from '../../../hooks/usePendingApprovals'

const PendingApprovals = () => {
  const navigate = useNavigate()
  const { pendingItems, loading, error, approveItem, rejectItem } = usePendingApprovals()

  const handleApprove = async (id, type) => {
    try {
      await approveItem(id, type)
      // Toast notification could be added here
    } catch (error) {
      console.error('Failed to approve item:', error)
      // Error notification could be added here
    }
  }

  const handleReject = async (id, type) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (reason) {
      try {
        await rejectItem(id, type, reason)
        // Toast notification could be added here
      } catch (error) {
        console.error('Failed to reject item:', error)
        // Error notification could be added here
      }
    }
  }

  // Rest of component implementation...
}
```

### Phase 4: Real-time Updates

#### Supabase Subscriptions
```javascript
const setupRealtimeSubscription = () => {
  // Subscribe to listing changes
  const listingsSubscription = supabase
    .channel('pending_listings_changes')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'listings' },
      (payload) => {
        if (payload.new.status === 'pending') {
          fetchPendingItems()
        }
      }
    )
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'listings' },
      (payload) => {
        fetchPendingItems()
      }
    )
    .subscribe()

  // Subscribe to support ticket changes
  const ticketsSubscription = supabase
    .channel('pending_tickets_changes')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'support_tickets' },
      (payload) => {
        if (payload.new.status === 'open') {
          fetchPendingItems()
        }
      }
    )
    .subscribe()

  // Cleanup subscriptions
  return () => {
    listingsSubscription.unsubscribe()
    ticketsSubscription.unsubscribe()
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
1. Test `usePendingApprovals` hook
2. Test approval/rejection functions
3. Test error handling scenarios

### Integration Tests
1. Test real-time updates
2. Test database queries
3. Test component rendering with real data

### Manual Testing
1. Create test pending items in database
2. Test approval/rejection workflows
3. Verify real-time updates work
4. Test error scenarios

## 📊 Database Schema Considerations

### Additional Fields Needed
Some tables might need additional fields for better admin functionality:

1. **Listings Table**
   - `moderation_notes` (already exists)
   - `approved_by` (admin who approved)
   - `approved_at` (timestamp)

2. **Support Tickets Table**
   - `assigned_to` (already exists)
   - `resolution_notes`
   - `resolved_at` (already exists)

3. **Content Tables**
   - `reviewed_by` (admin who reviewed)
   - `reviewed_at` (timestamp)
   - `review_notes`

## 🚀 Implementation Steps

### Step 1: Create the Hook (30 minutes)
1. Create `src/hooks/usePendingApprovals.js`
2. Implement database queries
3. Add approval/rejection functions
4. Add error handling

### Step 2: Update Component (45 minutes)
1. Replace mock data with hook
2. Update event handlers
3. Add loading/error states
4. Test component functionality

### Step 3: Add Real-time Updates (30 minutes)
1. Implement Supabase subscriptions
2. Test real-time functionality
3. Add cleanup logic

### Step 4: Testing & Refinement (30 minutes)
1. Test all approval workflows
2. Verify error handling
3. Test real-time updates
4. Performance optimization

## 📝 Documentation Updates

### Files to Update
1. `docs/database-schema.md` - Add admin-specific fields
2. `docs/existing-schema-analysis.md` - Update with new findings
3. `README.md` - Update feature completion status

### New Documentation
1. `docs/pending-approvals-api.md` - API documentation
2. `docs/admin-workflows.md` - Admin approval workflows

## 🎯 Success Criteria

- [ ] All mock data removed from PendingApprovals component
- [ ] Real database integration working
- [ ] Approval/rejection actions functional
- [ ] Real-time updates working
- [ ] Error handling implemented
- [ ] Loading states working
- [ ] Component responsive and accessible
- [ ] Documentation updated
- [ ] Tests passing

## 🔄 Future Enhancements

1. **Bulk Actions**: Approve/reject multiple items at once
2. **Advanced Filtering**: Filter by type, priority, date range
3. **Audit Trail**: Track all approval actions
4. **Notifications**: Email notifications for approvals
5. **Workflow Automation**: Auto-approve based on criteria
6. **Analytics**: Approval metrics and reporting

---

**Estimated Total Time**: 2-3 hours
**Priority**: High (completes dashboard functionality)
**Dependencies**: None (all required tables exist)
