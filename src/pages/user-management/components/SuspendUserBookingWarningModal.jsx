import React from 'react';
import Button from '../../../components/ui/Button';

const formatDateTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return String(iso);
  }
};

const BookingRow = ({ booking }) => {
  const ref = booking?.booking_reference;
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/50 last:border-b-0">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground truncate">Booking {ref}</div>
        <div className="text-xs text-muted-foreground">
          {formatDateTime(booking?.start_time)} → {formatDateTime(booking?.end_time)}
        </div>
      </div>
      <div className="flex-shrink-0 text-xs px-2 py-1 rounded-full bg-warning/10 text-warning capitalize">
        {booking?.status || 'unknown'}
      </div>
    </div>
  );
};

const SuspendUserBookingWarningModal = ({
  isOpen,
  user,
  bookings = [],
  onCancel,
  onProceed,
  isProcessing = false
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-lg">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Active bookings found</h3>
            <Button variant="ghost" size="sm" iconName="X" onClick={onCancel} disabled={isProcessing} />
          </div>

          <div className="text-sm text-muted-foreground">
            <div>
              <span className="font-medium text-foreground">{user?.name}</span> has{' '}
              <span className="font-medium text-foreground">{bookings.length}</span> incomplete booking(s)
              (pending/confirmed/active).
            </div>
            <div className="mt-2">
              You can still suspend the account, but bookings will <span className="font-medium">not</span> be auto-cancelled.
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 max-h-64 overflow-y-auto">
            {bookings.map((b) => (
              <BookingRow key={b.id} booking={b} />
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant="warning"
              iconName="Ban"
              iconPosition="left"
              onClick={onProceed}
              disabled={isProcessing}
            >
              {isProcessing ? 'Suspending...' : 'Proceed to Suspend'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuspendUserBookingWarningModal;


