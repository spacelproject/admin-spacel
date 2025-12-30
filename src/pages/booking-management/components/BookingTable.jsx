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

const BookingTable = ({ 
  bookings, 
  onBulkAction, 
  selectedBookings, 
  onSelectionChange,
  onUpdateStatus,
  onProcessRefund,
  onSendMessage
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedBookingForActions, setSelectedBookingForActions] = useState(null);
  const [modalPosition, setModalPosition] = useState({ top: 0, right: 0 });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig?.key === key && sortConfig?.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig?.key !== key) {
      return <Icon name="ArrowUpDown" size={12} className="text-muted-foreground" />;
    }
    return sortConfig?.direction === 'asc' 
      ? <Icon name="ArrowUp" size={12} className="text-foreground" />
      : <Icon name="ArrowDown" size={12} className="text-foreground" />;
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
    setShowActionsModal(false);
  };

  const handleStatusUpdate = async (bookingId, newStatus, reason = null) => {
    try {
      console.log(`🔄 [TABLE] Updating booking ${bookingId} status to ${newStatus}`);
      await onUpdateStatus?.(bookingId, newStatus, reason);
      setShowUpdateStatusModal(false);
      setSelectedBooking(null);
      setShowActionsModal(false);
    } catch (error) {
      console.error('❌ [TABLE] Error updating status:', error);
      // Don't close modal on error so user can see the error
    }
  };

  const handleRefund = async (bookingId, refundAmount, refundType, refundReason, refundNotes) => {
    try {
      console.log('💳 [TABLE] Processing refund:', { bookingId, refundAmount, refundType, refundReason });
      await onProcessRefund?.(bookingId, refundAmount, refundType, refundReason, refundNotes);
      setShowRefundModal(false);
      setSelectedBooking(null);
      setShowActionsModal(false);
    } catch (error) {
      console.error('❌ [TABLE] Error processing refund:', error);
      // Don't close modal on error so user can see the error
      throw error; // Re-throw so modal can display it
    }
  };

  const handleSendMessage = async (messageInfo) => {
    try {
      console.log('💬 [TABLE] Sending message:', messageInfo);
      await onSendMessage?.(messageInfo);
      setShowMessageModal(false);
      setSelectedBooking(null);
      setShowActionsModal(false);
    } catch (error) {
      console.error('❌ [TABLE] Error sending message:', error);
      // Don't close modal on error so user can see the error
    }
  };

  const openActionsModal = (booking) => {
    setSelectedBookingForActions(booking);
    setShowActionsModal(true);
  };

  const closeActionsModal = () => {
    setShowActionsModal(false);
    setSelectedBookingForActions(null);
  };

  const openUpdateStatusModal = (booking) => {
    setSelectedBooking(booking);
    setShowUpdateStatusModal(true);
    setShowActionsModal(false);
  };

  const openRefundModal = (booking) => {
    setSelectedBooking(booking);
    setShowRefundModal(true);
    setShowActionsModal(false);
  };

  const openMessageModal = (booking) => {
    setSelectedBooking(booking);
    setShowMessageModal(true);
    setShowActionsModal(false);
  };

  const isAllSelected = selectedBookings?.length === bookings?.length && bookings?.length > 0;
  const isIndeterminate = selectedBookings?.length > 0 && selectedBookings?.length < bookings?.length;

  const totalBookings = bookings?.length || 0;
  const statusSummary = {
    pending: bookings?.filter(b => b?.status === 'pending')?.length || 0,
    confirmed: bookings?.filter(b => b?.status === 'confirmed')?.length || 0,
    cancelled: bookings?.filter(b => b?.status === 'cancelled')?.length || 0
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-visible">
        {/* Table Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center space-x-3 text-sm">
            <span className="text-gray-600">
              {selectedBookings?.length > 0 ? (
                <>
                  <span className="font-semibold text-gray-900">{selectedBookings.length}</span>{' '}
                  selected
                </>
              ) : (
                <>
                  Showing <span className="font-semibold text-gray-900">{totalBookings}</span> bookings
                </>
              )}
            </span>
            {selectedBookings?.length > 0 && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                Bulk actions available
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-2 text-xs">
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-medium">Pending {statusSummary.pending}</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-medium">Confirmed {statusSummary.confirmed}</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-600">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span className="font-medium">Cancelled {statusSummary.cancelled}</span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              iconName="Download"
              onClick={() => onBulkAction?.('export')}
              className="text-xs font-medium border-gray-300 hover:bg-gray-50"
            >
              Export
            </Button>
          </div>
        </div>

        {/* Table Header + Body */}
        <div className="overflow-x-auto overflow-y-visible w-full relative">
          <table className="w-full" role="table" aria-label="Bookings table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr role="row">
                  <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={(e) => handleSelectAll(e?.target?.checked)}
                    aria-label="Select all bookings"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[120px]">
                  <button
                    onClick={() => handleSort('booking_reference')}
                    className="flex items-center space-x-1.5 font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                    aria-label={`Sort by reference ${sortConfig?.key === 'booking_reference' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : ''}`}
                  >
                    <span>Reference</span>
                    {getSortIcon('booking_reference')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[160px]">
                  <button
                    onClick={() => handleSort('guestName')}
                    className="flex items-center space-x-1.5 font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                    aria-label={`Sort by guest name ${sortConfig?.key === 'guestName' ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : ''}`}
                  >
                    <span>Guest</span>
                    {getSortIcon('guestName')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[160px]">
                  <button
                    onClick={() => handleSort('spaceName')}
                    className="flex items-center space-x-1.5 font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <span>Space</span>
                    {getSortIcon('spaceName')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[140px]">
                  <button
                    onClick={() => handleSort('checkIn')}
                    className="flex items-center space-x-1.5 font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <span>Dates</span>
                    {getSortIcon('checkIn')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[100px]">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center space-x-1.5 font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <span>Status</span>
                    {getSortIcon('status')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[100px]">
                  <button
                    onClick={() => handleSort('paymentStatus')}
                    className="flex items-center space-x-1.5 font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <span>Payment</span>
                    {getSortIcon('paymentStatus')}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider min-w-[100px]">
                  <button
                    onClick={() => handleSort('total')}
                    className="flex items-center space-x-1.5 font-semibold text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    <span>Amount</span>
                    {getSortIcon('total')}
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white" style={{ position: 'relative' }}>
              {bookings?.map((booking) => {
                const isSelected = selectedBookings?.includes(booking?.id);
                return (
                <tr
                  key={booking?.id}
                  className={`transition-all duration-150 ${
                    isSelected 
                      ? 'bg-blue-50/60 border-l-2 border-l-blue-500' 
                      : 'hover:bg-gray-50/80 border-l-2 border-l-transparent'
                  }`}
                >
                  <td className="px-4 py-3">
                    <Checkbox
                      checked={selectedBookings?.includes(booking?.id)}
                      onChange={(e) => handleSelectBooking(booking?.id, e?.target?.checked)}
                      aria-label={`Select booking ${booking?.id}`}
                    />
                  </td>
                  <td className="px-4 py-3 min-w-[120px]">
                    <span className="text-sm font-mono font-semibold text-gray-900">{booking?.booking_reference}</span>
                  </td>
                  <td className="px-4 py-3 min-w-[160px]">
                    <div className="flex items-center space-x-3">
                      <Image
                        src={booking?.guestAvatar}
                        alt={booking?.guestName}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-2 ring-gray-100"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{booking?.guestName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-[160px]">
                    <div className="flex items-center space-x-3">
                      <Image
                        src={booking?.spaceImage}
                        alt={booking?.spaceName}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0 ring-2 ring-gray-100"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{booking?.spaceName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 min-w-[140px]">
                    <div className="text-sm">
                      <p className="font-semibold text-gray-900 whitespace-nowrap">{formatDate(booking?.checkIn)}</p>
                      <p className="text-gray-500 text-xs whitespace-nowrap mt-0.5">to {formatDate(booking?.checkOut)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <BookingStatusBadge status={booking?.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge status={booking?.paymentStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-gray-900 whitespace-nowrap">A${(Math.round((booking?.total || 0) * 100) / 100).toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(booking)}
                        iconName="Eye"
                        className="p-2 hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                        aria-label={`View details for booking ${booking?.id}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="MoreVertical"
                        onClick={(e) => {
                          e.stopPropagation();
                          openActionsModal(booking);
                        }}
                        className="p-2 hover:bg-gray-100 text-gray-600 hover:text-gray-900"
                        aria-label={`More actions for booking ${booking?.id}`}
                      />
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {bookings?.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <Icon name="Calendar" size={32} className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No bookings found</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              No bookings match your current filters. Try adjusting your search criteria or clear filters to see all bookings.
            </p>
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Trigger filter clear if available
                  const clearButton = document.querySelector('[data-clear-filters]');
                  clearButton?.click();
                }}
                iconName="X"
                iconPosition="left"
              >
                Clear Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Focus search input
                  const searchInput = document.querySelector('input[type="search"]');
                  searchInput?.focus();
                }}
                iconName="Search"
                iconPosition="left"
              >
                Search Bookings
              </Button>
            </div>
          </div>
        )}
      </div>
      {/* Booking Actions Modal */}
      {showActionsModal && selectedBookingForActions && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-modal p-4"
          onClick={closeActionsModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Booking Actions</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Reference: <span className="font-mono">{selectedBookingForActions?.booking_reference}</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconName="X"
                onClick={closeActionsModal}
                className="rounded-full hover:bg-gray-100"
              />
            </div>

            {/* Actions */}
            <div className="p-6 space-y-2">
              <button
                onClick={() => openUpdateStatusModal(selectedBookingForActions)}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon name="RefreshCw" size={20} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Update Status</p>
                  <p className="text-sm text-gray-500">Change the booking status</p>
                </div>
              </button>

              <button
                onClick={() => openRefundModal(selectedBookingForActions)}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Icon name="DollarSign" size={20} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Process Refund</p>
                  <p className="text-sm text-gray-500">Refund payment for this booking</p>
                </div>
              </button>

              <button
                onClick={() => openMessageModal(selectedBookingForActions)}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Icon name="MessageSquare" size={20} className="text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Send Message</p>
                  <p className="text-sm text-gray-500">Send a message to guest or host</p>
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <Button
                variant="outline"
                onClick={closeActionsModal}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
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
        onClose={() => {
          setShowUpdateStatusModal(false);
          setSelectedBooking(null);
        }}
        onUpdateStatus={handleStatusUpdate}
      />
      <ProcessRefundModal
        booking={selectedBooking}
        isOpen={showRefundModal}
        onClose={() => {
          setShowRefundModal(false);
          setSelectedBooking(null);
        }}
        onProcessRefund={handleRefund}
      />
      <SendMessageModal
        booking={selectedBooking}
        isOpen={showMessageModal}
        onClose={() => {
          setShowMessageModal(false);
          setSelectedBooking(null);
        }}
        onSendMessage={handleSendMessage}
      />
    </>
  );
};

export default BookingTable;