import React, { useState, useEffect, useRef } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import usePlatformSettings from '../../../hooks/usePlatformSettings';
import { logDebug } from '../../../utils/logger';

const GeneralSettingsTab = () => {
  const {
    settings,
    loading,
    saving,
    error,
    lastUpdated,
    saveSettings,
    resetSettings
  } = usePlatformSettings('general');

  const [localSettings, setLocalSettings] = useState({});
  const [changedKeys, setChangedKeys] = useState(new Set());
  const initialSettingsRef = useRef({});

  // Initialize local settings when data loads
  useEffect(() => {
    if (!loading && Object.keys(settings).length > 0) {
      setLocalSettings(settings);
      initialSettingsRef.current = { ...settings };
      setChangedKeys(new Set());
    }
  }, [settings, loading]);

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
    setLocalSettings(prev => {
      const newSettings = {
        ...prev,
        [field]: value
      };

      // Track changed keys by comparing with initial values
      const initialValue = initialSettingsRef.current[field];
      const hasChanged = JSON.stringify(initialValue) !== JSON.stringify(value);

      setChangedKeys(prevKeys => {
        const newKeys = new Set(prevKeys);
        if (hasChanged) {
          newKeys.add(field);
        } else {
          newKeys.delete(field);
        }
        return newKeys;
      });

      logDebug('Setting changed', { field, value, hasChanged });
      return newSettings;
    });
  };

  const handleSave = async () => {
    if (changedKeys.size === 0) {
      return;
    }

    const changedKeysArray = Array.from(changedKeys);
    const success = await saveSettings(localSettings, changedKeysArray);

    if (success) {
      // Update initial ref to current values after successful save
      initialSettingsRef.current = { ...localSettings };
      setChangedKeys(new Set());
    }
  };

  const handleReset = () => {
    setLocalSettings({ ...initialSettingsRef.current });
    setChangedKeys(new Set());
  };

  const formatLastUpdated = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-muted-foreground">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Platform Information */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Building" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Platform Information</h3>
        </div>
        
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center space-x-2 text-destructive">
              <Icon name="AlertCircle" size={16} />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Platform Name"
            type="text"
            value={localSettings.platformName || ''}
            onChange={(e) => handleInputChange('platformName', e.target.value)}
            description="The name displayed across the platform"
            required
            disabled={saving}
          />
          
          <Input
            label="Company Name"
            type="text"
            value={localSettings.companyName || ''}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            description="Legal company name for documentation"
            required
            disabled={saving}
          />
          
          <Input
            label="Support Email"
            type="email"
            value={localSettings.supportEmail || ''}
            onChange={(e) => handleInputChange('supportEmail', e.target.value)}
            description="Primary contact email for user support"
            required
            disabled={saving}
          />
          
          <Input
            label="Contact Phone"
            type="tel"
            value={localSettings.contactPhone || ''}
            onChange={(e) => handleInputChange('contactPhone', e.target.value)}
            description="Customer service phone number"
            disabled={saving}
          />
        </div>
        
        <div className="mt-6">
          <Input
            label="Business Address"
            type="text"
            value={localSettings.address || ''}
            onChange={(e) => handleInputChange('address', e.target.value)}
            description="Complete business address for legal purposes"
            disabled={saving}
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
            value={localSettings.timezone || 'America/New_York'}
            onChange={(value) => handleInputChange('timezone', value)}
            description="Default timezone for the platform"
            disabled={saving}
          />
          
          <Select
            label="Default Language"
            options={languageOptions}
            value={localSettings.defaultLanguage || 'en'}
            onChange={(value) => handleInputChange('defaultLanguage', value)}
            description="Primary language for the platform"
            disabled={saving}
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
              checked={localSettings.maintenanceMode || false}
              onChange={(e) => handleInputChange('maintenanceMode', e.target.checked)}
              disabled={saving}
            />
            {localSettings.maintenanceMode && (
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
              checked={localSettings.userRegistration ?? true}
              onChange={(e) => handleInputChange('userRegistration', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="Space Listings"
              description="Enable space owners to create new listings"
              checked={localSettings.spaceListings ?? true}
              onChange={(e) => handleInputChange('spaceListings', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="Booking System"
              description="Allow users to make space reservations"
              checked={localSettings.bookingSystem ?? true}
              onChange={(e) => handleInputChange('bookingSystem', e.target.checked)}
              disabled={saving}
            />
          </div>
          
          <div className="space-y-4">
            <Checkbox
              label="Payment Processing"
              description="Enable payment transactions on the platform"
              checked={localSettings.paymentProcessing ?? true}
              onChange={(e) => handleInputChange('paymentProcessing', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="Review System"
              description="Allow users to leave reviews and ratings"
              checked={localSettings.reviewSystem ?? true}
              onChange={(e) => handleInputChange('reviewSystem', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="Chat Support"
              description="Enable live chat support for users"
              checked={localSettings.chatSupport ?? true}
              onChange={(e) => handleInputChange('chatSupport', e.target.checked)}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Icon name="Clock" size={16} />
          <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={changedKeys.size === 0 || saving}
          >
            Reset Changes
          </Button>
          
          <Button
            variant="default"
            onClick={handleSave}
            disabled={changedKeys.size === 0 || saving}
            iconName={saving ? "Loader2" : "Save"}
            iconPosition="left"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettingsTab;