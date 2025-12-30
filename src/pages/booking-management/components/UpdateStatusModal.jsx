import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';

const UpdateStatusModal = ({ isOpen, onClose, booking, onUpdateStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  // Status transition validation
  const getValidStatusTransitions = (currentStatus) => {
    const transitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [], // Cannot change from completed
      cancelled: [] // Cannot change from cancelled
    };
    return transitions[currentStatus] || [];
  };

  const statusOptions = [
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'pending', label: 'Pending' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'completed', label: 'Completed' }
  ].filter(option => {
    if (!booking?.status) return true;
    const validTransitions = getValidStatusTransitions(booking.status);
    return validTransitions.includes(option.value) || option.value === booking.status;
  });

  useEffect(() => {
    if (booking) {
      setSelectedStatus(booking?.status || '');
      setReason('');
    }
  }, [booking]);

  // Keyboard navigation
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const firstInput = document.querySelector('[data-update-status-modal] input, [data-update-status-modal] select');
      firstInput?.focus();
    }
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!selectedStatus) {
      showToast('Please select a status', 'error');
      return;
    }

    if (selectedStatus === booking?.status) {
      showToast('Status is already set to this value', 'warning');
      return;
    }

    // Validate status transition
    const validTransitions = getValidStatusTransitions(booking?.status);
    if (!validTransitions.includes(selectedStatus)) {
      showToast(`Cannot change status from ${booking?.status} to ${selectedStatus}`, 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      await onUpdateStatus?.(booking?.id, selectedStatus, reason || null);
      showToast(`Booking status updated to ${selectedStatus}`, 'success');
      handleClose();
    } catch (error) {
      console.error('Error updating status:', error);
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred';
      showToast(`Failed to update booking status: ${errorMessage}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedStatus(booking?.status || '');
    setReason('');
    setIsSubmitting(false);
    onClose();
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmed: 'text-green-600',
      pending: 'text-yellow-600',
      cancelled: 'text-red-600',
      completed: 'text-blue-600'
    };
    return colors?.[status] || 'text-muted-foreground';
  };

  return (
    <div className="fixed inset-0 z-modal flex items-stretch justify-end" data-update-status-modal>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
        aria-label="Close modal"
      />

      {/* Sheet Panel */}
      <div className="relative ml-auto h-full w-full max-w-xl sm:max-w-2xl bg-slate-50 border-l border-border shadow-modal flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-[1] flex items-center justify-between px-6 py-4 border-b border-border bg-card/90 backdrop-blur">
          <div className="flex items-center space-x-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Update booking status
              </span>
              <h2 className="text-[17px] font-semibold text-foreground line-clamp-1">
                {booking?.guestName} - {booking?.spaceName}
              </h2>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            iconName="X"
            className="rounded-full hover:bg-muted"
            disabled={isSubmitting}
            aria-label="Close modal"
          />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Booking Info */}
            <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
              <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                Booking Information
              </h3>
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Guest:</span>
                  <span className="text-sm font-semibold text-foreground">{booking?.guestName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Space:</span>
                  <span className="text-sm font-semibold text-foreground">{booking?.spaceName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Status:</span>
                  <span className={`text-sm font-semibold capitalize ${getStatusColor(booking?.status)}`}>
                    {booking?.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Reference:</span>
                  <span className="text-xs font-mono text-foreground">{booking?.booking_reference}</span>
                </div>
              </div>
            </div>

            {/* Status Selection */}
            <div className="rounded-2xl bg-card px-5 py-4 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                Status Update
              </h3>
              
              <Select
                label="New Status"
                options={statusOptions}
                value={selectedStatus}
                onChange={(value) => setSelectedStatus(value)}
                placeholder="Select new status"
                required
                disabled={isSubmitting}
              />

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Reason for Change {selectedStatus === 'cancelled' && <span className="text-red-500">*</span>}
                </label>
                <Input
                  type="textarea"
                  placeholder={selectedStatus === 'cancelled' ? 'Cancellation reason is required...' : 'Enter reason for status change (optional)...'}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  disabled={isSubmitting}
                  required={selectedStatus === 'cancelled'}
                />
              </div>
            </div>

            {/* Status Change Impact */}
            {selectedStatus && selectedStatus !== booking?.status && (
              <div className="rounded-2xl bg-blue-50/80 border border-blue-200 px-5 py-4 shadow-sm">
                <div className="flex items-start space-x-3">
                  <Icon name="Info" size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Status Change Impact:</p>
                    <p className="text-blue-800">
                      {selectedStatus === 'cancelled' && 'This will cancel the booking and may trigger refund processes. Guest and host will be notified.'}
                      {selectedStatus === 'confirmed' && 'This will confirm the booking and notify the guest. The booking will be active.'}
                      {selectedStatus === 'completed' && 'This marks the booking as completed. The booking period has ended.'}
                      {selectedStatus === 'pending' && 'This will set the booking back to pending review. Requires admin approval.'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-card/96 backdrop-blur flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
            size="sm"
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={handleSubmit}
            loading={isSubmitting}
            iconName="RefreshCw"
            iconPosition="left"
            disabled={!selectedStatus || selectedStatus === booking?.status || (selectedStatus === 'cancelled' && !reason.trim())}
            size="sm"
          >
            {isSubmitting ? 'Updating...' : 'Update Status'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpdateStatusModal;
