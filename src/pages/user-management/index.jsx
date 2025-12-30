import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import NotificationBell from '../../components/NotificationBell';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import UserFilters from './components/UserFilters';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import UserSearchBar from './components/UserSearchBar';
import UserTable from './components/UserTable';
import UserProfileModal from './components/UserProfileModal';
import AddUserModal from './components/AddUserModal';
import EditUserModal from './components/EditUserModal';
import MessageModal from './components/MessageModal';
import BulkRoleChangeModal from './components/BulkRoleChangeModal';
import BulkMessageModal from './components/BulkMessageModal';
import ExportModal from './components/ExportModal';
import ImportUsersModal from './components/ImportUsersModal';
import DuplicateUsersModal from './components/DuplicateUsersModal';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useUsers } from '../../hooks/useUsers';
import LoadingState from '../../components/ui/LoadingState';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useSidebar } from '../../contexts/SidebarContext';
import SuspendUserBookingWarningModal from './components/SuspendUserBookingWarningModal';
import DisablePayoutModal from './components/DisablePayoutModal';

const UserManagement = () => {
  const { users, loading, error, updateUser, deleteUser, getUserStats, fetchUsers, updateUserInList, addUserToList, togglePayoutDisabled } = useUsers();
  const { user: adminUser } = useAuth();
  const { showToast } = useToast();
  const { isExpanded } = useSidebar();
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendTargetUser, setSuspendTargetUser] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendReasonPreset, setSuspendReasonPreset] = useState('');
  const [isUserBookingWarningOpen, setIsUserBookingWarningOpen] = useState(false);
  const [userBookingWarningData, setUserBookingWarningData] = useState({ user: null, bookings: [], reason: null });

  const suspensionReasonOptions = [
    { value: '', label: 'Choose a reason (optional)' },
    { value: 'Violation of platform policies', label: 'Violation of platform policies' },
    { value: 'Fraud / suspicious activity', label: 'Fraud / suspicious activity' },
    { value: 'Spam / misuse of features', label: 'Spam / misuse of features' },
    { value: 'Payment disputes / chargeback abuse', label: 'Payment disputes / chargeback abuse' },
    { value: 'Content violations', label: 'Content violations' },
    { value: 'Safety / trust concerns', label: 'Safety / trust concerns' },
    { value: 'Identity / verification issue', label: 'Identity / verification issue' },
    { value: 'Duplicate accounts / policy breach', label: 'Duplicate accounts / policy breach' },
    { value: 'other', label: 'Other (write custom reason)' }
  ];
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isBulkRoleModalOpen, setIsBulkRoleModalOpen] = useState(false);
  const [isBulkMessageModalOpen, setIsBulkMessageModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDisablePayoutModalOpen, setIsDisablePayoutModalOpen] = useState(false);
  const [payoutTargetUser, setPayoutTargetUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTogglingPayout, setIsTogglingPayout] = useState(false);

  // Real users data is now fetched from useUsers hook
  useEffect(() => {
    setFilteredUsers(users);
  }, [users]);

  // Mock users data (keeping for reference)
  const mockUsers = [
    {
      id: 'USR001',
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+1 (555) 123-4567',
      userType: 'partner',
      status: 'active',
      registrationDate: '2024-01-15T10:30:00Z',
      lastActivity: '2025-01-16T14:22:00Z',
      location: 'New York, NY',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      totalBookings: 15,
      totalSpent: '2340'
    },
    {
      id: 'USR002',
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      phone: '+1 (555) 234-5678',
      userType: 'seeker',
      status: 'active',
      registrationDate: '2024-02-20T09:15:00Z',
      lastActivity: '2025-01-17T11:45:00Z',
      location: 'Los Angeles, CA',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e0d9b0?w=150&h=150&fit=crop&crop=face',
      totalBookings: 8,
      totalSpent: '1240'
    },
    {
      id: 'USR003',
      name: 'Michael Brown',
      email: 'michael.brown@email.com',
      phone: '+1 (555) 345-6789',
      userType: 'partner',
      status: 'suspended',
      registrationDate: '2024-03-10T16:45:00Z',
      lastActivity: '2025-01-10T08:30:00Z',
      location: 'Chicago, IL',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      totalBookings: 22,
      totalSpent: '3450'
    },
    {
      id: 'USR004',
      name: 'Emily Davis',
      email: 'emily.davis@email.com',
      phone: '+1 (555) 456-7890',
      userType: 'seeker',
      status: 'active',
      registrationDate: '2024-04-05T12:20:00Z',
      lastActivity: '2025-01-17T16:10:00Z',
      location: 'Houston, TX',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      totalBookings: 5,
      totalSpent: '890'
    },
    {
      id: 'USR005',
      name: 'David Wilson',
      email: 'david.wilson@email.com',
      phone: '+1 (555) 567-8901',
      userType: 'partner',
      status: 'pending',
      registrationDate: '2024-05-12T14:30:00Z',
      lastActivity: '2025-01-15T13:25:00Z',
      location: 'Phoenix, AZ',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      totalBookings: 0,
      totalSpent: '0'
    },
    {
      id: 'USR006',
      name: 'Lisa Anderson',
      email: 'lisa.anderson@email.com',
      phone: '+1 (555) 678-9012',
      userType: 'seeker',
      status: 'active',
      registrationDate: '2024-06-18T11:15:00Z',
      lastActivity: '2025-01-17T09:40:00Z',
      location: 'Philadelphia, PA',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
      totalBookings: 12,
      totalSpent: '1890'
    },
    {
      id: 'USR007',
      name: 'Robert Taylor',
      email: 'robert.taylor@email.com',
      phone: '+1 (555) 789-0123',
      userType: 'partner',
      status: 'active',
      registrationDate: '2024-07-22T15:45:00Z',
      lastActivity: '2025-01-16T17:20:00Z',
      location: 'San Antonio, TX',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
      totalBookings: 18,
      totalSpent: '2780'
    },
    {
      id: 'USR008',
      name: 'Jennifer Martinez',
      email: 'jennifer.martinez@email.com',
      phone: '+1 (555) 890-1234',
      userType: 'seeker',
      status: 'inactive',
      registrationDate: '2024-08-30T10:00:00Z',
      lastActivity: '2024-12-20T14:15:00Z',
      location: 'San Diego, CA',
      avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
      totalBookings: 3,
      totalSpent: '450'
    }
  ];

  // Users are now fetched from useUsers hook

  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered?.filter(user =>
        user?.name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
        user?.email?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
        user?.id?.toLowerCase()?.includes(searchTerm?.toLowerCase())
      );
    }

    // Apply advanced filters
    if (filters?.userType) {
      filtered = filtered?.filter(user => user?.role === filters?.userType);
    }

    if (filters?.status) {
      filtered = filtered?.filter(user => user?.status === filters?.status);
    }

    if (filters?.location) {
      filtered = filtered?.filter(user => 
        user?.location?.toLowerCase()?.includes(filters?.location?.toLowerCase())
      );
    }

    if (filters?.registrationDateFrom) {
      filtered = filtered?.filter(user => 
        new Date(user.joinedDate) >= new Date(filters.registrationDateFrom)
      );
    }

    if (filters?.registrationDateTo) {
      filtered = filtered?.filter(user => 
        new Date(user.joinedDate) <= new Date(filters.registrationDateTo)
      );
    }

    if (filters?.lastActivityFrom) {
      filtered = filtered?.filter(user => 
        new Date(user.lastActive) >= new Date(filters.lastActivityFrom)
      );
    }

    if (filters?.lastActivityTo) {
      filtered = filtered?.filter(user => 
        new Date(user.lastActive) <= new Date(filters.lastActivityTo)
      );
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [searchTerm, filters, users]);

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleUserSelect = (userId, isSelected) => {
    if (isSelected) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev?.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (isSelected) => {
    if (isSelected) {
      setSelectedUsers(filteredUsers?.map(user => user?.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleBulkAction = async (actionId) => {
    if (selectedUsers.length === 0) {
      showToast('Please select at least one user', 'warning');
      return;
    }
    
    try {
      switch (actionId) {
        case 'activate':
          await bulkActivateUsers(selectedUsers);
          setSelectedUsers([]);
          break;
        case 'suspend':
          await bulkSuspendUsers(selectedUsers);
          setSelectedUsers([]);
          break;
        case 'delete':
          await bulkDeleteUsers(selectedUsers);
          setSelectedUsers([]);
          break;
        case 'message':
          await bulkMessageUsers(selectedUsers);
          // Don't clear selection - modal will handle it
          break;
        case 'role':
          await bulkChangeRole(selectedUsers);
          // Don't clear selection - modal will handle it
          break;
        default:
          showToast(`Unknown bulk action: ${actionId}`, 'error');
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      showToast(`Bulk action failed: ${error.message}`, 'error');
    }
  };

  // Helper function to log status change to audit trail
  const logStatusChange = async (userId, oldStatus, newStatus, reason = null) => {
    try {
      await supabase
        .from('user_status_history')
        .insert({
          user_id: userId,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: adminUser?.id,
          reason: reason,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging status change:', error);
      // Don't throw - this is non-critical
    }
  };

  const bulkActivateUsers = async (userIds) => {
    try {
      setIsProcessing(true);
      
      // Get current statuses before update
      const { data: currentUsers } = await supabase
        .from('profiles')
        .select('id, status')
        .in('id', userIds);
      
      // Update status in database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .in('id', userIds);
      
      if (error) throw error;
      
      // Log to audit trail
      for (const currentUser of currentUsers || []) {
        await logStatusChange(
          currentUser.id,
          currentUser.status || 'unknown',
          'active',
          'Bulk activation by admin'
        );
      }
      
      // Optimistically update users in the list (useUsers owns state)
      for (const id of userIds) {
        updateUserInList({ id, status: 'active' });
      }
      
      showToast(`Successfully activated ${userIds.length} user(s)`, 'success');
    } catch (error) {
      console.error('Error activating users:', error);
      showToast(`Error activating users: ${error.message}`, 'error');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const bulkSuspendUsers = async (userIds) => {
    try {
      setIsProcessing(true);
      
      // Get current statuses before update
      const { data: currentUsers } = await supabase
        .from('profiles')
        .select('id, status')
        .in('id', userIds);
      
      // Update status in database
      const { error } = await supabase
        .from('profiles')
        .update({ 
          status: 'suspended',
          updated_at: new Date().toISOString()
        })
        .in('id', userIds);
      
      if (error) throw error;
      
      // Log to audit trail
      for (const currentUser of currentUsers || []) {
        await logStatusChange(
          currentUser.id,
          currentUser.status || 'unknown',
          'suspended',
          'Bulk suspension by admin'
        );
      }
      
      // Optimistically update users in the list (useUsers owns state)
      for (const id of userIds) {
        updateUserInList({ id, status: 'suspended' });
      }
      
      showToast(`Successfully suspended ${userIds.length} user(s)`, 'success');
    } catch (error) {
      console.error('Error suspending users:', error);
      showToast(`Error suspending users: ${error.message}`, 'error');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const bulkDeleteUsers = async (userIds, hardDelete = false) => {
    try {
      setIsProcessing(true);
      
      const action = hardDelete ? 'permanently delete' : 'soft delete';
      const confirmed = window.confirm(
        `Are you sure you want to ${action} ${userIds.length} user(s)?${hardDelete ? ' This action cannot be undone.' : ''}`
      );
      
      if (!confirmed) {
        setIsProcessing(false);
        return;
      }

      if (hardDelete) {
        // Hard delete - remove from auth (this will cascade to profiles due to foreign key)
      const { error: authError } = await supabase.auth.admin.deleteUsers(userIds);
      
      if (authError) throw authError;
      
        // Refresh list (useUsers owns state)
        await fetchUsers();
        
        showToast(`Successfully permanently deleted ${userIds.length} user(s)`, 'success');
      } else {
        // Soft delete - mark as deleted
        const { error } = await supabase
          .from('profiles')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: adminUser?.id,
            status: 'inactive',
            updated_at: new Date().toISOString()
          })
          .in('id', userIds);

        if (error) throw error;

        // Log to audit trail
        for (const userId of userIds) {
          const user = users.find(u => u.id === userId);
          await logStatusChange(
            userId,
            user?.status || 'active',
            'inactive',
            'Soft deleted by admin'
          );
        }

        // Refresh list (useUsers owns state)
        await fetchUsers();
        
        showToast(`Successfully soft deleted ${userIds.length} user(s)`, 'success');
      }
      
      // Note: Real-time subscription will handle the full sync
    } catch (error) {
      console.error('Error deleting users:', error);
      showToast(`Error deleting users: ${error.message}`, 'error');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async (exportOptions) => {
    let userIdsToExport = [];
    
    if (exportOptions.scope === 'selected') {
      userIdsToExport = selectedUsers;
    } else if (exportOptions.scope === 'filtered') {
      userIdsToExport = filteredUsers?.map(u => u.id) || [];
    } else {
      userIdsToExport = users?.map(u => u.id) || [];
    }

    if (userIdsToExport.length === 0) {
      showToast('No users to export', 'warning');
      return;
    }

    await bulkExportUsers(userIdsToExport, exportOptions);
  };

  const bulkExportUsers = async (userIds, exportOptions) => {
    const format = exportOptions?.format || 'csv';
    try {
      setIsProcessing(true);
      const { exportData } = await import('../../utils/exportUtils');
      const selectedUserData = users?.filter(user => userIds.includes(user.id));
      
      // Prepare user data for export based on selected fields
      const includeFields = exportOptions?.includeFields || {};
      const exportDataArray = selectedUserData.map(user => {
        const row = {};
        
        if (includeFields.id) row['ID'] = user.id;
        if (includeFields.name) row['Name'] = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
        if (includeFields.email) row['Email'] = user.email || 'N/A';
        if (includeFields.role) row['Role'] = user.role || 'N/A';
        if (includeFields.status) row['Status'] = user.status || 'N/A';
        if (includeFields.phone) {
          row['Phone'] = user.phone || 'N/A';
          row['Phone Verified'] = user.isPhoneVerified ? 'Yes' : 'No';
        }
        if (includeFields.bookings) row['Total Bookings'] = user.totalBookings || 0;
        if (includeFields.earnings) {
          row['Total Spent/Earnings'] = user.role === 'partner' ? (user.totalEarnings || 0) : (user.totalSpent || 0);
        }
        if (includeFields.dates) {
          row['Joined Date'] = user.joinedDate || user.createdAt || 'N/A';
          row['Last Active'] = user.lastActive || 'N/A';
        }
        
        return row;
      });
      
      const fileName = `users_export_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'json') {
        // Export as JSON
        const jsonContent = JSON.stringify(exportDataArray, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        showToast(`Successfully exported ${userIds.length} user(s) to JSON`, 'success');
      } else {
        const result = await exportData(exportDataArray, fileName, format, {
          title: 'User Export Report',
          sheetName: 'Users'
        });
        
        if (result.success) {
          showToast(`Successfully exported ${userIds.length} user(s) to ${format.toUpperCase()}`, 'success');
        } else {
          throw new Error(result.error || 'Export failed');
        }
      }
    } catch (error) {
      console.error('Error exporting users:', error);
      showToast(`Error exporting users: ${error.message}`, 'error');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  const bulkMessageUsers = async (userIds) => {
    if (userIds.length === 0) return;
    setIsBulkMessageModalOpen(true);
  };

  const bulkChangeRole = async (userIds) => {
    if (userIds.length === 0) return;
    setIsBulkRoleModalOpen(true);
  };

  const bulkVerifyUsers = async (userIds, type) => {
    try {
      setIsProcessing(true);
      
      const field = type === 'phone' ? 'is_phone_verified' : 'email_verified';
      const fieldName = type === 'phone' ? 'phone' : 'email';
      
      // Update verification status
      const { error } = await supabase
        .from('profiles')
        .update({
          [field]: true,
          updated_at: new Date().toISOString()
        })
        .in('id', userIds);

      if (error) throw error;

      // If verifying email, also update auth.users
      if (type === 'email') {
        for (const userId of userIds) {
          try {
            await supabase.auth.admin.updateUserById(userId, {
              email_confirm: true
            });
          } catch (authError) {
            console.warn(`Error updating auth email for user ${userId}:`, authError);
            // Continue with other users
          }
        }
      }

      // Optimistically update verification status in the list (useUsers owns state)
      for (const id of userIds) {
        updateUserInList({
          id,
          ...(fieldName === 'phone' ? { isPhoneVerified: true } : {})
        });
      }
      
      showToast(`Successfully verified ${fieldName} for ${userIds.length} user(s)`, 'success');
    } catch (error) {
      console.error('Error verifying users:', error);
      showToast(`Error verifying users: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Phone', 'Company', 'Total Bookings', 'Total Spent/Earnings', 'Joined Date'];
    const csvRows = [headers.join(',')];
    
    data.forEach(user => {
      const row = [
        user.id,
        `"${user.name}"`,
        user.email,
        user.role,
        user.status,
        user.phone || '',
        user.company || '',
        user.totalBookings || 0,
        user.role === 'partner' ? user.totalEarnings || 0 : user.totalSpent || 0,
        user.joinedDate || ''
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  };

  const handleUserAction = async (action, user) => {
    console.log(`User action: ${action} for user:`, user?.id);
    
    switch (action) {
      case 'view':
        setSelectedUser(user);
        setIsProfileModalOpen(true);
        break;
      case 'edit':
        setSelectedUser(user);
        setIsEditUserModalOpen(true);
        break;
      case 'message':
        setSelectedUser(user);
        setIsMessageModalOpen(true);
        break;
      case 'suspend':
        setSuspendTargetUser(user);
        setSuspendReason(user?.suspension_reason || '');
        setSuspendReasonPreset('');
        setIsSuspendModalOpen(true);
        break;
      case 'activate':
        {
          const confirmed = window.confirm('Confirm reinstate this user and send email immediately?');
          if (!confirmed) return;
          await updateUserStatus(user.id, user.status || 'suspended', 'active');
        }
        break;
      case 'toggle-payout':
        if (user.role !== 'partner') {
          showToast('Payout management is only available for partners', 'warning');
          return;
        }
        setPayoutTargetUser(user);
        setIsDisablePayoutModalOpen(true);
        break;
      default:
        break;
    }
  };

  const handleConfirmSuspend = async () => {
    if (!suspendTargetUser) return;
    if (!suspendReason || !suspendReason.trim()) {
      showToast('Suspension reason is required', 'error');
      return;
    }

    // Check for incomplete bookings (pending/confirmed/active) before suspending user
    try {
      setIsProcessing(true);
      const userId = suspendTargetUser.id;
      const statuses = ['pending', 'confirmed', 'active'];

      const [seekerRes, partnerRes] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, booking_reference, start_time, end_time, status')
          .eq('seeker_id', userId)
          .in('status', statuses)
          .order('start_time', { ascending: true })
          .limit(10),
        supabase
          .from('bookings')
          .select('id, booking_reference, start_time, end_time, status, listings!inner(partner_id)')
          .eq('listings.partner_id', userId)
          .in('status', statuses)
          .order('start_time', { ascending: true })
          .limit(10)
      ]);

      const seekerBookings = seekerRes?.data || [];
      const partnerBookings = partnerRes?.data || [];

      const mergedMap = new Map();
      [...seekerBookings, ...partnerBookings].forEach((b) => {
        if (b?.id) mergedMap.set(b.id, b);
      });
      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        const aT = a?.start_time ? new Date(a.start_time).getTime() : 0;
        const bT = b?.start_time ? new Date(b.start_time).getTime() : 0;
        return aT - bT;
      });

      if (merged.length > 0) {
        setIsSuspendModalOpen(false);
        setUserBookingWarningData({ user: suspendTargetUser, bookings: merged.slice(0, 10), reason: suspendReason.trim() });
        setIsUserBookingWarningOpen(true);
        return;
      }
    } catch (err) {
      console.warn('Error checking bookings before suspension:', err);
      // If check fails, fall back to normal confirm flow
    } finally {
      setIsProcessing(false);
    }

    const confirmed = window.confirm('Confirm suspend this user and send email immediately?');
    if (!confirmed) return;

    await updateUserStatus(suspendTargetUser.id, suspendTargetUser.status || 'active', 'suspended', suspendReason.trim());

    setIsSuspendModalOpen(false);
    setSuspendTargetUser(null);
    setSuspendReason('');
    setSuspendReasonPreset('');
  };

  const updateUserStatus = async (userId, oldStatus, newStatus, reason = null) => {
    try {
      setIsProcessing(true);
      const nowIso = new Date().toISOString();
      
      // Update status in database
      const updatePayload = {
        status: newStatus,
        updated_at: nowIso
      };

      if (newStatus === 'suspended') {
        updatePayload.suspended_at = nowIso;
        updatePayload.suspended_by = adminUser?.id || null;
        updatePayload.suspension_reason = reason;
      } else if (newStatus === 'active') {
        updatePayload.suspended_at = null;
        updatePayload.suspended_by = null;
        updatePayload.suspension_reason = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId);
      
      if (error) throw error;
      
      // Log to audit trail
      await logStatusChange(userId, oldStatus, newStatus, reason);

      // Send email notification immediately (suspend/unsuspend)
      try {
        if (newStatus === 'suspended') {
          const { error: fnError } = await supabase.functions.invoke('send-suspension-email', {
            body: {
              userId,
              suspensionReason: reason,
              suspendedBy: adminUser?.id || null,
              suspendedAt: nowIso
            }
          });
          if (fnError) {
            console.error('Error sending suspension email:', fnError);
            showToast('User suspended, but email failed to send', 'warning');
          }
        } else if (newStatus === 'active') {
          const { error: fnError } = await supabase.functions.invoke('send-reinstatement-email', {
            body: {
              userId,
              reinstatedAt: nowIso
            }
          });
          if (fnError) {
            console.error('Error sending reinstatement email:', fnError);
            showToast('User reinstated, but email failed to send', 'warning');
          }
        }
      } catch (emailErr) {
        console.error('Error invoking email function:', emailErr);
        showToast('Status updated, but email failed to send', 'warning');
      }
      
      // Optimistically update user status in the list (useUsers owns state)
      updateUserInList({
        id: userId,
        status: newStatus,
        suspension_reason: newStatus === 'suspended' ? reason : null
      });
      
      showToast(`User status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error('Error updating user status:', error);
      showToast(`Error updating user status: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateUser = async (updatedUser) => {
    // Optimistically update the user in the list without refetching
    // The real-time subscription will handle the full data sync
    updateUserInList(updatedUser);
  };

  const handleTogglePayout = async (userId, disabled, reason = null) => {
    try {
      setIsTogglingPayout(true);
      const result = await togglePayoutDisabled(userId, disabled, reason);
      
      if (result.success) {
        showToast(
          disabled 
            ? 'Payout requests disabled successfully' 
            : 'Payout requests enabled successfully',
          'success'
        );
        setIsDisablePayoutModalOpen(false);
        setPayoutTargetUser(null);
      } else {
        showToast(`Failed to ${disabled ? 'disable' : 'enable'} payout: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Error toggling payout:', error);
      showToast(`Error toggling payout: ${error.message}`, 'error');
    } finally {
      setIsTogglingPayout(false);
    }
  };

  const handleSendMessage = (messagePayload) => {
    console.log('Message sent:', messagePayload);
    // Here you would typically send the message to your backend
    // For now, we'll just log it
  };

  const handleUserClick = (user) => {
    setSelectedUser(user);
    setIsProfileModalOpen(true);
  };

  const handleAddUser = async (newUser) => {
    // Optimistically add the new user to the list
    // The real-time subscription will handle the full data sync
    addUserToList(newUser);
  };

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers?.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers?.length / usersPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
          <header className="h-header bg-header-background border-b border-header-border px-4 lg:px-6 flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
            </div>
            <div className="flex items-center space-x-3">
              <NotificationBell />
              <UserProfileDropdown />
            </div>
          </header>
          <main className="p-4 lg:p-6">
            <LoadingState message="Fetching user information..." />
          </main>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
          <header className="h-header bg-header-background border-b border-header-border px-4 lg:px-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-header-foreground">User Management</h1>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
            <UserProfileDropdown />
            </div>
          </header>
          <main className="p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex justify-center items-center min-h-[400px]">
                <div className="text-center">
                  <Icon name="AlertCircle" size={48} className="mx-auto mb-4 text-error" />
                  <p className="text-error font-medium mb-2">Error loading users</p>
                  <p className="text-muted-foreground text-sm">{error}</p>
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="outline" 
                    className="mt-4"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
        {/* Header */}
        <header className="sticky top-0 z-header header-modern">
          <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
          </div>
            <div className="flex items-center space-x-3">
            <NotificationBell />
          <UserProfileDropdown />
            </div>
          </div>
        </header>

        {/* Main Content */}
          <main className="p-4 lg:p-6 space-y-6 overflow-x-hidden">
            <div className="w-full mx-auto">
            <BreadcrumbNavigation />

            {/* Page Header */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 card-shadow mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Users</h2>
                  <p className="text-sm text-gray-600">
                    Manage platform users and their accounts
                  </p>
                </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      iconName="Users"
                      iconPosition="left"
                      onClick={() => setIsDuplicateModalOpen(true)}
                      className="flex-shrink-0"
                    >
                      Find Duplicates
                    </Button>
                    <Button
                      variant="outline"
                      iconName="Upload"
                      iconPosition="left"
                      onClick={() => setIsImportModalOpen(true)}
                      className="flex-shrink-0"
                    >
                      Import Users
                    </Button>
                <Button
                  variant="default"
                  iconName="UserPlus"
                  iconPosition="left"
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="flex-shrink-0"
                >
                  Add User
                </Button>
                    </div>
                  </div>
              </div>
            </div>

            {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
                <div className="metric-card">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2 truncate">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">{users?.length}</p>
                  </div>
                    <div className="icon-circle bg-blue-50 text-blue-600">
                      <Icon name="Users" size={20} />
                  </div>
                </div>
              </div>

                <div className="metric-card">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2 truncate">Active Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {users?.filter(u => u?.status === 'active')?.length}
                    </p>
                  </div>
                    <div className="icon-circle bg-blue-50 text-blue-600">
                      <Icon name="CheckCircle" size={20} />
                  </div>
                </div>
              </div>

                <div className="metric-card">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2 truncate">Partners</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {users?.filter(u => u?.role === 'partner')?.length}
                    </p>
                  </div>
                    <div className="icon-circle bg-blue-50 text-blue-600">
                      <Icon name="Building" size={20} />
                  </div>
                </div>
              </div>

                <div className="metric-card">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-2 truncate">Seekers</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {users?.filter(u => u?.role === 'seeker')?.length}
                    </p>
                  </div>
                    <div className="icon-circle bg-blue-50 text-blue-600">
                      <Icon name="User" size={20} />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <UserFilters
              onFiltersChange={handleFiltersChange}
              isExpanded={isFiltersExpanded}
              onToggle={() => setIsFiltersExpanded(!isFiltersExpanded)}
            />

            {/* Search and Bulk Actions */}
            <UserSearchBar
              onSearch={handleSearch}
              onBulkAction={handleBulkAction}
              selectedCount={selectedUsers?.length}
            />

            {/* Results Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 card-shadow mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm text-gray-600">
                  Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers?.length)} of {filteredUsers?.length} users
                </p>
                {selectedUsers?.length > 0 && (
                  <p className="text-sm text-blue-600 font-medium">
                    {selectedUsers?.length} user{selectedUsers?.length !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>
            </div>

            {/* Users Table */}
            <UserTable
              users={currentUsers}
              onUserSelect={handleUserSelect}
              onSelectAll={handleSelectAll}
              selectedUsers={selectedUsers}
              onUserAction={handleUserAction}
              onUserClick={handleUserClick}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-card rounded-lg border border-border p-4 card-shadow">
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="ChevronLeft"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  />
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)?.map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="ChevronRight"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      </div>
      
      {/* Modals */}
      <UserProfileModal
        user={selectedUser}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedUser(null);
        }}
        onTogglePayout={(user) => {
          setPayoutTargetUser(user);
          setIsDisablePayoutModalOpen(true);
        }}
      />
      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onAddUser={handleAddUser}
      />
      <EditUserModal
        isOpen={isEditUserModalOpen}
        onClose={() => {
          setIsEditUserModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onUpdateUser={handleUpdateUser}
      />
      <MessageModal
        isOpen={isMessageModalOpen}
        onClose={() => {
          setIsMessageModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onSendMessage={handleSendMessage}
      />
      <BulkRoleChangeModal
        isOpen={isBulkRoleModalOpen}
        onClose={() => {
          setIsBulkRoleModalOpen(false);
          setSelectedUsers([]);
        }}
        selectedUserIds={selectedUsers}
        users={users}
        onSuccess={(updatedUsers) => {
          // Optimistically update users in the list (useUsers owns state)
          for (const updated of updatedUsers || []) {
            if (updated?.id) updateUserInList({ id: updated.id, role: updated.role });
          }
          setSelectedUsers([]);
        }}
      />
      <BulkMessageModal
        isOpen={isBulkMessageModalOpen}
        onClose={() => {
          setIsBulkMessageModalOpen(false);
          setSelectedUsers([]);
        }}
        selectedUserIds={selectedUsers}
        users={users}
        onSuccess={() => {
          setSelectedUsers([]);
        }}
      />
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        selectedCount={selectedUsers.length}
        totalCount={filteredUsers?.length || 0}
      />
      <ImportUsersModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          // Import creates new users - real-time subscription will handle the update
          // No need to refetch, the INSERT event will trigger a fetch
        }}
      />
      <DuplicateUsersModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        users={users}
      />
      {isSuspendModalOpen && suspendTargetUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-modal p-4">
          <div className="bg-card rounded-lg shadow-modal w-full max-w-md">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Suspend User</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="X"
                  onClick={() => {
                    setIsSuspendModalOpen(false);
                    setSuspendTargetUser(null);
                    setSuspendReason('');
                  }}
                />
              </div>

              <div className="text-sm text-muted-foreground">
                Suspending: <span className="font-medium text-foreground">{suspendTargetUser.name}</span>
                <div className="text-xs text-muted-foreground">{suspendTargetUser.email}</div>
              </div>

              <Select
                label="Suggested Reason"
                options={suspensionReasonOptions}
                value={suspendReasonPreset}
                onChange={(value) => {
                  setSuspendReasonPreset(value);
                  // Auto-fill the reason input if it's currently empty.
                  // If "other" is selected, keep the input as-is so admin can type a custom reason.
                  if ((!suspendReason || !suspendReason.trim()) && value && value !== 'other') {
                    setSuspendReason(value);
                  }
                }}
                placeholder="Select a reason"
                disabled={isProcessing}
              />

              <Input
                label="Suspension Reason"
                type="text"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Type a reason (or pick a preset above)"
                required
                disabled={isProcessing}
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSuspendModalOpen(false);
                    setSuspendTargetUser(null);
                    setSuspendReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="warning"
                  iconName="Ban"
                  iconPosition="left"
                  onClick={handleConfirmSuspend}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Suspending...' : 'Suspend & Send Email'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <SuspendUserBookingWarningModal
        isOpen={isUserBookingWarningOpen}
        user={userBookingWarningData.user}
        bookings={userBookingWarningData.bookings}
        isProcessing={isProcessing}
        onCancel={() => {
          if (isProcessing) return;
          setIsUserBookingWarningOpen(false);
          setUserBookingWarningData({ user: null, bookings: [], reason: null });
          // Bring them back to the reason modal so they can adjust/cancel.
          setIsSuspendModalOpen(true);
        }}
        onProceed={async () => {
          if (!userBookingWarningData?.user?.id) return;
          const confirmed = window.confirm('Confirm suspend this user and send email immediately?');
          if (!confirmed) return;
          await updateUserStatus(
            userBookingWarningData.user.id,
            userBookingWarningData.user.status || 'active',
            'suspended',
            userBookingWarningData.reason || null
          );
          setIsUserBookingWarningOpen(false);
          setUserBookingWarningData({ user: null, bookings: [], reason: null });
          setSuspendTargetUser(null);
          setSuspendReason('');
          setSuspendReasonPreset('');
        }}
      />

      <DisablePayoutModal
        user={payoutTargetUser}
        isOpen={isDisablePayoutModalOpen}
        onClose={() => {
          setIsDisablePayoutModalOpen(false);
          setPayoutTargetUser(null);
        }}
        onConfirm={handleTogglePayout}
        isProcessing={isTogglingPayout}
      />
    </>
  );
};

export default UserManagement;