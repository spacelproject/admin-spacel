import React, { useState, useEffect, useRef } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import ErrorState from '../../../components/ui/ErrorState';
import usePlatformSettings from '../../../hooks/usePlatformSettings';
import { useToast } from '../../../components/ui/Toast';
import { logDebug } from '../../../utils/logger';

const NotificationSettingsTab = () => {
  const { showToast } = useToast();
  const {
    settings: platformSettings,
    loading,
    saving,
    error,
    lastUpdated,
    saveSettings: savePlatformSettings,
    resetSettings: resetPlatformSettings,
    refetch: refetchPlatformSettings,
  } = usePlatformSettings('notifications');

  const [localSettings, setLocalSettings] = useState({});
  const initialSettingsRef = useRef({});

  useEffect(() => {
    if (!loading) {
      setLocalSettings(platformSettings);
      initialSettingsRef.current = { ...platformSettings };
    }
  }, [loading, platformSettings]);

  const emailProviderOptions = [
    { value: "sendgrid", label: "SendGrid" },
    { value: "mailgun", label: "Mailgun" },
    { value: "ses", label: "Amazon SES" },
    { value: "smtp", label: "Custom SMTP" }
  ];

  const smsProviderOptions = [
    { value: "twilio", label: "Twilio" },
    { value: "nexmo", label: "Vonage (Nexmo)" },
    { value: "aws", label: "AWS SNS" }
  ];

  const templateOptions = [
    { value: "welcome", label: "Welcome Email" },
    { value: "booking_confirmation", label: "Booking Confirmation" },
    { value: "payment_receipt", label: "Payment Receipt" },
    { value: "cancellation", label: "Cancellation Notice" },
    { value: "reminder", label: "Booking Reminder" },
    { value: "password_reset", label: "Password Reset" }
  ];

  const handleInputChange = (field, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isChanged = Object.keys(localSettings).some(
    (key) => localSettings[key] !== initialSettingsRef.current[key]
  );

  const handleSave = async () => {
    const changedKeys = Object.keys(localSettings).filter(
      (key) => localSettings[key] !== initialSettingsRef.current[key]
    );
    
    if (changedKeys.length === 0) {
      showToast('No changes to save', 'info');
      return;
    }

    logDebug('Saving notification settings changes:', changedKeys);
    const success = await savePlatformSettings(localSettings, changedKeys);
    
    if (success) {
      initialSettingsRef.current = { ...localSettings };
      refetchPlatformSettings();
    }
  };

  const handleReset = () => {
    setLocalSettings(initialSettingsRef.current);
    showToast('Changes reset to last saved state', 'info');
  };

  const handleTestEmail = () => {
    showToast('Test email functionality coming soon', 'info');
  };

  if (loading) {
    return <LoadingSpinner text="Loading notification settings..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetchPlatformSettings} />;
  }

  return (
    <div className="space-y-8">
      {/* Notification Channels */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Bell" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Notification Channels</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Checkbox
            label="Email Notifications"
            description="Send notifications via email"
            checked={localSettings.emailNotifications ?? true}
            onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
            disabled={saving}
          />
          
          <Checkbox
            label="SMS Notifications"
            description="Send notifications via SMS"
            checked={localSettings.smsNotifications ?? false}
            onChange={(e) => handleInputChange('smsNotifications', e.target.checked)}
            disabled={saving}
          />
          
          <Checkbox
            label="Push Notifications"
            description="Send browser push notifications"
            checked={localSettings.pushNotifications ?? true}
            onChange={(e) => handleInputChange('pushNotifications', e.target.checked)}
            disabled={saving}
          />
        </div>
      </div>

      {/* Email Configuration */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Mail" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Email Configuration</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Email Provider"
            options={emailProviderOptions}
            value={localSettings.emailProvider || "sendgrid"}
            onChange={(value) => handleInputChange('emailProvider', value)}
            description="Email service provider"
            required
            disabled={saving}
          />
          
          <Select
            label="SMS Provider"
            options={smsProviderOptions}
            value={localSettings.smsProvider || "twilio"}
            onChange={(value) => handleInputChange('smsProvider', value)}
            description="SMS service provider"
            required
            disabled={saving}
          />
          
          <Input
            label="From Email"
            type="email"
            value={localSettings.fromEmail || ""}
            onChange={(e) => handleInputChange('fromEmail', e.target.value)}
            description="Email address for outgoing messages"
            required
            disabled={saving}
          />
          
          <Input
            label="From Name"
            type="text"
            value={localSettings.fromName || ""}
            onChange={(e) => handleInputChange('fromName', e.target.value)}
            description="Display name for outgoing emails"
            required
            disabled={saving}
          />
          
          <Input
            label="Reply-To Email"
            type="email"
            value={localSettings.replyToEmail || ""}
            onChange={(e) => handleInputChange('replyToEmail', e.target.value)}
            description="Email for user replies"
            required
            disabled={saving}
          />
          
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleTestEmail}
              iconName="Send"
              iconPosition="left"
              className="w-full"
              disabled={saving}
            >
              Send Test Email
            </Button>
          </div>
        </div>
      </div>

      {/* User Notifications */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Users" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">User Notifications</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Checkbox
              label="Welcome Email"
              description="Send welcome email to new users"
              checked={localSettings.welcomeEmail ?? true}
              onChange={(e) => handleInputChange('welcomeEmail', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="Booking Confirmation"
              description="Confirm successful bookings"
              checked={localSettings.bookingConfirmation ?? true}
              onChange={(e) => handleInputChange('bookingConfirmation', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="Payment Receipts"
              description="Send payment confirmation receipts"
              checked={localSettings.paymentReceipts ?? true}
              onChange={(e) => handleInputChange('paymentReceipts', e.target.checked)}
              disabled={saving}
            />
          </div>
          
          <div className="space-y-4">
            <Checkbox
              label="Cancellation Notice"
              description="Notify about booking cancellations"
              checked={localSettings.cancellationNotice ?? true}
              onChange={(e) => handleInputChange('cancellationNotice', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="Reminder Emails"
              description="Send booking reminders"
              checked={localSettings.reminderEmails ?? true}
              onChange={(e) => handleInputChange('reminderEmails', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="Marketing Emails"
              description="Send promotional content"
              checked={localSettings.marketingEmails ?? false}
              onChange={(e) => handleInputChange('marketingEmails', e.target.checked)}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {/* Admin Notifications */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Shield" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Admin Notifications</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Checkbox
            label="Admin Alerts"
            description="Critical system notifications"
            checked={localSettings.adminAlerts ?? true}
            onChange={(e) => handleInputChange('adminAlerts', e.target.checked)}
            disabled={saving}
          />
          
          <Checkbox
            label="System Maintenance"
            description="Maintenance and update notifications"
            checked={localSettings.systemMaintenance ?? true}
            onChange={(e) => handleInputChange('systemMaintenance', e.target.checked)}
            disabled={saving}
          />
          
          <Checkbox
            label="Security Alerts"
            description="Security-related notifications"
            checked={localSettings.securityAlerts ?? true}
            onChange={(e) => handleInputChange('securityAlerts', e.target.checked)}
            disabled={saving}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Clock" size={16} />
          <span>Last updated: {lastUpdated ? lastUpdated.toLocaleString() : 'N/A'}</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!isChanged || saving}
          >
            Reset Changes
          </Button>
          
          <Button
            variant="default"
            onClick={handleSave}
            disabled={!isChanged || saving}
            iconName="Save"
            iconPosition="left"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettingsTab;
