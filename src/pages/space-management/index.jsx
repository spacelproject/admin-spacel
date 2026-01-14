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

  // Categories are now managed by CategoryManagement component via useCategories hook
  // We still need categories for filtering, so we'll fetch them separately
  const [categories, setCategories] = useState([]);
  
  // Fetch categories for filtering (using same tables as user app)
  useEffect(() => {
    const fetchCategoriesForFilter = async () => {
      try {
        // Fetch main categories
        const { data: mainCategories, error: mainError } = await supabase
          .from('main_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (mainError) {
          console.warn('Error fetching main categories for filter:', mainError);
          return;
        }

        // Fetch sub categories
        const { data: subCategories, error: subError } = await supabase
          .from('sub_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (subError) {
          console.warn('Error fetching sub categories for filter:', subError);
          return;
        }

        // Fetch relationships
        const { data: relationships, error: relError } = await supabase
          .from('main_category_sub_categories')
          .select('*')
          .order('display_order', { ascending: true });

        if (relError) {
          console.warn('Error fetching category relationships for filter:', relError);
          return;
        }

        // Transform to UI format
        const transformed = (mainCategories || []).map(mainCat => {
          const linkedSubIds = (relationships || [])
            .filter(rel => rel.main_category_id === mainCat.id)
            .map(rel => rel.sub_category_id);

          const subs = (subCategories || [])
            .filter(sub => linkedSubIds.includes(sub.id))
            .sort((a, b) => {
              const aOrder = relationships.find(r => r.sub_category_id === a.id && r.main_category_id === mainCat.id)?.display_order || 0;
              const bOrder = relationships.find(r => r.sub_category_id === b.id && r.main_category_id === mainCat.id)?.display_order || 0;
              return aOrder - bOrder;
            })
            .map(sub => ({
              id: sub.name,
              name: sub.name,
              label: sub.name
            }));

          return {
            id: mainCat.name,
            name: mainCat.name,
            label: mainCat.name,
            subCategories: subs
          };
        });

        setCategories(transformed);
        console.log('✅ Categories loaded for filter:', transformed.length, 'main categories');
      } catch (err) {
        console.warn('Error fetching categories:', err);
      }
    };

    fetchCategoriesForFilter();
    
    // Refresh categories every 30 seconds or when page becomes visible
    const interval = setInterval(fetchCategoriesForFilter, 30000);
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchCategoriesForFilter();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Get filtered spaces based on current filters
  const filteredSpaces = filterSpaces(filters, categories);

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

    // Handle delete action separately
    if (action === 'delete') {
      const confirmed = window.confirm(
        `Are you sure you want to delete ${selectedSpaces.length} space(s)? This action cannot be undone.`
      );
      if (!confirmed) return;

      try {
        console.log('🗑️ Deleting spaces:', selectedSpaces);
        
        // Soft delete by setting status to 'deleted'
        const { data, error } = await supabase
          .from('listings')
          .update({ 
            status: 'deleted',
            updated_at: new Date().toISOString()
          })
          .in('id', selectedSpaces)
          .select('id, name, status');

        if (error) {
          console.error('❌ Error deleting spaces:', error);
          alert(`Failed to delete spaces: ${error.message}`);
          return;
        }

        if (!data || data.length === 0) {
          console.warn('⚠️ No spaces were updated. They may have already been deleted.');
          alert('No spaces were deleted. They may have already been deleted or do not exist.');
          setSelectedSpaces([]);
          return;
        }

        console.log('✅ Spaces deleted successfully:', data);
        console.log(`✅ Deleted ${data.length} of ${selectedSpaces.length} space(s)`);
        
        const deletedCount = data.length;
        setSelectedSpaces([]);
        
        // Refresh spaces list to remove deleted spaces from UI
        // The fetchSpaces query now excludes deleted spaces, so they will disappear
        if (refresh) {
          console.log('🔄 Refreshing spaces list...');
          await refresh();
          console.log('✅ Spaces list refreshed');
        }
        
        // Show success message
        alert(`Successfully deleted ${deletedCount} space(s)`);
      } catch (err) {
        console.error('❌ Error deleting spaces:', err);
        alert(`Failed to delete spaces: ${err.message || 'Unknown error'}`);
      }
      return;
    }

    // Handle activate action (same as approve)
    const newStatus = action === 'approve' || action === 'activate' ? 'active' : 
                     action === 'reject' ? 'rejected' :
                     action === 'suspend' ? 'suspended' : null;
    
    if (newStatus) {
      await bulkUpdateSpaces(selectedSpaces, newStatus);
      setSelectedSpaces([]);
    } else {
      console.warn('Unknown bulk action:', action);
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

  // Refresh categories when they're updated (called by CategoryManagement via real-time or manual refresh)
  const refreshCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('space_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.warn('Error refreshing categories:', error);
        return;
      }

      const mainCategories = (data || []).filter(cat => !cat.parent_id);
      const subCategories = (data || []).filter(cat => cat.parent_id);

      const transformed = mainCategories.map(mainCat => {
        const subs = subCategories
          .filter(sub => sub.parent_id === mainCat.id)
          .map(sub => ({
            id: sub.name,
            name: sub.name,
            label: sub.label
          }));

        return {
          id: mainCat.name,
          name: mainCat.name,
          label: mainCat.label,
          subCategories: subs
        };
      });

      setCategories(transformed);
    } catch (err) {
      console.warn('Error refreshing categories:', err);
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
          <CategoryManagement />
          
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