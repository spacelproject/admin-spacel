import React, { useMemo, useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const SuspendSpaceModal = ({ isOpen, space, onClose, onConfirm, isProcessing = false }) => {
  const [preset, setPreset] = useState('');
  const [customReason, setCustomReason] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setPreset('');
      setCustomReason('');
    }
  }, [isOpen]);

  const reasonOptions = useMemo(
    () => [
      { value: '', label: 'Choose a reason (optional)' },
      { value: 'Violation of platform policies', label: 'Violation of platform policies' },
      { value: 'Fraud / suspicious activity', label: 'Fraud / suspicious activity' },
      { value: 'Spam / misuse of features', label: 'Spam / misuse of features' },
      { value: 'Payment disputes / chargeback abuse', label: 'Payment disputes / chargeback abuse' },
      { value: 'Content violations', label: 'Content violations' },
      { value: 'Safety / trust concerns', label: 'Safety / trust concerns' },
      { value: 'Identity / verification issue', label: 'Identity / verification issue' },
      { value: 'Duplicate accounts / policy breach', label: 'Duplicate accounts / policy breach' },
      { value: 'other', label: 'Other (write custom reason)' }
    ],
    []
  );

  if (!isOpen || !space) return null;

  // Allow admins to always type their own reason.
  // If both preset + custom are provided, store them combined for clarity.
  const finalReason = (() => {
    const p = preset && preset !== 'other' ? preset.trim() : '';
    const c = customReason?.trim() || '';
    if (p && c) return `${p} — ${c}`;
    return c || p || null;
  })();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-md">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">Suspend Space</h3>
            <Button variant="ghost" size="sm" iconName="X" onClick={onClose} />
          </div>

          <div className="text-sm text-muted-foreground">
            You are about to suspend <span className="font-medium text-foreground">{space?.name}</span>.
          </div>

          <Select
            label="Suspension reason"
            options={reasonOptions}
            value={preset}
            onChange={(value) => setPreset(value)}
          />

          <Input
            label="Custom reason (optional)"
            type="text"
            placeholder="Write a brief reason..."
            value={customReason}
            onChange={(e) => setCustomReason(e?.target?.value)}
          />

          <div className="flex items-center justify-end space-x-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => onConfirm(finalReason)}
              disabled={isProcessing}
              iconName="Ban"
              iconPosition="left"
            >
              {isProcessing ? 'Suspending...' : 'Suspend'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuspendSpaceModal;


