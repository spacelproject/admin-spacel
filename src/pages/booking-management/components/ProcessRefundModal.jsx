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
    { value: 'service_fee', label: 'Service Fee Only' },
    { value: 'split_50_50', label: '50/50 Split (After Platform Fee)' }
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
      const firstInput = document.querySelector('[data-refund-modal] input, [data-refund-modal] select');
      firstInput?.focus();
    }
  }, [isOpen]);

  if (!isOpen || !booking) return null;

  const calculateRefundAmount = () => {
    switch (refundData?.type) {
      case 'full':
        return booking?.total || 0;
      case 'service_fee':
        return booking?.serviceFee || 0;
      case 'partial':
        return refundData?.amount || 0;
      case 'split_50_50':
        // Calculate: (Total - Platform Application Fee) / 2
        // Platform Application Fee = Service Fee + Processing Fee + Commission
        const totalPaid = booking?.total || 0;
        const serviceFee = booking?.serviceFee || 0;
        const processingFee = booking?.processingFee || 0;
        const commission = booking?.raw?.commission_partner || 0;
        const platformFee = serviceFee + processingFee + commission;
        const remainingAfterFee = totalPaid - platformFee;
        return remainingAfterFee / 2; // 50% of remaining
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
      showToast('Refund amount must be greater than A$0', 'error');
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
      await onProcessRefund?.(booking?.id, refundAmount, refundData?.type, refundData?.reason, refundData?.notes);
      showToast(`Refund of A$${(Math.round((refundAmount || 0) * 100) / 100).toFixed(2)} processed successfully`, 'success');
      handleClose();
    } catch (error) {
      console.error('❌ [MODAL] Error processing refund:', error);
      const errorMessage = error?.message || error?.error_description || 'Unknown error occurred. Please check the transaction ID and try again.';
      showToast(`Failed to process refund: ${errorMessage}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
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
    <div className="fixed inset-0 z-modal flex items-stretch justify-end" data-refund-modal>
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
                Process refund
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
            {/* Booking Summary */}
            <div className="rounded-2xl bg-card px-5 py-4 shadow-sm">
              <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground mb-3">
                Booking Summary
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Guest:</span>
                  <p className="font-semibold text-foreground mt-0.5">{booking?.guestName}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Payment Method:</span>
                  <p className="font-semibold text-foreground mt-0.5">{booking?.paymentMethod}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Base Amount:</span>
                  <p className="font-semibold text-foreground mt-0.5">A${(booking?.baseAmount || booking?.subtotal || 0).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Service Fee:</span>
                  <p className="font-semibold text-foreground mt-0.5">A${(booking?.serviceFee || 0).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Processing Fee:</span>
                  <p className="font-semibold text-foreground mt-0.5">A${(booking?.processingFee || 0).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Total Paid:</span>
                  <p className="font-semibold text-foreground mt-0.5">A${(booking?.total || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Refund Details */}
            <div className="rounded-2xl bg-card px-5 py-4 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                Refund Details
              </h3>
              
              <Select
                label="Refund Type"
                options={refundTypeOptions}
                value={refundData?.type}
                onChange={(value) => handleInputChange('type', value)}
                required
                disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              )}

              {refundData?.type === 'split_50_50' && (
                <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Paid:</span>
                    <span className="font-semibold">A${(booking?.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Platform Fee:</span>
                    <span className="font-semibold">
                      A${((booking?.serviceFee || 0) + (booking?.processingFee || 0) + (booking?.raw?.commission_partner || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-muted-foreground">Remaining (50/50 Split):</span>
                    <span className="font-semibold">
                      {(() => {
                        const total = booking?.total || 0;
                        const serviceFee = booking?.serviceFee || 0;
                        const processingFee = booking?.processingFee || 0;
                        const commission = booking?.raw?.commission_partner || 0;
                        const platformFee = serviceFee + processingFee + commission;
                        const remaining = (total - platformFee) / 2;
                        return `A$${remaining.toFixed(2)} each`;
                      })()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Platform keeps full application fee. Remaining amount split equally between seeker and partner.
                  </p>
                </div>
              )}

              <Select
                label="Refund Reason"
                options={refundReasonOptions}
                value={refundData?.reason}
                onChange={(value) => handleInputChange('reason', value)}
                placeholder="Select reason for refund"
                required
                disabled={isSubmitting}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Additional Notes (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm resize-none"
                  rows={4}
                  placeholder="Enter any additional notes about the refund"
                  value={refundData?.notes}
                  onChange={(e) => handleInputChange('notes', e?.target?.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Refund Summary */}
            <div className="rounded-2xl bg-primary/5 border border-primary/20 px-5 py-4 shadow-sm">
              <div className="flex items-center space-x-2 mb-2">
                <Icon name="Info" size={16} className="text-primary flex-shrink-0" />
                <h4 className="text-sm font-semibold text-foreground">Refund Summary</h4>
              </div>
              {refundData?.type === 'split_50_50' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Seeker Refund:</span>
                    <span className="text-lg font-bold text-primary">A${(Math.round((refundAmount || 0) * 100) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Partner Refund:</span>
                    <span className="text-lg font-bold text-primary">A${(Math.round((refundAmount || 0) * 100) / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-primary/20 pt-2">
                    <span className="text-sm font-semibold text-foreground">Total Refunded:</span>
                    <span className="text-lg font-bold text-primary">A${(Math.round((refundAmount || 0) * 200) / 100).toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount to be refunded:</span>
                  <span className="text-lg font-bold text-primary">A${(Math.round((refundAmount || 0) * 100) / 100).toFixed(2)}</span>
                </div>
              )}
            </div>
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
            variant="destructive" 
            onClick={handleSubmit}
            loading={isSubmitting}
            iconName="DollarSign"
            iconPosition="left"
            disabled={!refundData?.reason || refundAmount <= 0}
            size="sm"
          >
            {isSubmitting ? 'Processing...' : `Process A$${(Math.round((refundAmount || 0) * 100) / 100).toFixed(2)}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProcessRefundModal;
