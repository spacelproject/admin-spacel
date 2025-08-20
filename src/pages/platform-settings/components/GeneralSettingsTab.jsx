import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const GeneralSettingsTab = () => {
  const [settings, setSettings] = useState({
    platformName: "SPACIO",
    companyName: "SPACIO Inc.",
    supportEmail: "support@spacio.com",
    contactPhone: "+1 (555) 123-4567",
    address: "123 Business Ave, Suite 100, New York, NY 10001",
    timezone: "America/New_York",
    defaultLanguage: "en",
    maintenanceMode: false,
    userRegistration: true,
    spaceListings: true,
    bookingSystem: true,
    paymentProcessing: true,
    reviewSystem: true,
    chatSupport: true
  });

  const [isChanged, setIsChanged] = useState(false);

  const timezoneOptions = [
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "UTC", label: "Coordinated Universal Time (UTC)" }
  ];

  const languageOptions = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" }
  ];

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setIsChanged(true);
  };

  const handleSave = () => {
    console.log('Saving general settings:', settings);
    setIsChanged(false);
  };

  const handleReset = () => {
    // Reset to original values
    setSettings({
      platformName: "SPACIO",
      companyName: "SPACIO Inc.",
      supportEmail: "support@spacio.com",
      contactPhone: "+1 (555) 123-4567",
      address: "123 Business Ave, Suite 100, New York, NY 10001",
      timezone: "America/New_York",
      defaultLanguage: "en",
      maintenanceMode: false,
      userRegistration: true,
      spaceListings: true,
      bookingSystem: true,
      paymentProcessing: true,
      reviewSystem: true,
      chatSupport: true
    });
    setIsChanged(false);
  };

  return (
    <div className="space-y-8">
      {/* Platform Information */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Building" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Platform Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Platform Name"
            type="text"
            value={settings.platformName}
            onChange={(e) => handleInputChange('platformName', e.target.value)}
            description="The name displayed across the platform"
            required
          />
          
          <Input
            label="Company Name"
            type="text"
            value={settings.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            description="Legal company name for documentation"
            required
          />
          
          <Input
            label="Support Email"
            type="email"
            value={settings.supportEmail}
            onChange={(e) => handleInputChange('supportEmail', e.target.value)}
            description="Primary contact email for user support"
            required
          />
          
          <Input
            label="Contact Phone"
            type="tel"
            value={settings.contactPhone}
            onChange={(e) => handleInputChange('contactPhone', e.target.value)}
            description="Customer service phone number"
          />
        </div>
        
        <div className="mt-6">
          <Input
            label="Business Address"
            type="text"
            value={settings.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            description="Complete business address for legal purposes"
          />
        </div>
      </div>

      {/* Localization Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Globe" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Localization</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Default Timezone"
            options={timezoneOptions}
            value={settings.timezone}
            onChange={(value) => handleInputChange('timezone', value)}
            description="Default timezone for the platform"
          />
          
          <Select
            label="Default Language"
            options={languageOptions}
            value={settings.defaultLanguage}
            onChange={(value) => handleInputChange('defaultLanguage', value)}
            description="Primary language for the platform"
          />
        </div>
      </div>

      {/* System Controls */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Settings" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">System Controls</h3>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
            <Checkbox
              label="Maintenance Mode"
              description="Enable to temporarily disable platform access for maintenance"
              checked={settings.maintenanceMode}
              onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
            />
            {settings.maintenanceMode && (
              <div className="mt-2 flex items-center space-x-2 text-warning">
                <Icon name="AlertTriangle" size={16} />
                <span className="text-sm font-medium">Platform will be inaccessible to users</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="ToggleLeft" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Feature Availability</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Checkbox
              label="User Registration"
              description="Allow new users to register on the platform"
              checked={settings.userRegistration}
              onChange={(e) => handleInputChange('userRegistration', e.target.checked)}
            />
            
            <Checkbox
              label="Space Listings"
              description="Enable space owners to create new listings"
              checked={settings.spaceListings}
              onChange={(e) => handleInputChange('spaceListings', e.target.checked)}
            />
            
            <Checkbox
              label="Booking System"
              description="Allow users to make space reservations"
              checked={settings.bookingSystem}
              onChange={(e) => handleInputChange('bookingSystem', e.target.checked)}
            />
          </div>
          
          <div className="space-y-4">
            <Checkbox
              label="Payment Processing"
              description="Enable payment transactions on the platform"
              checked={settings.paymentProcessing}
              onChange={(e) => handleInputChange('paymentProcessing', e.target.checked)}
            />
            
            <Checkbox
              label="Review System"
              description="Allow users to leave reviews and ratings"
              checked={settings.reviewSystem}
              onChange={(e) => handleInputChange('reviewSystem', e.target.checked)}
            />
            
            <Checkbox
              label="Chat Support"
              description="Enable live chat support for users"
              checked={settings.chatSupport}
              onChange={(e) => handleInputChange('chatSupport', e.target.checked)}
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

export default GeneralSettingsTab;