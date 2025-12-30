import React, { useState } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import SpaceStats from './components/SpaceStats';
import SpaceFilters from './components/SpaceFilters';
import BulkActionsBar from './components/BulkActionsBar';
import SpaceTable from './components/SpaceTable';
import SpaceDetailsModal from './components/SpaceDetailsModal';
import SuspendSpaceModal from './components/SuspendSpaceModal';
import SuspendSpaceBookingWarningModal from './components/SuspendSpaceBookingWarningModal';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { useSpaces } from './hooks/useSpaces';
import { useSidebar } from '../../contexts/SidebarContext';
import { supabase } from '../../lib/supabase';

const SpaceManagementReal = () => {
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
    priceRange: { min: '', max: '' }
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
    filterSpaces
  } = useSpaces();

  // Get filtered spaces based on current filters
  const filteredSpaces = filterSpaces(filters);

  // Get current page spaces
  const getCurrentPageSpaces = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredSpaces.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredSpaces.length / itemsPerPage);

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
      priceRange: { min: '', max: '' }
    });
    setCurrentPage(1);
  };

  // Handle space selection
  const handleSelectSpace = (spaceId, checked) => {
    if (checked) {
      setSelectedSpaces([...selectedSpaces, spaceId]);
    } else {
      setSelectedSpaces(selectedSpaces.filter(id => id !== spaceId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      const currentPageSpaces = getCurrentPageSpaces();
      const currentPageIds = currentPageSpaces.map(space => space.id);
      setSelectedSpaces([...new Set([...selectedSpaces, ...currentPageIds])]);
    } else {
      const currentPageSpaces = getCurrentPageSpaces();
      const currentPageIds = currentPageSpaces.map(space => space.id);
      setSelectedSpaces(selectedSpaces.filter(id => !currentPageIds.includes(id)));
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
    const newStatus = action === 'approve' ? 'active' : 'rejected';
    await updateSpaceStatus(spaceId, newStatus);
  };

  // Handle view details
  const handleViewDetails = (space) => {
    setSelectedSpace(space);
    setIsModalOpen(true);
  };

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
    await updateSpaceStatus(spaceId, 'active', note);
    setIsModalOpen(false);
    setSelectedSpace(null);
  };

  const handleReject = async (spaceId, note) => {
    await updateSpaceStatus(spaceId, 'rejected', note);
    setIsModalOpen(false);
    setSelectedSpace(null);
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

  // Handle page changes
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Handle export
  const handleExport = () => {
    console.log('Exporting spaces...');
    // Export functionality - to be implemented when needed
  };

  // Get stats
  const stats = getSpaceStats();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <Icon name="Loader2" size={48} className="animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading spaces...</p>
            </div>
          </div>
        </div>
      </div>
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
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
        {/* Header */}
        <header className="h-header bg-header-background border-b border-header-border px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-header-foreground">Space Management</h1>
            <div className="flex items-center space-x-2 px-3 py-1 bg-primary/10 text-primary rounded-full">
              <Icon name="Database" size={16} />
              <span className="text-sm font-medium">Live Data</span>
            </div>
          </div>
          <UserProfileDropdown />
        </header>

        {/* Main Content */}
        <main className="p-6">
          <BreadcrumbNavigation />
          
          {/* Stats */}
          <SpaceStats stats={stats} />
          
          {/* Filters */}
          <SpaceFilters 
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            currentFilters={filters}
          />
          
          {/* Bulk Actions */}
          <BulkActionsBar
            selectedCount={selectedSpaces.length}
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
        }}
        onApprove={handleApprove}
        onReject={handleReject}
        onSuspend={handleSuspend}
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
  );
};

export default SpaceManagementReal;
