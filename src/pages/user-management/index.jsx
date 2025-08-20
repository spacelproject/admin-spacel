import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import UserFilters from './components/UserFilters';
import UserSearchBar from './components/UserSearchBar';
import UserTable from './components/UserTable';
import UserProfileModal from './components/UserProfileModal';
import AddUserModal from './components/AddUserModal';
import EditUserModal from './components/EditUserModal';
import MessageModal from './components/MessageModal';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  // Mock users data
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

  useEffect(() => {
    setUsers(mockUsers);
    setFilteredUsers(mockUsers);
  }, []);

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
      filtered = filtered?.filter(user => user?.userType === filters?.userType);
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
        new Date(user.registrationDate) >= new Date(filters.registrationDateFrom)
      );
    }

    if (filters?.registrationDateTo) {
      filtered = filtered?.filter(user => 
        new Date(user.registrationDate) <= new Date(filters.registrationDateTo)
      );
    }

    if (filters?.lastActivityFrom) {
      filtered = filtered?.filter(user => 
        new Date(user.lastActivity) >= new Date(filters.lastActivityFrom)
      );
    }

    if (filters?.lastActivityTo) {
      filtered = filtered?.filter(user => 
        new Date(user.lastActivity) <= new Date(filters.lastActivityTo)
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

  const handleBulkAction = (actionId) => {
    console.log(`Bulk action: ${actionId} for users:`, selectedUsers);
    // Implement bulk action logic here
    setSelectedUsers([]);
  };

  const handleUserAction = (action, user) => {
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
        // Update user status to suspended
        setUsers(prev => prev?.map(u => 
          u?.id === user?.id ? { ...u, status: 'suspended' } : u
        ));
        break;
      case 'activate':
        // Update user status to active
        setUsers(prev => prev?.map(u => 
          u?.id === user?.id ? { ...u, status: 'active' } : u
        ));
        break;
      default:
        break;
    }
  };

  const handleUpdateUser = (updatedUser) => {
    setUsers(prev => prev?.map(u => 
      u?.id === updatedUser?.id ? updatedUser : u
    ));
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

  const handleAddUser = (newUser) => {
    setUsers(prev => [newUser, ...prev]);
  };

  // Pagination
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers?.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers?.length / usersPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="lg:ml-sidebar">
        {/* Header */}
        <header className="h-header bg-header-background border-b border-header-border px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-header-foreground">User Management</h1>
          </div>
          <UserProfileDropdown />
        </header>

        {/* Main Content */}
        <main className="p-4 lg:p-6 space-y-6">
          <div className="max-w-7xl mx-auto">
            <BreadcrumbNavigation />

            {/* Page Header */}
            <div className="bg-card rounded-lg border border-border p-6 card-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Users</h2>
                  <p className="text-muted-foreground">
                    Manage platform users and their accounts
                  </p>
                </div>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <div className="bg-card border border-border rounded-lg p-6 card-shadow">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground truncate">Total Users</p>
                    <p className="text-2xl font-bold text-foreground">{users?.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="Users" size={24} className="text-primary" />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 card-shadow">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground truncate">Active Users</p>
                    <p className="text-2xl font-bold text-foreground">
                      {users?.filter(u => u?.status === 'active')?.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="CheckCircle" size={24} className="text-success" />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 card-shadow">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground truncate">Partners</p>
                    <p className="text-2xl font-bold text-foreground">
                      {users?.filter(u => u?.userType === 'partner')?.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="Building" size={24} className="text-accent" />
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 card-shadow">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground truncate">Seekers</p>
                    <p className="text-2xl font-bold text-foreground">
                      {users?.filter(u => u?.userType === 'seeker')?.length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name="User" size={24} className="text-secondary" />
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
            <div className="bg-card rounded-lg border border-border p-4 card-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers?.length)} of {filteredUsers?.length} users
                </p>
                {selectedUsers?.length > 0 && (
                  <p className="text-sm text-primary">
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
      {/* Modals */}
      <UserProfileModal
        user={selectedUser}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedUser(null);
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
    </div>
  );
};

export default UserManagement;