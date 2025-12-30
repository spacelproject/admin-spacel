import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import BookingStatusBadge from './BookingStatusBadge';
import PaymentStatusBadge from './PaymentStatusBadge';
import BookingNotesSection from './BookingNotesSection';
import BookingModificationHistory from './BookingModificationHistory';
import BookingTagsSection from './BookingTagsSection';

const BookingDetailsModal = ({ 
  booking, 
  isOpen, 
  onClose,
  onUpdateStatus,
  onProcessRefund,
  onSendMessage,
  onViewHistory
}) => {
  const [activeTab, setActiveTab] = useState('details');

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen) {
      const firstButton = document.querySelector('[data-booking-modal] button');
      firstButton?.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !booking) return null;

  const tabs = [
    { id: 'details', label: 'Booking Details', icon: 'FileText' },
    { id: 'payment', label: 'Payment Info', icon: 'CreditCard' },
    { id: 'notes', label: 'Admin Notes', icon: 'StickyNote' },
    { id: 'tags', label: 'Tags', icon: 'Tag' },
    { id: 'history', label: 'Modification History', icon: 'History' }
  ];

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-modal flex items-stretch justify-end" data-booking-modal>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Sheet Panel */}
      <div className="relative ml-auto h-full w-full max-w-xl sm:max-w-2xl lg:max-w-3xl bg-slate-50 border-l border-border shadow-modal flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-[1] flex items-center justify-between px-6 py-4 border-b border-border bg-card/90 backdrop-blur">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Booking details
              </span>
              <h2 className="text-[17px] font-semibold text-foreground line-clamp-1">
                {booking.guestName} - {booking.spaceName}
              </h2>
            </div>
            <BookingStatusBadge status={booking.status} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            iconName="X"
            className="rounded-full hover:bg-muted"
            aria-label="Close booking details"
          />
        </div>

        {/* Tabs */}
        <div className="sticky top-[73px] z-[1] border-b border-border bg-card/90 backdrop-blur">
          <nav className="flex space-x-1 px-4" role="tablist" aria-label="Booking detail tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-sm transition-smooth ${
                  activeTab === tab.id
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon name={tab.icon} size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          {activeTab === 'details' && (
            <div className="space-y-5" role="tabpanel" id="tabpanel-details" aria-labelledby="tab-details">
              {/* Guest & Space Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
                  <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                    Guest Information
                  </h3>
                  <div className="flex items-center space-x-3.5">
                    <Image
                      src={booking.guestAvatar}
                      alt={booking.guestName}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{booking.guestName}</p>
                      <p className="text-sm text-muted-foreground truncate">{booking.guestEmail}</p>
                      <p className="text-sm text-muted-foreground">{booking.guestPhone || 'No phone'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
                  <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                    Space Information
                  </h3>
                  <div className="flex items-center space-x-3.5">
                    <Image
                      src={booking.spaceImage}
                      alt={booking.spaceName}
                      className="w-12 h-12 rounded-lg object-cover ring-2 ring-gray-100"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">{booking.spaceName}</p>
                      <p className="text-sm text-muted-foreground truncate">{booking.spaceLocation}</p>
                      <p className="text-sm text-muted-foreground">Host: {booking.hostName}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
                  <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                    Booking Information
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Check-in:</span>
                      <span className="text-sm font-semibold text-foreground">{formatDateTime(booking.checkIn)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Check-out:</span>
                      <span className="text-sm font-semibold text-foreground">{formatDateTime(booking.checkOut)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Guests:</span>
                      <span className="text-sm font-semibold text-foreground">{booking.guests}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <BookingStatusBadge status={booking.status} />
                    </div>
                    {booking.status === 'cancelled' && booking.cancellationReason && (
                      <div className="flex justify-between items-start pt-2 border-t border-border/50">
                        <span className="text-sm text-muted-foreground">Cancellation Reason:</span>
                        <span className="text-xs text-foreground text-right max-w-[200px]">{booking.cancellationReason}</span>
                      </div>
                    )}
                    {booking.cancelledAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Cancelled At:</span>
                        <span className="text-xs text-foreground">{formatDateTime(booking.cancelledAt)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Reference:</span>
                      <span className="text-xs font-mono text-foreground">{booking.booking_reference}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
                  <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                    Special Requests
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {booking.specialRequests || 'No special requests'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (() => {
            // Calculate actual percentages from stored values
            const baseAmount = booking.baseAmount || booking.subtotal || 0;
            const serviceFee = booking.serviceFee || 0;
            const commissionPartner = parseFloat(booking.raw?.commission_partner || 0);
            
            // Calculate percentages dynamically
            const serviceFeePercent = baseAmount > 0 ? ((serviceFee / baseAmount) * 100) : 0;
            const commissionPercent = baseAmount > 0 ? ((commissionPartner / baseAmount) * 100) : 0;
            
            // Calculate host payout from stored commission
            const hostPayout = baseAmount - commissionPartner;
            
            return (
              <div className="space-y-5" role="tabpanel" id="tabpanel-payment" aria-labelledby="tab-payment">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
                    <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                      Payment Breakdown
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Base Amount:</span>
                        <span className="text-sm font-semibold text-foreground">A${baseAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Service Fee {serviceFeePercent > 0 ? `(${serviceFeePercent.toFixed(1)}%)` : ''}:
                        </span>
                        <span className="text-sm font-semibold text-foreground">A${serviceFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Processing Fee:</span>
                        <span className="text-sm font-semibold text-foreground">A${(booking.processingFee || 0).toFixed(2)}</span>
                      </div>
                      <div className="border-t border-border pt-3 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-foreground">Total Paid:</span>
                          <span className="text-lg font-bold text-foreground">A${(booking.total || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
                    <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                      Payment Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <PaymentStatusBadge status={booking.paymentStatus} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Method:</span>
                        <span className="text-sm font-semibold text-foreground">{booking.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-muted-foreground">Transaction ID:</span>
                        <span className="text-xs font-mono text-foreground break-all text-right max-w-[200px]">{booking.transactionId || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
                  <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                    Commission Breakdown
                  </h3>
                  <div className="space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Platform Commission {commissionPercent > 0 ? `(${commissionPercent.toFixed(1)}%)` : ''}:
                      </span>
                      <span className="text-sm font-semibold text-foreground">A${commissionPartner.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Host Payout:</span>
                      <span className="text-sm font-semibold text-foreground">A${hostPayout.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Refund Details Section - Only show if booking is refunded */}
                {booking.paymentStatus === 'refunded' && (() => {
                  const refundAmount = parseFloat(booking.raw?.refund_amount || 0);
                  const transferReversalAmount = parseFloat(booking.raw?.transfer_reversal_amount || 0);
                  const stripeRefundId = booking.raw?.stripe_refund_id;
                  const stripeTransferReversalId = booking.raw?.stripe_transfer_reversal_id;
                  const is50_50Split = transferReversalAmount > 0;
                  
                  return (
                    <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-4 shadow-sm">
                      <div className="flex items-center space-x-2 mb-3">
                        <Icon name="RefreshCw" size={16} className="text-red-600" />
                        <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-red-600">
                          Refund Details
                        </h3>
                      </div>
                      <div className="space-y-2.5">
                        {is50_50Split ? (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Refund Type:</span>
                              <span className="text-sm font-semibold text-foreground">50/50 Split</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Seeker Refund:</span>
                              <span className="text-sm font-semibold text-red-600">A${refundAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Partner Refund:</span>
                              <span className="text-sm font-semibold text-red-600">A${transferReversalAmount.toFixed(2)}</span>
                            </div>
                            <div className="border-t border-red-200 pt-2 mt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold text-muted-foreground">Total Refunded:</span>
                                <span className="text-sm font-bold text-red-600">A${(refundAmount + transferReversalAmount).toFixed(2)}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Refund Amount:</span>
                            <span className="text-sm font-semibold text-red-600">A${refundAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {stripeRefundId && (
                          <div className="flex justify-between items-start pt-2 border-t border-red-200">
                            <span className="text-sm text-muted-foreground">Stripe Refund ID:</span>
                            <span className="text-xs font-mono text-foreground break-all text-right max-w-[200px]">{stripeRefundId}</span>
                          </div>
                        )}
                        {stripeTransferReversalId && (
                          <div className="flex justify-between items-start">
                            <span className="text-sm text-muted-foreground">Transfer Reversal ID:</span>
                            <span className="text-xs font-mono text-foreground break-all text-right max-w-[200px]">{stripeTransferReversalId}</span>
                          </div>
                        )}
                        {booking.updatedAt && (
                          <div className="flex justify-between items-center pt-2 border-t border-red-200">
                            <span className="text-sm text-muted-foreground">Refunded At:</span>
                            <span className="text-xs text-foreground">{formatDateTime(booking.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {activeTab === 'notes' && (
            <div role="tabpanel" id="tabpanel-notes" aria-labelledby="tab-notes">
              <BookingNotesSection bookingId={booking.id} />
            </div>
          )}

          {activeTab === 'tags' && (
            <div role="tabpanel" id="tabpanel-tags" aria-labelledby="tab-tags">
              <BookingTagsSection bookingId={booking.id} />
            </div>
          )}

          {activeTab === 'history' && (
            <div role="tabpanel" id="tabpanel-history" aria-labelledby="tab-history">
              <BookingModificationHistory bookingId={booking.id} />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card/96 backdrop-blur flex-shrink-0">
          <div className="flex items-center space-x-2">
            {onViewHistory && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setActiveTab('history');
                  onViewHistory(booking);
                }}
                iconName="History"
                iconPosition="left"
                size="sm"
              >
                View History
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {onProcessRefund && booking?.paymentStatus === 'paid' && (
              <Button 
                variant="outline" 
                onClick={() => onProcessRefund(booking)}
                iconName="DollarSign"
                iconPosition="left"
                size="sm"
              >
                Process Refund
              </Button>
            )}
            {onUpdateStatus && (
              <Button 
                variant="outline" 
                onClick={() => onUpdateStatus(booking)}
                iconName="RefreshCw"
                iconPosition="left"
                size="sm"
              >
                Update Status
              </Button>
            )}
            <Button variant="outline" onClick={onClose} size="sm">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailsModal;
