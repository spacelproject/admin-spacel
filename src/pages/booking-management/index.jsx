import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import NotificationBell from '../../components/NotificationBell';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import BookingFilters from './components/BookingFilters';
import BookingStats from './components/BookingStats';
import BookingTable from './components/BookingTable';
import BookingCard from './components/BookingCard';
import BulkActions from './components/BulkActions';
import BookingDetailsModal from './components/BookingDetailsModal';
import Pagination from './components/Pagination';
import ExportModal from './components/ExportModal';
import UpdateStatusModal from './components/UpdateStatusModal';
import ProcessRefundModal from './components/ProcessRefundModal';
import SendMessageModal from './components/SendMessageModal';
import BulkRefundModal from './components/BulkRefundModal';
import BulkMessageModal from './components/BulkMessageModal';
import BookingAnalyticsDashboard from './components/BookingAnalyticsDashboard';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import LoadingState from '../../components/ui/LoadingState';
import useBookings from '../../hooks/useBookings';
import { useSidebar } from '../../contexts/SidebarContext';

const BookingManagement = () => {
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [currentFilters, setCurrentFilters] = useState({});
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showBulkRefundModal, setShowBulkRefundModal] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { isExpanded } = useSidebar();

  // Use real booking data from database
  const { 
    bookings, 
    loading, 
    error, 
    pagination,
    goToPage,
    setPageSize,
    updateBookingStatus, 
    processRefund, 
    bulkUpdateBookings,
    updateBookingInList
  } = useBookings();

  // Calculate stats from real data
  const bookingStats = {
    total: bookings?.length || 0,
    confirmed: bookings?.filter(b => b?.status === 'confirmed')?.length || 0,
    pending: bookings?.filter(b => b?.status === 'pending')?.length || 0,
    cancelled: bookings?.filter(b => b?.status === 'cancelled')?.length || 0,
    revenue: bookings?.reduce((sum, b) => sum + (b?.total || 0), 0) || 0
  };

  const bookingCounts = {
    total: bookings?.length || 0,
    filtered: filteredBookings?.length || 0
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setFilteredBookings(bookings);
  }, [bookings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboardShortcuts = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"]');
        searchInput?.focus();
      }

      // Ctrl/Cmd + E: Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setShowExportModal(true);
      }

      // Ctrl/Cmd + A: Toggle analytics
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setShowAnalytics(!showAnalytics);
      }

      // Escape: Close modals
      if (e.key === 'Escape') {
        if (showDetailsModal) setShowDetailsModal(false);
        if (showUpdateStatusModal) setShowUpdateStatusModal(false);
        if (showRefundModal) setShowRefundModal(false);
        if (showMessageModal) setShowMessageModal(false);
        if (showBulkRefundModal) setShowBulkRefundModal(false);
        if (showBulkMessageModal) setShowBulkMessageModal(false);
        if (showExportModal) setShowExportModal(false);
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [showAnalytics, showDetailsModal, showUpdateStatusModal, showRefundModal, showMessageModal, showBulkRefundModal, showBulkMessageModal, showExportModal]);

  const handleFiltersChange = (filters) => {
    setCurrentFilters(filters);
    
    let filtered = bookings;

    // Apply search filter
    if (filters?.searchQuery) {
      const query = filters?.searchQuery?.toLowerCase();
      filtered = filtered?.filter(booking =>
        booking?.booking_reference?.toLowerCase()?.includes(query) ||
        booking?.guestName?.toLowerCase()?.includes(query) ||
        booking?.spaceName?.toLowerCase()?.includes(query) ||
        booking?.guestEmail?.toLowerCase()?.includes(query)
      );
    }

    // Apply status filter
    if (filters?.status) {
      filtered = filtered?.filter(booking => booking?.status === filters?.status);
    }

    // Apply payment status filter
    if (filters?.paymentStatus) {
      filtered = filtered?.filter(booking => booking?.paymentStatus === filters?.paymentStatus);
    }

    // Apply date range filter
    if (filters?.dateRange?.start) {
      const startDate = new Date(filters.dateRange.start);
      filtered = filtered?.filter(booking => new Date(booking.checkIn) >= startDate);
    }
    if (filters?.dateRange?.end) {
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered?.filter(booking => new Date(booking.checkOut) <= endDate);
    }

    // Apply amount range filter
    if (filters?.amountRange?.min) {
      filtered = filtered?.filter(booking => booking?.total >= parseFloat(filters?.amountRange?.min));
    }
    if (filters?.amountRange?.max) {
      filtered = filtered?.filter(booking => booking?.total <= parseFloat(filters?.amountRange?.max));
    }

    // Apply guest name filter
    if (filters?.guestName) {
      const guestNameLower = filters.guestName.toLowerCase();
      filtered = filtered?.filter(booking => 
        booking?.guestName?.toLowerCase()?.includes(guestNameLower)
      );
    }

    // Apply guest email filter
    if (filters?.guestEmail) {
      const guestEmailLower = filters.guestEmail.toLowerCase();
      filtered = filtered?.filter(booking => 
        booking?.guestEmail?.toLowerCase()?.includes(guestEmailLower)
      );
    }

    // Apply host name filter
    if (filters?.hostName) {
      const hostNameLower = filters.hostName.toLowerCase();
      filtered = filtered?.filter(booking => 
        booking?.hostName?.toLowerCase()?.includes(hostNameLower)
      );
    }

    // Apply booking type filter
    if (filters?.bookingType) {
      filtered = filtered?.filter(booking => 
        booking?.bookingType === filters.bookingType
      );
    }

    // Apply payout status filter
    if (filters?.payoutStatus) {
      filtered = filtered?.filter(booking => 
        booking?.payoutStatus === filters.payoutStatus
      );
    }

    setFilteredBookings(filtered);
  };

  const handleBulkAction = async (action) => {
    try {
      if (action === 'refund') {
        setShowBulkRefundModal(true);
        return;
      }
      
      if (action === 'send-message') {
        setShowBulkMessageModal(true);
        return;
      }
      
      if (action === 'export') {
        setShowExportModal(true);
        return;
      }
      
      console.log(`Executing bulk action: ${action} on ${selectedBookings?.length} bookings`);
      await bulkUpdateBookings(selectedBookings, action);
      setSelectedBookings([]);
    } catch (error) {
      console.error('Error executing bulk action:', error);
    }
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleStatusUpdate = async (bookingId, newStatus, reason = null) => {
    try {
      await updateBookingStatus(bookingId, newStatus, reason);
      setShowUpdateStatusModal(false);
      setSelectedBooking(null);
      // Optimistic update already handled in hook
    } catch (error) {
      console.error('Error updating booking status:', error);
      // Re-throw the error so the modal can display it
      throw error;
    }
  };

  const handleRefund = async (bookingId, refundAmount = null, refundType = 'full', refundReason = null, refundNotes = null) => {
    try {
      await processRefund(bookingId, refundAmount, refundType, refundReason, refundNotes);
      setShowRefundModal(false);
      setSelectedBooking(null);
      // Optimistic update already handled in hook
    } catch (error) {
      console.error('Error processing refund:', error);
      // Re-throw the error so the modal can display it
      throw error;
    }
  };

  const handleSendMessage = async (messageInfo) => {
    try {
      // Message sending is handled in SendMessageModal
      setShowMessageModal(false);
      setSelectedBooking(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleExport = async (exportOptions) => {
    try {
      const { exportData } = await import('../../utils/exportUtils');
      const { formatCurrencyDisplay } = await import('../../utils/currency');
      
      // Determine which bookings to export based on scope
      let bookingsToExport = [];
      if (exportOptions.scope === 'selected') {
        bookingsToExport = bookings.filter(b => selectedBookings.includes(b.id));
      } else if (exportOptions.scope === 'filtered') {
        bookingsToExport = filteredBookings;
      } else {
        bookingsToExport = bookings;
      }
      
      if (bookingsToExport.length === 0) {
        return;
      }
      
      // Prepare booking data for export based on selected fields
      const exportDataArray = bookingsToExport.map(booking => {
        const row = {};
        
        if (exportOptions.includeFields.id) {
          row['Reference'] = booking.booking_reference;
        }
        if (exportOptions.includeFields.guest) {
          row['Guest Name'] = booking.guestName || 'N/A';
          row['Guest Email'] = booking.guestEmail || 'N/A';
          row['Guest Phone'] = booking.guestPhone || 'N/A';
        }
        if (exportOptions.includeFields.space) {
          row['Space Name'] = booking.spaceName || 'N/A';
          row['Space Location'] = booking.spaceLocation || 'N/A';
        }
        if (exportOptions.includeFields.dates) {
          row['Check-in'] = booking.checkIn ? new Date(booking.checkIn).toLocaleDateString() : 'N/A';
          row['Check-out'] = booking.checkOut ? new Date(booking.checkOut).toLocaleDateString() : 'N/A';
        }
        if (exportOptions.includeFields.status) {
          row['Booking Status'] = booking.status || 'N/A';
        }
        if (exportOptions.includeFields.payment) {
          row['Payment Status'] = booking.paymentStatus || 'N/A';
          row['Payment Method'] = booking.paymentMethod || 'N/A';
          row['Transaction ID'] = booking.transactionId || 'N/A';
        }
        if (exportOptions.includeFields.amount) {
          row['Base Amount'] = formatCurrencyDisplay(booking.baseAmount || booking.subtotal || 0);
          row['Service Fee'] = formatCurrencyDisplay(booking.serviceFee || 0);
          row['Processing Fee'] = formatCurrencyDisplay(booking.processingFee || 0);
          row['Total Amount'] = formatCurrencyDisplay(booking.total || 0);
        }
        if (exportOptions.includeFields.host) {
          row['Host Name'] = booking.hostName || 'N/A';
        }
        if (exportOptions.includeFields.specialRequests) {
          row['Special Requests'] = booking.specialRequests || 'N/A';
        }
        
        row['Created At'] = booking.createdAt ? new Date(booking.createdAt).toLocaleString() : 'N/A';
        row['Updated At'] = booking.updatedAt ? new Date(booking.updatedAt).toLocaleString() : 'N/A';
        
        return row;
      });
      
      const fileName = `bookings_export_${new Date().toISOString().split('T')[0]}`;
      const format = exportOptions.format === 'excel' ? 'xlsx' : exportOptions.format;
      await exportData(exportDataArray, fileName, format);
    } catch (error) {
      console.error('Error exporting bookings:', error);
      throw error;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
          <AdminSidebar />
        <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
          <header className="sticky top-0 z-header header-modern">
            <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <h1 className="text-xl font-semibold text-gray-900">Booking Management</h1>
              </div>
              <div className="flex items-center space-x-3">
                <NotificationBell />
                <UserProfileDropdown />
              </div>
              </div>
            </header>
            <main className="p-6">
              <LoadingState message="Fetching booking information..." />
            </main>
          </div>
        </div>
    );
  }

  // Show error state
  if (error) {
    return (
        <div className="min-h-screen bg-background">
          <AdminSidebar />
        <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
            <main className="p-6">
              <div className="text-center py-12">
                <Icon name="AlertCircle" size={48} className="text-error mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Bookings</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </main>
          </div>
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-gray-50">
        <AdminSidebar />
        
        <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
          {/* Header */}
          <header className="sticky top-0 z-header header-modern">
            <div className="px-4 lg:px-6 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <h1 className="text-xl font-semibold text-gray-900">
                Booking Management
              </h1>
            </div>
            
              <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowAnalytics(!showAnalytics)}
                iconName={showAnalytics ? "X" : "BarChart3"}
                iconPosition="left"
                className="hidden sm:flex"
              >
                {showAnalytics ? 'Hide Analytics' : 'View Analytics'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowExportModal(true)}
                iconName="Download"
                iconPosition="left"
                className="hidden sm:flex"
              >
                Export Data
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowExportModal(true)}
                iconName="Download"
                className="sm:hidden"
              />
              <UserProfileDropdown />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-4 lg:p-6 space-y-6 overflow-x-hidden">
            <div className="w-full mx-auto">
              <BreadcrumbNavigation />
              
              {/* Analytics Dashboard */}
              {showAnalytics && (
                <div className="mb-6">
                  <BookingAnalyticsDashboard filters={currentFilters} />
                </div>
              )}
              
              {/* Stats */}
              <BookingStats stats={bookingStats} />
              
              {/* Filters */}
              <BookingFilters 
                onFiltersChange={handleFiltersChange}
                bookingCounts={bookingCounts}
                bookings={bookings}
              />
              
              {/* Bulk Actions */}
              <BulkActions
                selectedCount={selectedBookings?.length}
                onBulkAction={handleBulkAction}
                onClearSelection={() => setSelectedBookings([])}
              />
              
              {/* Bookings Display */}
              <div className="bg-card rounded-lg border border-border card-shadow">
                {isMobile ? (
                  <div className="p-4 space-y-4">
                    {filteredBookings?.map((booking) => (
                      <BookingCard
                        key={booking?.id}
                        booking={booking}
                        onViewDetails={handleViewDetails}
                        onStatusUpdate={handleStatusUpdate}
                        onRefund={handleRefund}
                      />
                    ))}
                    
                    {filteredBookings?.length === 0 && (
                      <div className="text-center py-12">
                        <Icon name="Calendar" size={48} className="text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">No bookings found</h3>
                        <p className="text-muted-foreground">
                          No bookings match your current filters. Try adjusting your search criteria.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                  <BookingTable
                    bookings={filteredBookings}
                    onBulkAction={handleBulkAction}
                    selectedBookings={selectedBookings}
                    onSelectionChange={setSelectedBookings}
                      onUpdateStatus={handleStatusUpdate}
                      onProcessRefund={handleRefund}
                      onSendMessage={handleSendMessage}
                    />
                    {pagination && (
                      <Pagination
                        currentPage={pagination.page}
                        totalPages={Math.ceil(pagination.total / pagination.pageSize)}
                        pageSize={pagination.pageSize}
                        totalItems={pagination.total}
                        onPageChange={goToPage}
                        onPageSizeChange={setPageSize}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </main>
        </div>

        {/* Booking Details Modal */}
        <BookingDetailsModal
          booking={selectedBooking}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          onUpdateStatus={(booking) => {
            setSelectedBooking(booking);
            setShowDetailsModal(false);
            setShowUpdateStatusModal(true);
          }}
          onProcessRefund={(booking) => {
            setSelectedBooking(booking);
            setShowDetailsModal(false);
            setShowRefundModal(true);
          }}
          onSendMessage={(booking) => {
            setSelectedBooking(booking);
            setShowDetailsModal(false);
            setShowMessageModal(true);
          }}
          onViewHistory={(booking) => {
            // History view is available in the Booking Details Modal
            setSelectedBooking(booking);
            setShowDetailsModal(true);
          }}
        />

        {/* Export Modal */}
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          selectedCount={selectedBookings.length}
          totalCount={filteredBookings.length}
        />

        {/* Update Status Modal */}
        <UpdateStatusModal
          booking={selectedBooking}
          isOpen={showUpdateStatusModal}
          onClose={() => {
            setShowUpdateStatusModal(false);
            setSelectedBooking(null);
          }}
          onUpdateStatus={handleStatusUpdate}
        />

        {/* Process Refund Modal */}
        <ProcessRefundModal
          booking={selectedBooking}
          isOpen={showRefundModal}
          onClose={() => {
            setShowRefundModal(false);
            setSelectedBooking(null);
          }}
          onProcessRefund={handleRefund}
        />

        {/* Send Message Modal */}
        <SendMessageModal
          booking={selectedBooking}
          isOpen={showMessageModal}
          onClose={() => {
            setShowMessageModal(false);
            setSelectedBooking(null);
          }}
          onSendMessage={handleSendMessage}
        />

        {/* Bulk Refund Modal */}
        <BulkRefundModal
          isOpen={showBulkRefundModal}
          onClose={() => {
            setShowBulkRefundModal(false);
            setSelectedBookings([]);
          }}
          selectedBookings={selectedBookings}
          bookings={bookings}
          onProcessRefund={handleRefund}
        />

        {/* Bulk Message Modal */}
        <BulkMessageModal
          isOpen={showBulkMessageModal}
          onClose={() => {
            setShowBulkMessageModal(false);
            setSelectedBookings([]);
          }}
          selectedBookings={selectedBookings}
          bookings={bookings}
          onSendMessage={handleSendMessage}
        />

      </div>
  );
};

export default BookingManagement;