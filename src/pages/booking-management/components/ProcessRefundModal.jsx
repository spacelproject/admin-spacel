import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { useToast } from '../../../components/ui/Toast';

const ProcessRefundModal = ({ isOpen, onClose, booking, onProcessRefund }) => {
  const [refundData, setRefundData] = useState({
    type: 'full',
    amount: 0,
    reason: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const refundTypeOptions = [
    { value: 'full', label: 'Full Refund' },
    { value: 'partial', label: 'Partial Refund' },
    { value: 'service_fee', label: 'Service Fee Only' }
  ];

  const refundReasonOptions = [
    { value: 'guest_request', label: 'Guest Request' },
    { value: 'host_cancellation', label: 'Host Cancellation' },
    { value: 'property_issue', label: 'Property Issue' },
    { value: 'system_error', label: 'System Error' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    if (booking) {
      setRefundData({
        type: 'full',
        amount: booking?.total || 0,
        reason: '',
        notes: ''
      });
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const calculateRefundAmount = () => {
    switch (refundData?.type) {
      case 'full':
        return booking?.total || 0;
      case 'service_fee':
        return booking?.serviceFee || 0;
      case 'partial':
        return refundData?.amount || 0;
      default:
        return 0;
    }
  };

  const handleInputChange = (field, value) => {
    setRefundData(prev => ({ 
      ...prev, 
      [field]: value,
      ...(field === 'type' && value !== 'partial' ? { amount: calculateRefundAmount() } : {})
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    const refundAmount = calculateRefundAmount();
    
    if (!refundData?.reason) {
      showToast('Please select a refund reason', 'error');
      return;
    }

    if (refundAmount <= 0) {
      showToast('Refund amount must be greater than $0', 'error');
      return;
    }

    if (refundAmount > booking?.total) {
      showToast('Refund amount cannot exceed booking total', 'error');
      return;
    }

    if (booking?.paymentStatus === 'refunded') {
      showToast('This booking has already been refunded', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const refundInfo = {
        bookingId: booking?.id,
        type: refundData?.type,
        amount: refundAmount,
        reason: refundData?.reason,
        notes: refundData?.notes,
        processedAt: new Date()?.toISOString()
      };

      onProcessRefund?.(refundInfo);
      showToast(`Refund of $${refundAmount} processed successfully`, 'success');
      handleClose();
    } catch (error) {
      console.error('Error processing refund:', error);
      showToast('Failed to process refund', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRefundData({
      type: 'full',
      amount: booking?.total || 0,
      reason: '',
      notes: ''
    });
    setIsSubmitting(false);
    onClose();
  };

  const refundAmount = calculateRefundAmount();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Icon name="DollarSign" size={20} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Process Refund</h2>
              <p className="text-sm text-muted-foreground">Booking ID: {booking?.id}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Booking Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-foreground">Booking Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Guest:</span>
                <p className="font-medium text-foreground">{booking?.guestName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Payment Method:</span>
                <p className="font-medium text-foreground">{booking?.paymentMethod}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Subtotal:</span>
                <p className="font-medium text-foreground">${booking?.subtotal}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Service Fee:</span>
                <p className="font-medium text-foreground">${booking?.serviceFee}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Taxes:</span>
                <p className="font-medium text-foreground">${booking?.taxes}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Paid:</span>
                <p className="font-semibold text-foreground">${booking?.total}</p>
              </div>
            </div>
          </div>

          {/* Refund Details */}
          <div className="space-y-4">
            <h3 className="font-medium text-foreground">Refund Details</h3>
            
            <Select
              label="Refund Type"
              options={refundTypeOptions}
              value={refundData?.type}
              onChange={(value) => handleInputChange('type', value)}
              required
            />

            {refundData?.type === 'partial' && (
              <Input
                label="Custom Refund Amount"
                type="number"
                placeholder="Enter amount"
                value={refundData?.amount}
                onChange={(e) => handleInputChange('amount', parseFloat(e?.target?.value) || 0)}
                min={0}
                max={booking?.total}
                step="0.01"
                required
              />
            )}

            <Select
              label="Refund Reason"
              options={refundReasonOptions}
              value={refundData?.reason}
              onChange={(value) => handleInputChange('reason', value)}
              placeholder="Select reason for refund"
              required
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Additional Notes (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                rows={3}
                placeholder="Enter any additional notes about the refund"
                value={refundData?.notes}
                onChange={(e) => handleInputChange('notes', e?.target?.value)}
              />
            </div>
          </div>

          {/* Refund Summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Icon name="Info" size={16} className="text-primary" />
              <h4 className="font-medium text-foreground">Refund Summary</h4>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount to be refunded:</span>
              <span className="text-lg font-semibold text-primary">${refundAmount}</span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleSubmit}
            loading={isSubmitting}
            iconName="DollarSign"
            iconPosition="left"
            disabled={!refundData?.reason || refundAmount <= 0}
          >
            {isSubmitting ? 'Processing Refund...' : `Process $${refundAmount} Refund`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProcessRefundModal;