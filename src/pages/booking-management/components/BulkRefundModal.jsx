import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/Toast';
import { formatCurrencyDisplay } from '../../../utils/currency';

const BulkRefundModal = ({ isOpen, onClose, selectedBookings, bookings, onProcessRefund }) => {
  const { showToast } = useToast();
  const [refundData, setRefundData] = useState({
    type: 'full',
    reason: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const selectedBookingsData = bookings?.filter(b => selectedBookings.includes(b.id)) || [];
  const totalRefundAmount = selectedBookingsData.reduce((sum, booking) => {
    if (refundData.type === 'full') {
      return sum + (booking.total || 0);
    } else {
      // For partial refunds, we'd need individual amounts
      return sum + (booking.total || 0);
    }
  }, 0);

  const refundTypeOptions = [
    { value: 'full', label: 'Full Refund' },
    { value: 'partial', label: 'Partial Refund' }
  ];

  const refundReasonOptions = [
    { value: '', label: 'Select reason' },
    { value: 'cancellation', label: 'Cancellation' },
    { value: 'service_issue', label: 'Service Issue' },
    { value: 'double_booking', label: 'Double Booking' },
    { value: 'customer_request', label: 'Customer Request' },
    { value: 'other', label: 'Other' }
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!refundData.reason) {
      newErrors.reason = 'Please select a refund reason';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Process refunds for all selected bookings
      for (const bookingId of selectedBookings) {
        const booking = selectedBookingsData.find(b => b.id === bookingId);
        const refundAmount = refundData.type === 'full' ? booking?.total : null;
        
        await onProcessRefund(bookingId, refundAmount, refundData.type);
      }

      showToast(`Successfully processed refunds for ${selectedBookings.length} booking(s)`, 'success');
      handleClose();
    } catch (error) {
      console.error('Error processing bulk refunds:', error);
      setErrors({ general: error.message });
      showToast(`Error processing refunds: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRefundData({
      type: 'full',
      reason: '',
      notes: ''
    });
    setErrors({});
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Icon name="DollarSign" size={20} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Bulk Process Refunds</h2>
              <p className="text-sm text-muted-foreground">
                Processing refunds for {selectedBookings.length} selected booking(s)
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={handleClose}
            disabled={isSubmitting}
          />
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You are about to process refunds for the following bookings:
            </p>
            <ul className="list-disc list-inside text-sm text-foreground max-h-32 overflow-y-auto border border-border rounded-md p-3 bg-muted/30">
              {selectedBookingsData.map(booking => (
                <li key={booking.id}>
                  {booking.guestName} - {booking.spaceName} - {formatCurrencyDisplay(booking.total || 0)}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Total Refund Amount:</span>
              <span className="text-lg font-bold text-foreground">
                {formatCurrencyDisplay(totalRefundAmount)}
              </span>
            </div>
          </div>

          <Select
            label="Refund Type"
            options={refundTypeOptions}
            value={refundData.type}
            onChange={(value) => setRefundData(prev => ({ ...prev, type: value }))}
            required
          />

          <Select
            label="Refund Reason"
            options={refundReasonOptions}
            value={refundData.reason}
            onChange={(value) => setRefundData(prev => ({ ...prev, reason: value }))}
            error={errors.reason}
            required
          />

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Additional Notes (Optional)
            </label>
            <Input
              type="textarea"
              placeholder="Add any additional notes about the refund..."
              value={refundData.notes}
              onChange={(e) => setRefundData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
            />
          </div>

          {errors.general && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">{errors.general}</p>
            </div>
          )}

          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Icon name="AlertTriangle" size={16} className="text-warning mt-0.5 flex-shrink-0" />
              <div className="text-sm text-warning-foreground">
                <p className="font-medium">Warning:</p>
                <p className="mt-1">
                  Processing refunds will update the payment status and may affect booking status.
                  This action cannot be easily undone.
                </p>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={handleSubmit}
            loading={isSubmitting}
            iconName="DollarSign"
            iconPosition="left"
            disabled={!refundData.reason || isSubmitting}
          >
            {isSubmitting ? 'Processing...' : `Process Refunds (${selectedBookings.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkRefundModal;

