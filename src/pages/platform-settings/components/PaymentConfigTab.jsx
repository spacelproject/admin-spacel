import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const PaymentConfigTab = () => {
  const [paymentSettings, setPaymentSettings] = useState({
    defaultCurrency: "USD",
    supportedCurrencies: ["USD", "EUR", "GBP"],
    stripeEnabled: true,
    paypalEnabled: true,
    applePayEnabled: false,
    googlePayEnabled: false,
    platformFeePercentage: 5.0,
    processingFeePercentage: 2.9,
    fixedProcessingFee: 0.30,
    payoutSchedule: "weekly",
    minimumPayout: 50.00,
    refundPolicy: "flexible",
    taxCalculation: true,
    invoiceGeneration: true
  });

  const [isChanged, setIsChanged] = useState(false);

  const currencyOptions = [
    { value: "USD", label: "US Dollar ($)" },
    { value: "EUR", label: "Euro (€)" },
    { value: "GBP", label: "British Pound (£)" },
    { value: "CAD", label: "Canadian Dollar (C$)" },
    { value: "AUD", label: "Australian Dollar (A$)" }
  ];

  const payoutScheduleOptions = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" }
  ];

  const refundPolicyOptions = [
    { value: "strict", label: "Strict - No refunds after 24 hours" },
    { value: "moderate", label: "Moderate - 50% refund up to 7 days" },
    { value: "flexible", label: "Flexible - Full refund up to 48 hours" }
  ];

  const handleInputChange = (field, value) => {
    setPaymentSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setIsChanged(true);
  };

  const handleSave = () => {
    console.log('Saving payment settings:', paymentSettings);
    setIsChanged(false);
  };

  const handleReset = () => {
    setPaymentSettings({
      defaultCurrency: "USD",
      supportedCurrencies: ["USD", "EUR", "GBP"],
      stripeEnabled: true,
      paypalEnabled: true,
      applePayEnabled: false,
      googlePayEnabled: false,
      platformFeePercentage: 5.0,
      processingFeePercentage: 2.9,
      fixedProcessingFee: 0.30,
      payoutSchedule: "weekly",
      minimumPayout: 50.00,
      refundPolicy: "flexible",
      taxCalculation: true,
      invoiceGeneration: true
    });
    setIsChanged(false);
  };

  return (
    <div className="space-y-8">
      {/* Currency Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="DollarSign" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Currency Configuration</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Default Currency"
            options={currencyOptions}
            value={paymentSettings.defaultCurrency}
            onChange={(value) => handleInputChange('defaultCurrency', value)}
            description="Primary currency for the platform"
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Supported Currencies
            </label>
            <div className="space-y-2">
              {currencyOptions.map((currency) => (
                <Checkbox
                  key={currency.value}
                  label={currency.label}
                  checked={paymentSettings.supportedCurrencies.includes(currency.value)}
                  onChange={(e) => {
                    const newCurrencies = e.target.checked
                      ? [...paymentSettings.supportedCurrencies, currency.value]
                      : paymentSettings.supportedCurrencies.filter(c => c !== currency.value);
                    handleInputChange('supportedCurrencies', newCurrencies);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="CreditCard" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Payment Methods</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Checkbox
              label="Stripe"
              description="Credit/debit cards, bank transfers"
              checked={paymentSettings.stripeEnabled}
              onChange={(e) => handleInputChange('stripeEnabled', e.target.checked)}
            />
            
            <Checkbox
              label="PayPal"
              description="PayPal wallet and express checkout"
              checked={paymentSettings.paypalEnabled}
              onChange={(e) => handleInputChange('paypalEnabled', e.target.checked)}
            />
          </div>
          
          <div className="space-y-4">
            <Checkbox
              label="Apple Pay"
              description="Quick payments on iOS devices"
              checked={paymentSettings.applePayEnabled}
              onChange={(e) => handleInputChange('applePayEnabled', e.target.checked)}
            />
            
            <Checkbox
              label="Google Pay"
              description="Fast checkout with Google Pay"
              checked={paymentSettings.googlePayEnabled}
              onChange={(e) => handleInputChange('googlePayEnabled', e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* Fee Structure */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Calculator" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Fee Structure</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label="Platform Fee (%)"
            type="number"
            value={paymentSettings.platformFeePercentage}
            onChange={(e) => handleInputChange('platformFeePercentage', parseFloat(e.target.value))}
            description="Commission charged to space owners"
            min="0"
            max="30"
            step="0.1"
            required
          />
          
          <Input
            label="Processing Fee (%)"
            type="number"
            value={paymentSettings.processingFeePercentage}
            onChange={(e) => handleInputChange('processingFeePercentage', parseFloat(e.target.value))}
            description="Payment processor fee percentage"
            min="0"
            max="10"
            step="0.1"
            required
          />
          
          <Input
            label="Fixed Processing Fee ($)"
            type="number"
            value={paymentSettings.fixedProcessingFee}
            onChange={(e) => handleInputChange('fixedProcessingFee', parseFloat(e.target.value))}
            description="Fixed fee per transaction"
            min="0"
            step="0.01"
            required
          />
        </div>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-foreground mb-2">Fee Calculation Example</h4>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Booking Amount: $100.00</p>
            <p>Platform Fee ({paymentSettings.platformFeePercentage}%): ${(100 * paymentSettings.platformFeePercentage / 100).toFixed(2)}</p>
            <p>Processing Fee ({paymentSettings.processingFeePercentage}% + ${paymentSettings.fixedProcessingFee}): ${((100 * paymentSettings.processingFeePercentage / 100) + paymentSettings.fixedProcessingFee).toFixed(2)}</p>
            <p className="font-medium text-foreground">Space Owner Receives: ${(100 - (100 * paymentSettings.platformFeePercentage / 100) - ((100 * paymentSettings.processingFeePercentage / 100) + paymentSettings.fixedProcessingFee)).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Payout Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Banknote" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Payout Configuration</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Payout Schedule"
            options={payoutScheduleOptions}
            value={paymentSettings.payoutSchedule}
            onChange={(value) => handleInputChange('payoutSchedule', value)}
            description="How often payouts are processed"
            required
          />
          
          <Input
            label="Minimum Payout Amount ($)"
            type="number"
            value={paymentSettings.minimumPayout}
            onChange={(e) => handleInputChange('minimumPayout', parseFloat(e.target.value))}
            description="Minimum amount required for payout"
            min="1"
            step="0.01"
            required
          />
        </div>
      </div>

      {/* Policies */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Shield" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Payment Policies</h3>
        </div>
        
        <div className="space-y-6">
          <Select
            label="Refund Policy"
            options={refundPolicyOptions}
            value={paymentSettings.refundPolicy}
            onChange={(value) => handleInputChange('refundPolicy', value)}
            description="Default refund policy for bookings"
            required
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Checkbox
              label="Automatic Tax Calculation"
              description="Calculate and apply taxes based on location"
              checked={paymentSettings.taxCalculation}
              onChange={(e) => handleInputChange('taxCalculation', e.target.checked)}
            />
            
            <Checkbox
              label="Invoice Generation"
              description="Automatically generate invoices for bookings"
              checked={paymentSettings.invoiceGeneration}
              onChange={(e) => handleInputChange('invoiceGeneration', e.target.checked)}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Clock" size={16} />
          <span>Last updated: July 17, 2025 at 5:28 AM</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!isChanged}
          >
            Reset Changes
          </Button>
          
          <Button
            variant="default"
            onClick={handleSave}
            disabled={!isChanged}
            iconName="Save"
            iconPosition="left"
          >
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentConfigTab;