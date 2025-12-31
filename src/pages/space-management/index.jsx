import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import NotificationBell from '../../components/NotificationBell';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import SpaceStats from './components/SpaceStats';
import SpaceFilters from './components/SpaceFilters';
import BulkActionsBar from './components/BulkActionsBar';
import SpaceTable from './components/SpaceTable';
import SpaceDetailsModal from './components/SpaceDetailsModal';
import SuspendSpaceModal from './components/SuspendSpaceModal';
import SuspendSpaceBookingWarningModal from './components/SuspendSpaceBookingWarningModal';
import { supabase } from '../../lib/supabase';
import CategoryManagement from './components/CategoryManagement';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { ToastProvider } from '../../components/ui/Toast';
import { useSpaces } from './hooks/useSpaces';
import LoadingState from '../../components/ui/LoadingState';
import { useSidebar } from '../../contexts/SidebarContext';

const SpaceManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedSpaces, setSelectedSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [suspendTargetSpace, setSuspendTargetSpace] = useState(null);
  const [isSuspending, setIsSuspending] = useState(false);
  const [isBookingWarningOpen, setIsBookingWarningOpen] = useState(false);
  const [bookingWarningData, setBookingWarningData] = useState({ space: null, bookings: [], reason: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    category: 'all',
    location: '',
    priceRange: { min: '', max: '' },
    amenities: []
  });

  // Sidebar state
  const { isExpanded } = useSidebar();

  // Use the real data hook
  const {
    spaces,
    loading,
    error,
    refresh,
    updateSpaceStatus,
    bulkUpdateSpaces,
    getSpaceStats,
    filterSpaces,
    addSampleDataToDatabase,
    isUpdatingStatus,
    updatingSpaceId
  } = useSpaces();

  // Category management state - using default categories for now
  const [categories, setCategories] = useState([
    { id: 'office', name: 'Office Space', label: 'Office Space', subCategories: [
      { id: 'private_office', name: 'Private Office', label: 'Private Office' },
      { id: 'coworking', name: 'Coworking Space', label: 'Coworking Space' }
    ]},
    { id: 'retail', name: 'Retail Space', label: 'Retail Space', subCategories: [
      { id: 'storefront', name: 'Storefront', label: 'Storefront' },
      { id: 'popup_shop', name: 'Pop-up Shop', label: 'Pop-up Shop' }
    ]},
    { id: 'industrial', name: 'Industrial Space', label: 'Industrial Space', subCategories: [
      { id: 'warehouse', name: 'Warehouse', label: 'Warehouse' },
      { id: 'manufacturing', name: 'Manufacturing', label: 'Manufacturing' }
    ]},
    { id: 'hospitality', name: 'Hospitality Space', label: 'Hospitality Space', subCategories: [] },
    { id: 'healthcare', name: 'Healthcare Space', label: 'Healthcare Space', subCategories: [] },
    { id: 'mixed', name: 'Mixed Use Space', label: 'Mixed Use Space', subCategories: [] },
    { id: 'farm', name: 'Farm Space', label: 'Farm Space', subCategories: [] },
    { id: 'creative', name: 'Creative Space', label: 'Creative Space', subCategories: [] },
    { id: 'entertainment', name: 'Entertainment Space', label: 'Entertainment Space', subCategories: [
      { id: 'event_hall', name: 'Event Hall', label: 'Event Hall' },
      { id: 'meeting_room', name: 'Meeting Room', label: 'Meeting Room' }
    ]}
  ]);

  // Get filtered spaces based on current filters
  const filteredSpaces = filterSpaces(filters);

  // Get current page spaces
  const getCurrentPageSpaces = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSpaces.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredSpaces.length / itemsPerPage);

  // Get stats from the hook
  const stats = getSpaceStats();

  // Handle filter changes
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      category: 'all',
      location: '',
      priceRange: { min: '', max: '' },
      amenities: []
    });
    setCurrentPage(1);
  };

  const handleSelectSpace = (spaceId, checked) => {
    if (checked) {
      setSelectedSpaces([...selectedSpaces, spaceId]);
    } else {
      setSelectedSpaces(selectedSpaces?.filter(id => id !== spaceId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const currentPageSpaces = getCurrentPageSpaces();
      const currentPageIds = currentPageSpaces?.map(space => space?.id);
      const newSelected = [...new Set([...selectedSpaces, ...currentPageIds])];
      setSelectedSpaces(newSelected);
    } else {
      const currentPageSpaces = getCurrentPageSpaces();
      const currentPageIds = currentPageSpaces?.map(space => space?.id);
      setSelectedSpaces(selectedSpaces?.filter(id => !currentPageIds?.includes(id)));
    }
  };

  const handleClearSelection = () => {
    setSelectedSpaces([]);
  };

  // Handle bulk actions
  const handleBulkAction = async (action) => {
    if (selectedSpaces.length === 0) return;

    const newStatus = action === 'approve' ? 'active' : 
                     action === 'reject' ? 'rejected' :
                     action === 'suspend' ? 'suspended' : null;
    
    if (newStatus) {
      await bulkUpdateSpaces(selectedSpaces, newStatus);
      setSelectedSpaces([]);
    }
  };

  // Handle individual space actions
  const handleQuickAction = async (spaceId, action) => {
    if (isUpdatingStatus) return; // Prevent multiple clicks
    const newStatus = action === 'approve' ? 'active' : 'rejected';
    await updateSpaceStatus(spaceId, newStatus);
  };

  const handleViewDetails = (space) => {
    setSelectedSpace(space);
    setIsModalOpen(true);
    // Update URL to include listing parameter
    setSearchParams({ listing: space.id });
  };

  // Handle URL query parameter to open listing modal
  useEffect(() => {
    const listingId = searchParams.get('listing');
    if (listingId && spaces.length > 0 && !selectedSpace) {
      const space = spaces.find(s => s.id === listingId);
      if (space) {
        setSelectedSpace(space);
        setIsModalOpen(true);
      }
    }
  }, [searchParams, spaces, selectedSpace]);

  // Clean up URL when modal closes
  useEffect(() => {
    if (!isModalOpen && !selectedSpace) {
      const listingId = searchParams.get('listing');
      if (listingId) {
        setSearchParams({});
      }
    }
  }, [isModalOpen, selectedSpace, searchParams, setSearchParams]);

  const handleSuspendQuick = (space) => {
    setSuspendTargetSpace(space);
    setIsSuspendModalOpen(true);
  };

  const handleUnsuspendQuick = async (space) => {
    const confirmed = window.confirm(`Unsuspend "${space?.name}" and make it active again?`);
    if (!confirmed) return;
    await updateSpaceStatus(space.id, 'active');
  };

  const handleConfirmSuspendQuick = async (reason) => {
    if (!suspendTargetSpace) return;
    try {
      setIsSuspending(true);
      // Check for incomplete bookings before suspending
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, booking_reference, start_time, end_time, status')
        .eq('listing_id', suspendTargetSpace.id)
        .in('status', ['pending', 'confirmed', 'active'])
        .order('start_time', { ascending: true })
        .limit(10);

      if (bookings && bookings.length > 0) {
        setIsSuspendModalOpen(false);
        setBookingWarningData({ space: suspendTargetSpace, bookings, reason: reason || null });
        setIsBookingWarningOpen(true);
        return;
      }

      await updateSpaceStatus(suspendTargetSpace.id, 'suspended', reason || null);
      setIsSuspendModalOpen(false);
      setSuspendTargetSpace(null);
    } finally {
      setIsSuspending(false);
    }
  };

  // Handle modal actions
  const handleApprove = async (spaceId, note) => {
    if (isUpdatingStatus) return; // Prevent multiple clicks
    const result = await updateSpaceStatus(spaceId, 'active', note);
    if (result?.success) {
      setIsModalOpen(false);
      setSelectedSpace(null);
    }
  };

  const handleReject = async (spaceId, note) => {
    if (isUpdatingStatus) return; // Prevent multiple clicks
    const result = await updateSpaceStatus(spaceId, 'rejected', note);
    if (result?.success) {
      setIsModalOpen(false);
      setSelectedSpace(null);
    }
  };

  const handleSuspend = async (spaceId, note) => {
    try {
      setIsSuspending(true);
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, booking_reference, start_time, end_time, status')
        .eq('listing_id', spaceId)
        .in('status', ['pending', 'confirmed', 'active'])
        .order('start_time', { ascending: true })
        .limit(10);

      if (bookings && bookings.length > 0) {
        setIsModalOpen(false);
        setBookingWarningData({ space: { id: spaceId, name: selectedSpace?.name || 'Space' }, bookings, reason: note || null });
        setIsBookingWarningOpen(true);
        return;
      }

      await updateSpaceStatus(spaceId, 'suspended', note);
      setIsModalOpen(false);
      setSelectedSpace(null);
    } finally {
      setIsSuspending(false);
    }
  };

  const handleCategoriesUpdate = (updatedCategories) => {
    setCategories(updatedCategories);
  };

  // Handle page changes
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle export
  const handleExport = () => {
    console.log('Exporting spaces...');
    // Export functionality - to be implemented when needed
  };

  // Loading state
  if (loading) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-gray-50">
          <AdminSidebar />
          <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
            <header className="sticky top-0 z-header header-modern">
              <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <h1 className="text-xl font-semibold text-gray-900">Space Management</h1>
                </div>
                <div className="flex items-center space-x-3">
                  <NotificationBell />
                  <UserProfileDropdown />
                </div>
              </div>
            </header>
            <main className="p-6">
              <LoadingState message="Fetching space information..." />
            </main>
          </div>
        </div>
      </ToastProvider>
    );
  }

  // Error state
  if (error) {
  return (
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Icon name="AlertCircle" size={48} className="text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Spaces</h3>
              <p className="text-muted-foreground mb-4">{error.message}</p>
              <Button onClick={refresh} iconName="RefreshCw">
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
        {/* Header */}
        <header className="sticky top-0 z-header header-modern">
          <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <h1 className="text-xl font-semibold text-gray-900">Space Management</h1>
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
                <Icon name="Database" size={16} />
                <span className="text-sm font-medium">Live Data</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <NotificationBell />
              <UserProfileDropdown />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          <BreadcrumbNavigation />
          
          {/* Stats */}
          <SpaceStats stats={stats} />
          
          {/* Category Management */}
          <CategoryManagement 
            categories={categories}
            onCategoriesUpdate={handleCategoriesUpdate}
          />
          
          {/* Filters */}
          <SpaceFilters 
            categories={categories}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            currentFilters={filters}
          />
          
          {/* Bulk Actions */}
          <BulkActionsBar
            selectedCount={selectedSpaces?.length}
            onBulkAction={handleBulkAction}
            onClearSelection={handleClearSelection}
          />
          
          {/* Results Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-muted-foreground">
                Showing {getCurrentPageSpaces().length} of {filteredSpaces.length} spaces
              </p>
              {stats.pending > 0 && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-warning/10 text-warning rounded-full">
                  <Icon name="AlertCircle" size={16} />
                  <span className="text-sm font-medium">{stats.pending} pending approval</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={refresh}
                iconName="RefreshCw"
                iconPosition="left"
              >
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={addSampleDataToDatabase}
                iconName="Plus"
                iconPosition="left"
              >
                Add Sample Data
              </Button>
            <Button
              variant="outline"
              iconName="Download"
              iconPosition="left"
                onClick={handleExport}
            >
              Export
            </Button>
            </div>
          </div>
          
          {/* Table */}
          <SpaceTable
            spaces={getCurrentPageSpaces()}
            selectedSpaces={selectedSpaces}
            onSelectSpace={handleSelectSpace}
            onSelectAll={handleSelectAll}
            onQuickAction={handleQuickAction}
            onViewDetails={handleViewDetails}
            onSuspendQuick={handleSuspendQuick}
            onUnsuspendQuick={handleUnsuspendQuick}
            isUpdatingStatus={isUpdatingStatus}
            updatingSpaceId={updatingSpaceId}
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  iconName="ChevronLeft"
                >
                  Previous
                </Button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  iconName="ChevronRight"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
      {/* Space Details Modal */}
      <SpaceDetailsModal
        space={selectedSpace}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSpace(null);
          // Remove listing parameter from URL
          setSearchParams({});
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        onSuspend={handleSuspend}
        isProcessing={isUpdatingStatus && updatingSpaceId === selectedSpace?.id}
      />

      <SuspendSpaceModal
        isOpen={isSuspendModalOpen}
        space={suspendTargetSpace}
        isProcessing={isSuspending}
        onClose={() => {
          if (isSuspending) return;
          setIsSuspendModalOpen(false);
          setSuspendTargetSpace(null);
        }}
        onConfirm={handleConfirmSuspendQuick}
      />

      <SuspendSpaceBookingWarningModal
        isOpen={isBookingWarningOpen}
        space={bookingWarningData.space}
        bookings={bookingWarningData.bookings}
        isProcessing={isSuspending}
        onCancel={() => {
          if (isSuspending) return;
          setIsBookingWarningOpen(false);
          setBookingWarningData({ space: null, bookings: [], reason: null });
        }}
        onProceed={async () => {
          if (!bookingWarningData?.space?.id) return;
          try {
            setIsSuspending(true);
            await updateSpaceStatus(bookingWarningData.space.id, 'suspended', bookingWarningData.reason || null);
            setIsBookingWarningOpen(false);
            setBookingWarningData({ space: null, bookings: [], reason: null });
            setSuspendTargetSpace(null);
            setSelectedSpace(null);
          } finally {
            setIsSuspending(false);
          }
        }}
      />
    </div>
    </ToastProvider>
  );
};

export default SpaceManagement;