import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const DisablePayoutModal = ({ 
  user, 
  isOpen, 
  onClose, 
  onConfirm, 
  isProcessing = false 
}) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [showCustomReason, setShowCustomReason] = useState(false);

  if (!isOpen || !user) return null;

  const reasonOptions = [
    { value: '', label: 'Select a reason (optional)' },
    { value: 'Payment disputes / chargeback abuse', label: 'Payment disputes / chargeback abuse' },
    { value: 'Fraud / suspicious activity', label: 'Fraud / suspicious activity' },
    { value: 'Violation of platform policies', label: 'Violation of platform policies' },
    { value: 'Account verification pending', label: 'Account verification pending' },
    { value: 'Bank account verification required', label: 'Bank account verification required' },
    { value: 'Tax documentation incomplete', label: 'Tax documentation incomplete' },
    { value: 'other', label: 'Other (write custom reason)' }
  ];

  const handleReasonChange = (value) => {
    setReason(value);
    setShowCustomReason(value === 'other');
    if (value !== 'other') {
      setCustomReason('');
    }
  };

  const handleConfirm = () => {
    const finalReason = showCustomReason ? customReason.trim() : reason;
    onConfirm(user.id, !user.payoutDisabled, finalReason || null);
  };

  const handleClose = () => {
    setReason('');
    setCustomReason('');
    setShowCustomReason(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${user.payoutDisabled ? 'bg-green-100' : 'bg-red-100'}`}>
              <Icon 
                name={user.payoutDisabled ? 'CheckCircle' : 'Ban'} 
                size={24} 
                className={user.payoutDisabled ? 'text-green-600' : 'text-red-600'} 
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {user.payoutDisabled ? 'Enable' : 'Disable'} Payout Requests
              </h2>
              <p className="text-sm text-muted-foreground">
                {user.name} ({user.email})
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={handleClose}
            disabled={isProcessing}
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {user.payoutDisabled ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Icon name="Info" size={20} className="text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Payout is currently disabled
                  </p>
                  {user.payoutDisabledReason && (
                    <p className="text-xs text-green-700 mt-1">
                      Reason: {user.payoutDisabledReason}
                    </p>
                  )}
                  {user.payoutDisabledAt && (
                    <p className="text-xs text-green-700 mt-1">
                      Disabled on: {new Date(user.payoutDisabledAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Icon name="AlertTriangle" size={20} className="text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    This will prevent the user from requesting payouts
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    The user will not be able to create new payout requests until this is re-enabled.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!user.payoutDisabled && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Reason for disabling payout (optional)
              </label>
              <Select
                value={reason}
                onChange={(e) => handleReasonChange(e.target.value)}
                options={reasonOptions}
                disabled={isProcessing}
              />
              
              {showCustomReason && (
                <div className="mt-2">
                  <Input
                    type="text"
                    placeholder="Enter custom reason..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    disabled={isProcessing}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant={user.payoutDisabled ? 'default' : 'destructive'}
            onClick={handleConfirm}
            disabled={isProcessing || (showCustomReason && !customReason.trim())}
            iconName={isProcessing ? 'Loader2' : (user.payoutDisabled ? 'CheckCircle' : 'Ban')}
            className={isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {isProcessing 
              ? (user.payoutDisabled ? 'Enabling...' : 'Disabling...')
              : (user.payoutDisabled ? 'Enable Payout' : 'Disable Payout')
            }
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DisablePayoutModal;

