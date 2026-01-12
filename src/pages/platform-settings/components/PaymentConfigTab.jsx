import React, { useState, useEffect, useRef } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';
import useFeeSettings from '../../../hooks/useFeeSettings';
import usePlatformSettings from '../../../hooks/usePlatformSettings';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorState from '../../../components/ui/ErrorState';
import { useToast } from '../../../components/ui/Toast';
import { fetchFeeSettings } from '../../../utils/feeCalculator';
import PromotionalRatesSection from './PromotionalRates/PromotionalRatesSection';

const PaymentConfigTab = () => {
  const { showToast } = useToast();
  const { feeSettings, loading: feeLoading, saving: feeSaving, error: feeError, lastUpdated, saveFeeSettings } = useFeeSettings();
  const { settings: paymentMethodSettings, loading: paymentMethodsLoading, saving: paymentMethodsSaving, saveSettings } = usePlatformSettings('payment_methods');
  const { settings: cancellationSettings, loading: cancellationLoading, saving: cancellationSaving, saveSettings: saveCancellationSettings } = usePlatformSettings('cancellation_policy');
  
  const [localFeeSettings, setLocalFeeSettings] = useState({
    seekerServiceRate: 12.0,
    partnerFeeRate: 4.0,
    processingPercent: 1.75
  });
  
  const [localPaymentSettings, setLocalPaymentSettings] = useState({
    cardsPaymentMethod: false,
    stripeLink: false,
    applePay: false,
    googlePay: false
  });

  const [cancellationMinimumHours, setCancellationMinimumHours] = useState(1);
  const [cancellationChanged, setCancellationChanged] = useState(false);

  const initialFeeSettingsRef = useRef(null);
  const initialPaymentSettingsRef = useRef(null);
  const [feeChangedKeys, setFeeChangedKeys] = useState([]);
  const [paymentChangedKeys, setPaymentChangedKeys] = useState([]);

  // Initialize local state from fetched settings
  useEffect(() => {
    if (!feeLoading && feeSettings) {
      setLocalFeeSettings(feeSettings);
      if (!initialFeeSettingsRef.current) {
        initialFeeSettingsRef.current = { ...feeSettings };
      }
      // Pre-fetch fee settings to initialize cache when component loads
      fetchFeeSettings(true).catch(err => {
        console.error('Error pre-fetching fee settings:', err);
      });
    }
  }, [feeSettings, feeLoading]);

  useEffect(() => {
    if (!paymentMethodsLoading && paymentMethodSettings) {
      const paymentSettings = {
        cardsPaymentMethod:
          paymentMethodSettings.cardsPaymentMethod !== undefined
            ? paymentMethodSettings.cardsPaymentMethod
            : false,
        stripeLink:
          paymentMethodSettings.stripeLink !== undefined
            ? paymentMethodSettings.stripeLink
            : false,
        applePay:
          paymentMethodSettings.applePay !== undefined
            ? paymentMethodSettings.applePay
            : false,
        googlePay:
          paymentMethodSettings.googlePay !== undefined
            ? paymentMethodSettings.googlePay
            : false
      };
      setLocalPaymentSettings(paymentSettings);
      if (!initialPaymentSettingsRef.current) {
        initialPaymentSettingsRef.current = { ...paymentSettings };
      }
    }
  }, [paymentMethodSettings, paymentMethodsLoading]);

  // Initialize cancellation minimum hours from database
  useEffect(() => {
    if (!cancellationLoading && cancellationSettings) {
      const rawHours = cancellationSettings.cancellation_minimum_hours;
      const parsedHours =
        typeof rawHours === 'number'
          ? rawHours
          : parseFloat(rawHours || '1');
      setCancellationMinimumHours(isNaN(parsedHours) ? 1 : parsedHours);

      setCancellationChanged(false);
    }
  }, [cancellationLoading, cancellationSettings]);

  // Track changes in cancellation settings
  useEffect(() => {
    if (cancellationSettings) {
      const originalHoursRaw = cancellationSettings.cancellation_minimum_hours;
      const originalHours =
        typeof originalHoursRaw === 'number'
          ? originalHoursRaw
          : parseFloat(originalHoursRaw || '1');
      const safeOriginalHours = isNaN(originalHours) ? 1 : originalHours;

      setCancellationChanged(
        cancellationMinimumHours !== safeOriginalHours
      );
    }
  }, [cancellationMinimumHours, cancellationSettings]);

  // Track changes in fee settings
  useEffect(() => {
    if (initialFeeSettingsRef.current) {
      const changed = [];
      Object.keys(localFeeSettings).forEach(key => {
        if (localFeeSettings[key] !== initialFeeSettingsRef.current[key]) {
          changed.push(key);
        }
      });
      setFeeChangedKeys(changed);
    }
  }, [localFeeSettings]);

  // Track changes in payment settings
  useEffect(() => {
    if (initialPaymentSettingsRef.current) {
      const changed = [];
      Object.keys(localPaymentSettings).forEach(key => {
        const current = localPaymentSettings[key];
        const initial = initialPaymentSettingsRef.current[key];
        if (Array.isArray(current) && Array.isArray(initial)) {
          if (JSON.stringify(current.sort()) !== JSON.stringify(initial.sort())) {
            changed.push(key);
          }
        } else if (current !== initial) {
          changed.push(key);
        }
      });
      setPaymentChangedKeys(changed);
    }
  }, [localPaymentSettings]);

  const handleFeeInputChange = (field, value) => {
    setLocalFeeSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePaymentInputChange = (field, value) => {
    setLocalPaymentSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSavePaymentMethods = async () => {
    if (paymentChangedKeys.length === 0) {
      showToast('No payment method changes to save', 'info');
      return;
    }

    const paymentSaved = await saveSettings(localPaymentSettings, paymentChangedKeys);
    if (paymentSaved) {
      initialPaymentSettingsRef.current = { ...localPaymentSettings };
      setPaymentChangedKeys([]);
    }
  };

  const handleSaveFeeSettings = async () => {
    if (feeChangedKeys.length === 0) {
      showToast('No fee changes to save', 'info');
      return;
    }

    const feeSaved = await saveFeeSettings(localFeeSettings);
    if (feeSaved) {
      initialFeeSettingsRef.current = { ...localFeeSettings };
      setFeeChangedKeys([]);
    }
  };

  const handleSave = async () => {
    let saved = true;

    // Save fee settings if changed
    if (feeChangedKeys.length > 0) {
      const feeSaved = await saveFeeSettings(localFeeSettings);
      if (feeSaved) {
        initialFeeSettingsRef.current = { ...localFeeSettings };
        setFeeChangedKeys([]);
      }
      saved = saved && feeSaved;
    }

    // Save payment settings if changed
    if (paymentChangedKeys.length > 0) {
      const paymentSaved = await saveSettings(localPaymentSettings, paymentChangedKeys);
      if (paymentSaved) {
        initialPaymentSettingsRef.current = { ...localPaymentSettings };
        setPaymentChangedKeys([]);
      }
      saved = saved && paymentSaved;
    }

    // Save cancellation settings if changed
    if (cancellationChanged) {
      const cancellationSaved = await saveCancellationSettings(
        {
          cancellation_minimum_hours: cancellationMinimumHours
        },
        ['cancellation_minimum_hours']
      );
      if (cancellationSaved) {
        setCancellationChanged(false);
      }
      saved = saved && cancellationSaved;
    }

    if (
      saved &&
      feeChangedKeys.length === 0 &&
      paymentChangedKeys.length === 0 &&
      !cancellationChanged
    ) {
      showToast('No changes to save', 'info');
    }
  };

  const handleReset = () => {
    if (initialFeeSettingsRef.current) {
      setLocalFeeSettings({ ...initialFeeSettingsRef.current });
      setFeeChangedKeys([]);
    }
    if (initialPaymentSettingsRef.current) {
      setLocalPaymentSettings({ ...initialPaymentSettingsRef.current });
      setPaymentChangedKeys([]);
    }
    if (cancellationSettings) {
      const rawHours = cancellationSettings.cancellation_minimum_hours;
      const parsedHours =
        typeof rawHours === 'number'
          ? rawHours
          : parseFloat(rawHours || '1');
      setCancellationMinimumHours(isNaN(parsedHours) ? 1 : parsedHours);

      setCancellationChanged(false);
    }
  };

  const hasChanges =
    feeChangedKeys.length > 0 ||
    paymentChangedKeys.length > 0 ||
    cancellationChanged;
  const isLoading =
    feeLoading || paymentMethodsLoading || cancellationLoading;
  const isSaving =
    feeSaving || paymentMethodsSaving || cancellationSaving;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (feeError) {
    return <ErrorState message={feeError} />;
  }

  return (
    <div className="space-y-8">
      {/* Payment Methods */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="CreditCard" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Payment Methods</h3>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Checkbox
              label="Cards Payment Method"
              description="Credit/debit cards, bank transfers"
              checked={localPaymentSettings.cardsPaymentMethod}
              onChange={(e) => handlePaymentInputChange('cardsPaymentMethod', e.target.checked)}
              disabled={isSaving}
            />
            
            <Checkbox
              label="Stripe Link"
              description="Frictionless checkout links powered by Stripe"
              checked={localPaymentSettings.stripeLink}
              onChange={(e) => handlePaymentInputChange('stripeLink', e.target.checked)}
              disabled={isSaving}
            />

            <Checkbox
              label="Apple Pay"
              description="Quick payments on iOS devices"
              checked={localPaymentSettings.applePay}
              onChange={(e) => handlePaymentInputChange('applePay', e.target.checked)}
              disabled={isSaving}
            />
            
            <Checkbox
              label="Google Pay"
              description="Fast checkout with Google Pay"
              checked={localPaymentSettings.googlePay}
              onChange={(e) => handlePaymentInputChange('googlePay', e.target.checked)}
              disabled={isSaving}
            />
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              {paymentChangedKeys.length > 0 && (
                <span className="text-warning">You have unsaved payment method changes</span>
              )}
            </div>
            <Button
              variant="default"
              onClick={handleSavePaymentMethods}
              disabled={paymentChangedKeys.length === 0 || isSaving}
              iconName="Save"
              iconPosition="left"
            >
              {isSaving ? 'Saving...' : 'Save Payment Methods'}
            </Button>
          </div>
        </div>
      </div>

      {/* Fee Structure */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Calculator" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Fee Structure</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Seeker Service Fee (%)"
            type="number"
            value={localFeeSettings.seekerServiceRate ?? ''}
            onChange={(e) => handleFeeInputChange('seekerServiceRate', parseFloat(e.target.value) || 0)}
            description="Service fee charged to seekers (guests)"
            min="0"
            max="30"
            step="0.1"
            required
            disabled={isSaving}
          />
          
          <Input
            label="Partner Fee Rate (%)"
            type="number"
            value={localFeeSettings.partnerFeeRate ?? ''}
            onChange={(e) => handleFeeInputChange('partnerFeeRate', parseFloat(e.target.value) || 0)}
            description="Commission charged to space owners (partners)"
            min="0"
            max="30"
            step="0.1"
            required
            disabled={isSaving}
          />
          
          <Input
            label="Processing Fee (%)"
            type="number"
            value={localFeeSettings.processingPercent ?? ''}
            onChange={(e) => handleFeeInputChange('processingPercent', parseFloat(e.target.value) || 0)}
            description="Payment processor fee percentage"
            min="0"
            max="10"
            step="0.01"
            required
            disabled={isSaving}
          />
        </div>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-foreground mb-2">Fee Calculation Example</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Booking Amount: A$100.00</p>
            <p>Seeker Service Fee ({localFeeSettings.seekerServiceRate || 0}%): A${(100 * (localFeeSettings.seekerServiceRate || 0) / 100).toFixed(2)}</p>
            <p>Partner Fee ({localFeeSettings.partnerFeeRate || 0}%): A${(100 * (localFeeSettings.partnerFeeRate || 0) / 100).toFixed(2)}</p>
            <p>Processing Fee ({(localFeeSettings.processingPercent || 0)}%): A${((100 * (localFeeSettings.processingPercent || 0) / 100)).toFixed(2)}</p>
            <p className="font-medium text-foreground">Space Owner Receives: A${(100 - (100 * (localFeeSettings.partnerFeeRate || 0) / 100) - (100 * (localFeeSettings.processingPercent || 0) / 100)).toFixed(2)}</p>
          </div>
        </div>

        {/* Fee Structure Save Button */}
        <div className="mt-6 pt-6 border-t border-border flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            {feeChangedKeys.length > 0 && (
              <span className="text-warning">You have unsaved changes</span>
            )}
          </div>
          <Button
            variant="default"
            onClick={handleSaveFeeSettings}
            disabled={feeChangedKeys.length === 0 || isSaving}
            iconName="Save"
            iconPosition="left"
          >
            {isSaving ? 'Saving...' : 'Save Fee Structure'}
          </Button>
        </div>
      </div>

      {/* Promotional Rates */}
      <PromotionalRatesSection />

      {/* Policies */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Shield" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Payment Policies</h3>
        </div>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-md">
            <Input
              label="Cancellation Minimum Hours"
              type="number"
              value={cancellationMinimumHours}
              onChange={(e) => setCancellationMinimumHours(parseFloat(e.target.value) || 0)}
              description="Minimum number of hours before the booking start time that a seeker can cancel to receive this refund."
              min="0"
              max="240"
              step="1"
              required
              disabled={isSaving}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Clock" size={16} />
          <span>
            {lastUpdated 
              ? `Last updated: ${new Date(lastUpdated).toLocaleString()}`
              : 'No updates yet'
            }
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
          >
            Reset Changes
          </Button>
          
          <Button
            variant="default"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            iconName="Save"
            iconPosition="left"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfigTab;