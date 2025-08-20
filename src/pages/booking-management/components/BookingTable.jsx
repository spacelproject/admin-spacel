import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import BookingStatusBadge from './BookingStatusBadge';
import PaymentStatusBadge from './PaymentStatusBadge';
import BookingDetailsModal from './BookingDetailsModal';
import UpdateStatusModal from './UpdateStatusModal';
import ProcessRefundModal from './ProcessRefundModal';
import SendMessageModal from './SendMessageModal';

const BookingTable = ({ bookings, onBulkAction, selectedBookings, onSelectionChange }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig?.key === key && sortConfig?.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig?.key !== key) {
      return <Icon name="ArrowUpDown" size={16} className="text-muted-foreground" />;
    }
    return sortConfig?.direction === 'asc' 
      ? <Icon name="ArrowUp" size={16} className="text-foreground" />
      : <Icon name="ArrowDown" size={16} className="text-foreground" />;
  };

  const formatDate = (date) => {
    return new Date(date)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(bookings?.map(booking => booking?.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectBooking = (bookingId, checked) => {
    if (checked) {
      onSelectionChange([...selectedBookings, bookingId]);
    } else {
      onSelectionChange(selectedBookings?.filter(id => id !== bookingId));
    }
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
    setActiveDropdown(null);
  };

  const handleStatusUpdate = (bookingId, newStatus) => {
    console.log(`Updating booking ${bookingId} status to ${newStatus}`);
    // You can add actual API call here
    setShowUpdateStatusModal(false);
    setSelectedBooking(null);
    setActiveDropdown(null);
  };

  const handleRefund = (refundInfo) => {
    console.log('Processing refund:', refundInfo);
    // You can add actual API call here
    setShowRefundModal(false);
    setSelectedBooking(null);
    setActiveDropdown(null);
  };

  const handleSendMessage = (messageInfo) => {
    console.log('Sending message:', messageInfo);
    // You can add actual API call here
    setShowMessageModal(false);
    setSelectedBooking(null);
    setActiveDropdown(null);
  };

  const openUpdateStatusModal = (booking) => {
    setSelectedBooking(booking);
    setShowUpdateStatusModal(true);
    setActiveDropdown(null);
  };

  const openRefundModal = (booking) => {
    setSelectedBooking(booking);
    setShowRefundModal(true);
    setActiveDropdown(null);
  };

  const openMessageModal = (booking) => {
    setSelectedBooking(booking);
    setShowMessageModal(true);
    setActiveDropdown(null);
  };

  const toggleDropdown = (bookingId) => {
    setActiveDropdown(activeDropdown === bookingId ? null : bookingId);
  };

  const isAllSelected = selectedBookings?.length === bookings?.length && bookings?.length > 0;
  const isIndeterminate = selectedBookings?.length > 0 && selectedBookings?.length < bookings?.length;

  return (
    <>
      <div className="overflow-hidden">
        {/* Table Header */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="w-12 px-4 py-3">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={(e) => handleSelectAll(e?.target?.checked)}
                  />
                </th>
                <th className="px-4 py-3 text-left min-w-[120px]">
                  <button
                    onClick={() => handleSort('id')}
                    className="flex items-center space-x-2 font-medium text-foreground hover:text-primary transition-smooth"
                  >
                    <span>Booking ID</span>
                    {getSortIcon('id')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left min-w-[200px]">
                  <button
                    onClick={() => handleSort('guestName')}
                    className="flex items-center space-x-2 font-medium text-foreground hover:text-primary transition-smooth"
                  >
                    <span>Guest</span>
                    {getSortIcon('guestName')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left min-w-[200px]">
                  <button
                    onClick={() => handleSort('spaceName')}
                    className="flex items-center space-x-2 font-medium text-foreground hover:text-primary transition-smooth"
                  >
                    <span>Space</span>
                    {getSortIcon('spaceName')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left min-w-[160px]">
                  <button
                    onClick={() => handleSort('checkIn')}
                    className="flex items-center space-x-2 font-medium text-foreground hover:text-primary transition-smooth"
                  >
                    <span>Dates</span>
                    {getSortIcon('checkIn')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left min-w-[120px]">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-2 font-medium text-foreground hover:text-primary transition-smooth"
                  >
                    <span>Status</span>
                    {getSortIcon('status')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left min-w-[120px]">
                  <button
                    onClick={() => handleSort('paymentStatus')}
                    className="flex items-center space-x-2 font-medium text-foreground hover:text-primary transition-smooth"
                  >
                    <span>Payment</span>
                    {getSortIcon('paymentStatus')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left min-w-[100px]">
                  <button
                    onClick={() => handleSort('total')}
                    className="flex items-center space-x-2 font-medium text-foreground hover:text-primary transition-smooth"
                  >
                    <span>Amount</span>
                    {getSortIcon('total')}
                  </button>
                </th>
                <th className="px-4 py-3 text-center min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookings?.map((booking) => (
                <tr key={booking?.id} className="hover:bg-muted/30 transition-smooth">
                  <td className="px-4 py-4">
                    <Checkbox
                      checked={selectedBookings?.includes(booking?.id)}
                      onChange={(e) => handleSelectBooking(booking?.id, e?.target?.checked)}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-sm font-medium text-foreground">
                      {booking?.id}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <Image
                        src={booking?.guestAvatar}
                        alt={booking?.guestName}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{booking?.guestName}</p>
                        <p className="text-xs text-muted-foreground truncate">{booking?.guestEmail}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <Image
                        src={booking?.spaceImage}
                        alt={booking?.spaceName}
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{booking?.spaceName}</p>
                        <p className="text-xs text-muted-foreground truncate">{booking?.spaceLocation}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm">
                      <p className="font-medium text-foreground">{formatDate(booking?.checkIn)}</p>
                      <p className="text-muted-foreground">to {formatDate(booking?.checkOut)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <BookingStatusBadge status={booking?.status} />
                  </td>
                  <td className="px-4 py-4">
                    <PaymentStatusBadge status={booking?.paymentStatus} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-semibold text-foreground">${booking?.total}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(booking)}
                        iconName="Eye"
                      />
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          iconName="MoreVertical"
                          onClick={() => toggleDropdown(booking?.id)}
                        />
                        {activeDropdown === booking?.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-modal z-dropdown">
                            <div className="py-1">
                              <button
                                onClick={() => openUpdateStatusModal(booking)}
                                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-smooth flex items-center space-x-2"
                              >
                                <Icon name="RefreshCw" size={14} />
                                <span>Update Status</span>
                              </button>
                              <button
                                onClick={() => openRefundModal(booking)}
                                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-smooth flex items-center space-x-2"
                              >
                                <Icon name="DollarSign" size={14} />
                                <span>Process Refund</span>
                              </button>
                              <button
                                onClick={() => openMessageModal(booking)}
                                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted transition-smooth flex items-center space-x-2"
                              >
                                <Icon name="MessageCircle" size={14} />
                                <span>Send Message</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {bookings?.length === 0 && (
          <div className="text-center py-12">
            <Icon name="Calendar" size={48} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No bookings found</h3>
            <p className="text-muted-foreground">
              No bookings match your current filters. Try adjusting your search criteria.
            </p>
          </div>
        )}
      </div>
      {/* Close dropdown when clicking outside */}
      {activeDropdown && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setActiveDropdown(null)}
        />
      )}
      {/* Modals */}
      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />
      <UpdateStatusModal
        booking={selectedBooking}
        isOpen={showUpdateStatusModal}
        onClose={() => setShowUpdateStatusModal(false)}
        onUpdateStatus={handleStatusUpdate}
      />
      <ProcessRefundModal
        booking={selectedBooking}
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onProcessRefund={handleRefund}
      />
      <SendMessageModal
        booking={selectedBooking}
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        onSendMessage={handleSendMessage}
      />
    </>
  );
};

export default BookingTable;