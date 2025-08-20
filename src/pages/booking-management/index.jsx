import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import BookingFilters from './components/BookingFilters';
import BookingStats from './components/BookingStats';
import BookingTable from './components/BookingTable';
import BookingCard from './components/BookingCard';
import BulkActions from './components/BulkActions';
import BookingDetailsModal from './components/BookingDetailsModal';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { ToastProvider } from '../../components/ui/Toast';

const BookingManagement = () => {
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [currentFilters, setCurrentFilters] = useState({});
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mock booking data
  const mockBookings = [
    {
      id: 'BK001',
      guestName: 'Sarah Johnson',
      guestEmail: 'sarah.johnson@email.com',
      guestPhone: '+1 (555) 123-4567',
      guestAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b9c5e6b0?w=150',
      spaceName: 'Modern Downtown Loft',
      spaceLocation: 'New York, NY',
      spaceImage: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=150',
      hostName: 'Michael Chen',
      checkIn: new Date('2025-01-20'),
      checkOut: new Date('2025-01-25'),
      guests: 2,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'Credit Card',
      transactionId: 'TXN123456789',
      subtotal: 450,
      serviceFee: 67.50,
      taxes: 32.50,
      total: 550,
      specialRequests: 'Late check-in requested'
    },
    {
      id: 'BK002',
      guestName: 'David Rodriguez',
      guestEmail: 'david.rodriguez@email.com',
      guestPhone: '+1 (555) 987-6543',
      guestAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      spaceName: 'Cozy Studio Apartment',
      spaceLocation: 'San Francisco, CA',
      spaceImage: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=150',
      hostName: 'Emma Wilson',
      checkIn: new Date('2025-01-22'),
      checkOut: new Date('2025-01-24'),
      guests: 1,
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'PayPal',
      transactionId: 'TXN987654321',
      subtotal: 200,
      serviceFee: 30,
      taxes: 20,
      total: 250,
      specialRequests: null
    },
    {
      id: 'BK003',
      guestName: 'Lisa Thompson',
      guestEmail: 'lisa.thompson@email.com',
      guestPhone: '+1 (555) 456-7890',
      guestAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      spaceName: 'Luxury Penthouse Suite',
      spaceLocation: 'Miami, FL',
      spaceImage: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=150',
      hostName: 'Robert Davis',
      checkIn: new Date('2025-01-18'),
      checkOut: new Date('2025-01-21'),
      guests: 4,
      status: 'completed',
      paymentStatus: 'paid',
      paymentMethod: 'Credit Card',
      transactionId: 'TXN456789123',
      subtotal: 800,
      serviceFee: 120,
      taxes: 80,
      total: 1000,
      specialRequests: 'Airport pickup requested'
    },
    {
      id: 'BK004',
      guestName: 'James Wilson',
      guestEmail: 'james.wilson@email.com',
      guestPhone: '+1 (555) 321-0987',
      guestAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      spaceName: 'Beachfront Villa',
      spaceLocation: 'Los Angeles, CA',
      spaceImage: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=150',
      hostName: 'Jennifer Martinez',
      checkIn: new Date('2025-01-15'),
      checkOut: new Date('2025-01-17'),
      guests: 3,
      status: 'cancelled',
      paymentStatus: 'refunded',
      paymentMethod: 'Credit Card',
      transactionId: 'TXN789123456',
      subtotal: 600,
      serviceFee: 90,
      taxes: 60,
      total: 750,
      specialRequests: 'Pet-friendly accommodation'
    },
    {
      id: 'BK005',
      guestName: 'Maria Garcia',
      guestEmail: 'maria.garcia@email.com',
      guestPhone: '+1 (555) 654-3210',
      guestAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      spaceName: 'Mountain Cabin Retreat',
      spaceLocation: 'Denver, CO',
      spaceImage: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=150',
      hostName: 'Thomas Anderson',
      checkIn: new Date('2025-01-25'),
      checkOut: new Date('2025-01-28'),
      guests: 2,
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentMethod: 'Bank Transfer',
      transactionId: 'TXN321654987',
      subtotal: 300,
      serviceFee: 45,
      taxes: 30,
      total: 375,
      specialRequests: 'Vegetarian meal preferences'
    }
  ];

  // Calculate stats
  const bookingStats = {
    total: mockBookings?.length,
    confirmed: mockBookings?.filter(b => b?.status === 'confirmed')?.length,
    pending: mockBookings?.filter(b => b?.status === 'pending')?.length,
    cancelled: mockBookings?.filter(b => b?.status === 'cancelled')?.length,
    revenue: mockBookings?.reduce((sum, b) => sum + b?.total, 0)
  };

  const bookingCounts = {
    total: mockBookings?.length,
    filtered: filteredBookings?.length
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
    setFilteredBookings(mockBookings);
  }, []);

  const handleFiltersChange = (filters) => {
    setCurrentFilters(filters);
    
    let filtered = mockBookings;

    // Apply search filter
    if (filters?.searchQuery) {
      const query = filters?.searchQuery?.toLowerCase();
      filtered = filtered?.filter(booking =>
        booking?.id?.toLowerCase()?.includes(query) ||
        booking?.guestName?.toLowerCase()?.includes(query) ||
        booking?.spaceName?.toLowerCase()?.includes(query)
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

    setFilteredBookings(filtered);
  };

  const handleBulkAction = (action) => {
    console.log(`Executing bulk action: ${action} on ${selectedBookings?.length} bookings`);
    // Implement bulk action logic here
    setSelectedBookings([]);
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleStatusUpdate = (bookingId, newStatus) => {
    console.log(`Updating booking ${bookingId} status to ${newStatus}`);
    // Add your API integration here
  };

  const handleRefund = (bookingId) => {
    console.log(`Processing refund for booking ${bookingId}`);
    // Add your API integration here
  };

  const handleExport = () => {
    console.log('Exporting booking data...');
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        
        <div className="lg:ml-sidebar">
          {/* Header */}
          <header className="h-header bg-header-background border-b border-header-border px-4 lg:px-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-header-foreground">
                Booking Management
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleExport}
                iconName="Download"
                iconPosition="left"
                className="hidden sm:flex"
              >
                Export Data
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                iconName="Download"
                className="sm:hidden"
              />
              <UserProfileDropdown />
            </div>
          </header>

          {/* Main Content */}
          <main className="p-4 lg:p-6 space-y-6">
            <div className="max-w-7xl mx-auto">
              <BreadcrumbNavigation />
              
              {/* Stats */}
              <BookingStats stats={bookingStats} />
              
              {/* Filters */}
              <BookingFilters 
                onFiltersChange={handleFiltersChange}
                bookingCounts={bookingCounts}
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
                  <BookingTable
                    bookings={filteredBookings}
                    onBulkAction={handleBulkAction}
                    selectedBookings={selectedBookings}
                    onSelectionChange={setSelectedBookings}
                  />
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
        />
      </div>
    </ToastProvider>
  );
};

export default BookingManagement;