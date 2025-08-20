import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const NotificationSettingsTab = () => {
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    emailProvider: "sendgrid",
    smsProvider: "twilio",
    fromEmail: "noreply@spacio.com",
    fromName: "SPACIO",
    replyToEmail: "support@spacio.com",
    welcomeEmail: true,
    bookingConfirmation: true,
    paymentReceipts: true,
    cancellationNotice: true,
    reminderEmails: true,
    marketingEmails: false,
    adminAlerts: true,
    systemMaintenance: true,
    securityAlerts: true
  });

  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [isChanged, setIsChanged] = useState(false);

  // Define user_name for template preview purposes
  const user_name = "John Doe"; // Default user name for template previews
  const space_name = "Modern Conference Room";
  const booking_date = "2025-08-20";
  const booking_time = "10:00 AM";
  const duration = "2 hours";
  const total_amount = "$50.00";

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

  const templateContent = {
    welcome: {
      subject: "Welcome to SPACIO!",
      content: `Hi {{user_name}},\n\nWelcome to SPACIO! We're excited to have you join our community of space seekers and providers.\n\nYour account has been successfully created. You can now:\n• Browse and book amazing spaces\n• List your own spaces for rent\n• Connect with other users\n\nIf you have any questions, our support team is here to help.\n\nBest regards,\nThe SPACIO Team`
    },
    booking_confirmation: {
      subject: "Booking Confirmed - {{space_name}}",
      content: `Hi {{user_name}},\n\nYour booking has been confirmed!\n\nBooking Details:\n• Space: {{space_name}}\n• Date: {{booking_date}}\n• Time: {{booking_time}}\n• Duration: {{duration}}\n• Total Amount: {{total_amount}}\n\nYou'll receive a reminder 24 hours before your booking.\n\nThank you for choosing SPACIO!`
    }
  };

  // Helper function to replace template variables
  const replaceTemplateVariables = (content) => {
    return content?.replace(/\{\{user_name\}\}/g, user_name)?.replace(/\{\{space_name\}\}/g, space_name)?.replace(/\{\{booking_date\}\}/g, booking_date)?.replace(/\{\{booking_time\}\}/g, booking_time)?.replace(/\{\{duration\}\}/g, duration)?.replace(/\{\{total_amount\}\}/g, total_amount);
  };

  const handleInputChange = (field, value) => {
    setNotificationSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setIsChanged(true);
  };

  const handleSave = () => {
    console.log('Saving notification settings:', notificationSettings);
    setIsChanged(false);
  };

  const handleReset = () => {
    setNotificationSettings({
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      emailProvider: "sendgrid",
      smsProvider: "twilio",
      fromEmail: "noreply@spacio.com",
      fromName: "SPACIO",
      replyToEmail: "support@spacio.com",
      welcomeEmail: true,
      bookingConfirmation: true,
      paymentReceipts: true,
      cancellationNotice: true,
      reminderEmails: true,
      marketingEmails: false,
      adminAlerts: true,
      systemMaintenance: true,
      securityAlerts: true
    });
    setIsChanged(false);
  };

  const handleTestEmail = () => {
    console.log('Sending test email...');
  };

  const handlePreviewTemplate = () => {
    const template = templateContent?.[selectedTemplate];
    if (template) {
      const previewContent = {
        subject: replaceTemplateVariables(template?.subject),
        content: replaceTemplateVariables(template?.content)
      };
      console.log('Template Preview:', previewContent);
      alert(`Subject: ${previewContent?.subject}\n\nContent:\n${previewContent?.content}`);
    }
  };

  const handleSendTestTemplate = () => {
    console.log('Sending test template email for:', selectedTemplate);
  };

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
            checked={notificationSettings?.emailNotifications}
            onChange={(e) => handleInputChange('emailNotifications', e?.target?.checked)}
          />
          
          <Checkbox
            label="SMS Notifications"
            description="Send notifications via SMS"
            checked={notificationSettings?.smsNotifications}
            onChange={(e) => handleInputChange('smsNotifications', e?.target?.checked)}
          />
          
          <Checkbox
            label="Push Notifications"
            description="Send browser push notifications"
            checked={notificationSettings?.pushNotifications}
            onChange={(e) => handleInputChange('pushNotifications', e?.target?.checked)}
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
            value={notificationSettings?.emailProvider}
            onChange={(value) => handleInputChange('emailProvider', value)}
            description="Email service provider"
            required
          />
          
          <Select
            label="SMS Provider"
            options={smsProviderOptions}
            value={notificationSettings?.smsProvider}
            onChange={(value) => handleInputChange('smsProvider', value)}
            description="SMS service provider"
            required
          />
          
          <Input
            label="From Email"
            type="email"
            value={notificationSettings?.fromEmail}
            onChange={(e) => handleInputChange('fromEmail', e?.target?.value)}
            description="Email address for outgoing messages"
            required
          />
          
          <Input
            label="From Name"
            type="text"
            value={notificationSettings?.fromName}
            onChange={(e) => handleInputChange('fromName', e?.target?.value)}
            description="Display name for outgoing emails"
            required
          />
          
          <Input
            label="Reply-To Email"
            type="email"
            value={notificationSettings?.replyToEmail}
            onChange={(e) => handleInputChange('replyToEmail', e?.target?.value)}
            description="Email for user replies"
            required
          />
          
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleTestEmail}
              iconName="Send"
              iconPosition="left"
              className="w-full"
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
              checked={notificationSettings?.welcomeEmail}
              onChange={(e) => handleInputChange('welcomeEmail', e?.target?.checked)}
            />
            
            <Checkbox
              label="Booking Confirmation"
              description="Confirm successful bookings"
              checked={notificationSettings?.bookingConfirmation}
              onChange={(e) => handleInputChange('bookingConfirmation', e?.target?.checked)}
            />
            
            <Checkbox
              label="Payment Receipts"
              description="Send payment confirmation receipts"
              checked={notificationSettings?.paymentReceipts}
              onChange={(e) => handleInputChange('paymentReceipts', e?.target?.checked)}
            />
          </div>
          
          <div className="space-y-4">
            <Checkbox
              label="Cancellation Notice"
              description="Notify about booking cancellations"
              checked={notificationSettings?.cancellationNotice}
              onChange={(e) => handleInputChange('cancellationNotice', e?.target?.checked)}
            />
            
            <Checkbox
              label="Reminder Emails"
              description="Send booking reminders"
              checked={notificationSettings?.reminderEmails}
              onChange={(e) => handleInputChange('reminderEmails', e?.target?.checked)}
            />
            
            <Checkbox
              label="Marketing Emails"
              description="Send promotional content"
              checked={notificationSettings?.marketingEmails}
              onChange={(e) => handleInputChange('marketingEmails', e?.target?.checked)}
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
            checked={notificationSettings?.adminAlerts}
            onChange={(e) => handleInputChange('adminAlerts', e?.target?.checked)}
          />
          
          <Checkbox
            label="System Maintenance"
            description="Maintenance and update notifications"
            checked={notificationSettings?.systemMaintenance}
            onChange={(e) => handleInputChange('systemMaintenance', e?.target?.checked)}
          />
          
          <Checkbox
            label="Security Alerts"
            description="Security-related notifications"
            checked={notificationSettings?.securityAlerts}
            onChange={(e) => handleInputChange('securityAlerts', e?.target?.checked)}
          />
        </div>
      </div>
      {/* Email Templates */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="FileText" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Email Templates</h3>
        </div>
        
        <div className="space-y-6">
          <Select
            label="Select Template"
            options={templateOptions}
            value={selectedTemplate}
            onChange={setSelectedTemplate}
            description="Choose a template to customize"
          />
          
          {templateContent?.[selectedTemplate] && (
            <div className="space-y-4">
              <Input
                label="Subject Line"
                type="text"
                value={templateContent?.[selectedTemplate]?.subject}
                description="Email subject (supports variables like {{user_name}})"
              />
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Content
                </label>
                <textarea
                  className="w-full h-48 p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  value={templateContent?.[selectedTemplate]?.content}
                  placeholder="Email content..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Available variables: {{user_name}}, {{space_name}}, {{booking_date}}, {{total_amount}}
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button 
                  variant="outline" 
                  iconName="Eye" 
                  iconPosition="left"
                  onClick={handlePreviewTemplate}
                >
                  Preview Template
                </Button>
                <Button 
                  variant="outline" 
                  iconName="Send" 
                  iconPosition="left"
                  onClick={handleSendTestTemplate}
                >
                  Send Test
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Clock" size={16} />
          <span>Last updated: August 15, 2025 at 1:11 AM</span>
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

export default NotificationSettingsTab;