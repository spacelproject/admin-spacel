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

const SecurityPoliciesTab = () => {
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
  } = usePlatformSettings('security');

  const [localSettings, setLocalSettings] = useState({});
  const initialSettingsRef = useRef({});

  useEffect(() => {
    if (!loading) {
      setLocalSettings(platformSettings);
      initialSettingsRef.current = { ...platformSettings };
    }
  }, [loading, platformSettings]);

  const cookieSameSiteOptions = [
    { value: "strict", label: "Strict" },
    { value: "lax", label: "Lax" },
    { value: "none", label: "None" }
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

    logDebug('Saving security settings changes:', changedKeys);
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

  const generateApiKey = () => {
    const apiKey = 'sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    showToast(`API Key generated: ${apiKey.substring(0, 20)}... (Check console for full key)`, 'info');
    console.log('Generated API Key:', apiKey);
  };

  if (loading) {
    return <LoadingSpinner text="Loading security settings..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetchPlatformSettings} />;
  }

  return (
    <div className="space-y-8">
      {/* Password Policies */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Lock" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Password Policies</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Minimum Password Length"
              type="number"
              value={localSettings.passwordMinLength ?? 8}
              onChange={(e) => handleInputChange('passwordMinLength', parseInt(e.target.value))}
              description="Minimum number of characters required"
              min="6"
              max="32"
              required
              disabled={saving}
            />
            
            <Input
              label="Password Expiry (Days)"
              type="number"
              value={localSettings.passwordExpiryDays ?? 90}
              onChange={(e) => handleInputChange('passwordExpiryDays', parseInt(e.target.value))}
              description="Days before password expires (0 = never)"
              min="0"
              max="365"
              disabled={saving}
            />
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Password Requirements
              </label>
              <div className="space-y-2">
                <Checkbox
                  label="Require uppercase letters (A-Z)"
                  checked={localSettings.passwordRequireUppercase ?? true}
                  onChange={(e) => handleInputChange('passwordRequireUppercase', e.target.checked)}
                  disabled={saving}
                />
                
                <Checkbox
                  label="Require lowercase letters (a-z)"
                  checked={localSettings.passwordRequireLowercase ?? true}
                  onChange={(e) => handleInputChange('passwordRequireLowercase', e.target.checked)}
                  disabled={saving}
                />
                
                <Checkbox
                  label="Require numbers (0-9)"
                  checked={localSettings.passwordRequireNumbers ?? true}
                  onChange={(e) => handleInputChange('passwordRequireNumbers', e.target.checked)}
                  disabled={saving}
                />
                
                <Checkbox
                  label="Require symbols (!@#$%)"
                  checked={localSettings.passwordRequireSymbols ?? true}
                  onChange={(e) => handleInputChange('passwordRequireSymbols', e.target.checked)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Session Management */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Clock" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Session Management</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Session Timeout (Minutes)"
            type="number"
            value={localSettings.sessionTimeoutMinutes ?? 30}
            onChange={(e) => handleInputChange('sessionTimeoutMinutes', parseInt(e.target.value))}
            description="Automatic logout after inactivity"
            min="5"
            max="480"
            required
            disabled={saving}
          />
          
          <Input
            label="Max Login Attempts"
            type="number"
            value={localSettings.maxLoginAttempts ?? 5}
            onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value))}
            description="Failed attempts before account lockout"
            min="3"
            max="10"
            required
            disabled={saving}
          />
          
          <Input
            label="Lockout Duration (Minutes)"
            type="number"
            value={localSettings.lockoutDurationMinutes ?? 15}
            onChange={(e) => handleInputChange('lockoutDurationMinutes', parseInt(e.target.value))}
            description="Account lockout duration"
            min="5"
            max="1440"
            required
            disabled={saving}
          />
          
          <Select
            label="Cookie SameSite Policy"
            options={cookieSameSiteOptions}
            value={localSettings.cookieSameSite || "strict"}
            onChange={(value) => handleInputChange('cookieSameSite', value)}
            description="Cookie security policy"
            required
            disabled={saving}
          />
        </div>
      </div>

      {/* Two-Factor Authentication */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Smartphone" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Two-Factor Authentication</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Checkbox
              label="Require 2FA for All Users"
              description="Mandatory two-factor authentication"
              checked={localSettings.twoFactorRequired ?? false}
              onChange={(e) => handleInputChange('twoFactorRequired', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="Require 2FA for Administrators"
              description="Mandatory 2FA for admin accounts"
              checked={localSettings.twoFactorForAdmins ?? true}
              onChange={(e) => handleInputChange('twoFactorForAdmins', e.target.checked)}
              disabled={saving}
            />
          </div>
          
          <div className="space-y-4">
            <Checkbox
              label="Email Verification Required"
              description="Verify email addresses during registration"
              checked={localSettings.emailVerificationRequired ?? true}
              onChange={(e) => handleInputChange('emailVerificationRequired', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="Phone Verification Required"
              description="Verify phone numbers during registration"
              checked={localSettings.phoneVerificationRequired ?? false}
              onChange={(e) => handleInputChange('phoneVerificationRequired', e.target.checked)}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {/* API Security */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Code" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">API Security</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Rate Limit (Requests)"
            type="number"
            value={localSettings.apiRateLimit ?? 1000}
            onChange={(e) => handleInputChange('apiRateLimit', parseInt(e.target.value))}
            description="Maximum requests per time window"
            min="100"
            max="10000"
            required
            disabled={saving}
          />
          
          <Input
            label="Rate Limit Window (Minutes)"
            type="number"
            value={localSettings.apiRateLimitWindow ?? 60}
            onChange={(e) => handleInputChange('apiRateLimitWindow', parseInt(e.target.value))}
            description="Time window for rate limiting"
            min="1"
            max="1440"
            required
            disabled={saving}
          />
        </div>
        
        <div className="mt-6">
          <Button
            variant="outline"
            onClick={generateApiKey}
            iconName="Key"
            iconPosition="left"
            disabled={saving}
          >
            Generate New API Key
          </Button>
        </div>
      </div>

      {/* IP Access Control */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Globe" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">IP Access Control</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Allowed IP Addresses
            </label>
            <textarea
              className="w-full h-24 p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={localSettings.allowedIpAddresses || ""}
              onChange={(e) => handleInputChange('allowedIpAddresses', e.target.value)}
              placeholder="192.168.1.1&#10;10.0.0.0/8&#10;Leave empty to allow all"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground mt-1">
              One IP address or CIDR block per line
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Blocked IP Addresses
            </label>
            <textarea
              className="w-full h-24 p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={localSettings.blockedIpAddresses || ""}
              onChange={(e) => handleInputChange('blockedIpAddresses', e.target.value)}
              placeholder="192.168.1.100&#10;203.0.113.0/24"
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground mt-1">
              One IP address or CIDR block per line
            </p>
          </div>
        </div>
      </div>

      {/* Data Protection */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Icon name="Shield" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold text-card-foreground">Data Protection</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Input
              label="Data Retention (Days)"
              type="number"
              value={localSettings.dataRetentionDays ?? 365}
              onChange={(e) => handleInputChange('dataRetentionDays', parseInt(e.target.value))}
              description="How long to keep user data"
              min="30"
              max="3650"
              required
              disabled={saving}
            />
            
            <Input
              label="Audit Log Retention (Days)"
              type="number"
              value={localSettings.auditLogRetentionDays ?? 730}
              onChange={(e) => handleInputChange('auditLogRetentionDays', parseInt(e.target.value))}
              description="How long to keep audit logs"
              min="90"
              max="3650"
              required
              disabled={saving}
            />
          </div>
          
          <div className="space-y-4">
            <Checkbox
              label="SSL/TLS Required"
              description="Force HTTPS connections"
              checked={localSettings.sslRequired ?? true}
              onChange={(e) => handleInputChange('sslRequired', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="Secure Cookies"
              description="Use secure cookie attributes"
              checked={localSettings.cookieSecure ?? true}
              onChange={(e) => handleInputChange('cookieSecure', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="GDPR Compliance"
              description="Enable GDPR compliance features"
              checked={localSettings.gdprCompliance ?? true}
              onChange={(e) => handleInputChange('gdprCompliance', e.target.checked)}
              disabled={saving}
            />
            
            <Checkbox
              label="CCPA Compliance"
              description="Enable CCPA compliance features"
              checked={localSettings.ccpaCompliance ?? true}
              onChange={(e) => handleInputChange('ccpaCompliance', e.target.checked)}
              disabled={saving}
            />
          </div>
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

export default SecurityPoliciesTab;
