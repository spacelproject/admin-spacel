import React, { useState } from 'react';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import BookingStatusBadge from './BookingStatusBadge';
import PaymentStatusBadge from './PaymentStatusBadge';
import UpdateStatusModal from './UpdateStatusModal';
import ProcessRefundModal from './ProcessRefundModal';
import SendMessageModal from './SendMessageModal';

const BookingCard = ({ booking, onViewDetails, onStatusUpdate, onRefund }) => {
  const [showUpdateStatusModal, setShowUpdateStatusModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  const formatDate = (date) => {
    return new Date(date)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleStatusUpdate = (bookingId, newStatus) => {
    console.log(`Updating booking ${bookingId} status to ${newStatus}`);
    onStatusUpdate?.(bookingId, newStatus);
    setShowUpdateStatusModal(false);
  };

  const handleRefund = (refundInfo) => {
    console.log('Processing refund:', refundInfo);
    onRefund?.(refundInfo?.bookingId);
    setShowRefundModal(false);
  };

  const handleSendMessage = (messageInfo) => {
    console.log('Sending message:', messageInfo);
    setShowMessageModal(false);
  };

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-medium text-foreground">
            {booking?.booking_reference}
          </span>
          <div className="flex items-center space-x-2">
            <BookingStatusBadge status={booking?.status} />
            <PaymentStatusBadge status={booking?.paymentStatus} />
          </div>
        </div>

        {/* Guest Info */}
        <div className="flex items-center space-x-3">
          <Image
            src={booking?.guestAvatar}
            alt={booking?.guestName}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="font-medium text-foreground">{booking?.guestName}</p>
            <p className="text-sm text-muted-foreground">{booking?.guestEmail}</p>
          </div>
        </div>

        {/* Space Info */}
        <div className="flex items-center space-x-3">
          <Image
            src={booking?.spaceImage}
            alt={booking?.spaceName}
            className="w-10 h-10 rounded object-cover"
          />
          <div className="flex-1">
            <p className="font-medium text-foreground">{booking?.spaceName}</p>
            <p className="text-sm text-muted-foreground">{booking?.spaceLocation}</p>
          </div>
        </div>

        {/* Booking Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Check-in</p>
            <p className="font-medium text-foreground">{formatDate(booking?.checkIn)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Check-out</p>
            <p className="font-medium text-foreground">{formatDate(booking?.checkOut)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Guests</p>
            <p className="font-medium text-foreground">{booking?.guests}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total</p>
            <p className="font-semibold text-foreground">A${(Math.round((booking?.total || 0) * 100) / 100).toFixed(2)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(booking)}
            iconName="Eye"
            iconPosition="left"
            fullWidth
          >
            View Details
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowUpdateStatusModal(true)}
            iconName="RefreshCw"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowRefundModal(true)}
            iconName="DollarSign"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowMessageModal(true)}
            iconName="MessageCircle"
          />
        </div>
      </div>
      {/* Modals */}
      <UpdateStatusModal
        booking={booking}
        isOpen={showUpdateStatusModal}
        onClose={() => setShowUpdateStatusModal(false)}
        onUpdateStatus={handleStatusUpdate}
      />
      <ProcessRefundModal
        booking={booking}
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        onProcessRefund={handleRefund}
      />
      <SendMessageModal
        booking={booking}
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        onSendMessage={handleSendMessage}
      />
    </>
  );
};

export default BookingCard;