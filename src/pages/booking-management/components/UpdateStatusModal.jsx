import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { useToast } from '../../../components/ui/Toast';

const UpdateStatusModal = ({ isOpen, onClose, booking, onUpdateStatus }) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const statusOptions = [
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'pending', label: 'Pending' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'completed', label: 'Completed' }
  ];

  useEffect(() => {
    if (booking) {
      setSelectedStatus(booking?.status || '');
    }
  }, [booking]);

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

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onUpdateStatus?.(booking?.id, selectedStatus);
      showToast(`Booking status updated to ${selectedStatus}`, 'success');
      handleClose();
    } catch (error) {
      console.error('Error updating status:', error);
      showToast('Failed to update booking status', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedStatus(booking?.status || '');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon name="RefreshCw" size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Update Booking Status</h2>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Booking Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Guest:</span>
              <span className="text-sm font-medium text-foreground">{booking?.guestName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Space:</span>
              <span className="text-sm font-medium text-foreground">{booking?.spaceName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Status:</span>
              <span className={`text-sm font-medium capitalize ${getStatusColor(booking?.status)}`}>
                {booking?.status}
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <Select
              label="New Status"
              options={statusOptions}
              value={selectedStatus}
              onChange={(value) => setSelectedStatus(value)}
              placeholder="Select new status"
              required
            />
          </div>

          {selectedStatus && selectedStatus !== booking?.status && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Icon name="Info" size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Status Change Impact:</p>
                  <p className="mt-1">
                    {selectedStatus === 'cancelled' && 'This will cancel the booking and may trigger refund processes.'}
                    {selectedStatus === 'confirmed' && 'This will confirm the booking and notify the guest.'}
                    {selectedStatus === 'completed' && 'This marks the booking as completed.'}
                    {selectedStatus === 'pending' && 'This will set the booking back to pending review.'}
                  </p>
                </div>
              </div>
            </div>
          )}
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
            variant="default" 
            onClick={handleSubmit}
            loading={isSubmitting}
            iconName="RefreshCw"
            iconPosition="left"
            disabled={!selectedStatus || selectedStatus === booking?.status}
          >
            {isSubmitting ? 'Updating...' : 'Update Status'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UpdateStatusModal;