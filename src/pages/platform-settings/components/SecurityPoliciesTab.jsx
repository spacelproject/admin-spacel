import React, { useState } from 'react';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const SecurityPoliciesTab = () => {
  const [securitySettings, setSecuritySettings] = useState({
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: true,
    passwordExpiryDays: 90,
    sessionTimeoutMinutes: 30,
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    twoFactorRequired: false,
    twoFactorForAdmins: true,
    emailVerificationRequired: true,
    phoneVerificationRequired: false,
    apiRateLimit: 1000,
    apiRateLimitWindow: 60,
    allowedIpAddresses: "",
    blockedIpAddresses: "",
    sslRequired: true,
    cookieSecure: true,
    cookieSameSite: "strict",
    dataRetentionDays: 365,
    auditLogRetentionDays: 730,
    gdprCompliance: true,
    ccpaCompliance: true
  });

  const [isChanged, setIsChanged] = useState(false);

  const cookieSameSiteOptions = [
    { value: "strict", label: "Strict" },
    { value: "lax", label: "Lax" },
    { value: "none", label: "None" }
  ];

  const handleInputChange = (field, value) => {
    setSecuritySettings(prev => ({
      ...prev,
      [field]: value
    }));
    setIsChanged(true);
  };

  const handleSave = () => {
    console.log('Saving security settings:', securitySettings);
    setIsChanged(false);
  };

  const handleReset = () => {
    setSecuritySettings({
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireLowercase: true,
      passwordRequireNumbers: true,
      passwordRequireSymbols: true,
      passwordExpiryDays: 90,
      sessionTimeoutMinutes: 30,
      maxLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      twoFactorRequired: false,
      twoFactorForAdmins: true,
      emailVerificationRequired: true,
      phoneVerificationRequired: false,
      apiRateLimit: 1000,
      apiRateLimitWindow: 60,
      allowedIpAddresses: "",
      blockedIpAddresses: "",
      sslRequired: true,
      cookieSecure: true,
      cookieSameSite: "strict",
      dataRetentionDays: 365,
      auditLogRetentionDays: 730,
      gdprCompliance: true,
      ccpaCompliance: true
    });
    setIsChanged(false);
  };

  const generateApiKey = () => {
    const apiKey = 'sk_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    console.log('Generated API Key:', apiKey);
  };

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
              value={securitySettings.passwordMinLength}
              onChange={(e) => handleInputChange('passwordMinLength', parseInt(e.target.value))}
              description="Minimum number of characters required"
              min="6"
              max="32"
              required
            />
            
            <Input
              label="Password Expiry (Days)"
              type="number"
              value={securitySettings.passwordExpiryDays}
              onChange={(e) => handleInputChange('passwordExpiryDays', parseInt(e.target.value))}
              description="Days before password expires (0 = never)"
              min="0"
              max="365"
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
                  checked={securitySettings.passwordRequireUppercase}
                  onChange={(e) => handleInputChange('passwordRequireUppercase', e.target.checked)}
                />
                
                <Checkbox
                  label="Require lowercase letters (a-z)"
                  checked={securitySettings.passwordRequireLowercase}
                  onChange={(e) => handleInputChange('passwordRequireLowercase', e.target.checked)}
                />
                
                <Checkbox
                  label="Require numbers (0-9)"
                  checked={securitySettings.passwordRequireNumbers}
                  onChange={(e) => handleInputChange('passwordRequireNumbers', e.target.checked)}
                />
                
                <Checkbox
                  label="Require symbols (!@#$%)"
                  checked={securitySettings.passwordRequireSymbols}
                  onChange={(e) => handleInputChange('passwordRequireSymbols', e.target.checked)}
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
            value={securitySettings.sessionTimeoutMinutes}
            onChange={(e) => handleInputChange('sessionTimeoutMinutes', parseInt(e.target.value))}
            description="Automatic logout after inactivity"
            min="5"
            max="480"
            required
          />
          
          <Input
            label="Max Login Attempts"
            type="number"
            value={securitySettings.maxLoginAttempts}
            onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value))}
            description="Failed attempts before account lockout"
            min="3"
            max="10"
            required
          />
          
          <Input
            label="Lockout Duration (Minutes)"
            type="number"
            value={securitySettings.lockoutDurationMinutes}
            onChange={(e) => handleInputChange('lockoutDurationMinutes', parseInt(e.target.value))}
            description="Account lockout duration"
            min="5"
            max="1440"
            required
          />
          
          <Select
            label="Cookie SameSite Policy"
            options={cookieSameSiteOptions}
            value={securitySettings.cookieSameSite}
            onChange={(value) => handleInputChange('cookieSameSite', value)}
            description="Cookie security policy"
            required
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
              checked={securitySettings.twoFactorRequired}
              onChange={(e) => handleInputChange('twoFactorRequired', e.target.checked)}
            />
            
            <Checkbox
              label="Require 2FA for Administrators"
              description="Mandatory 2FA for admin accounts"
              checked={securitySettings.twoFactorForAdmins}
              onChange={(e) => handleInputChange('twoFactorForAdmins', e.target.checked)}
            />
          </div>
          
          <div className="space-y-4">
            <Checkbox
              label="Email Verification Required"
              description="Verify email addresses during registration"
              checked={securitySettings.emailVerificationRequired}
              onChange={(e) => handleInputChange('emailVerificationRequired', e.target.checked)}
            />
            
            <Checkbox
              label="Phone Verification Required"
              description="Verify phone numbers during registration"
              checked={securitySettings.phoneVerificationRequired}
              onChange={(e) => handleInputChange('phoneVerificationRequired', e.target.checked)}
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
            value={securitySettings.apiRateLimit}
            onChange={(e) => handleInputChange('apiRateLimit', parseInt(e.target.value))}
            description="Maximum requests per time window"
            min="100"
            max="10000"
            required
          />
          
          <Input
            label="Rate Limit Window (Minutes)"
            type="number"
            value={securitySettings.apiRateLimitWindow}
            onChange={(e) => handleInputChange('apiRateLimitWindow', parseInt(e.target.value))}
            description="Time window for rate limiting"
            min="1"
            max="1440"
            required
          />
        </div>
        
        <div className="mt-6">
          <Button
            variant="outline"
            onClick={generateApiKey}
            iconName="Key"
            iconPosition="left"
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
              value={securitySettings.allowedIpAddresses}
              onChange={(e) => handleInputChange('allowedIpAddresses', e.target.value)}
              placeholder="192.168.1.1&#10;10.0.0.0/8&#10;Leave empty to allow all"
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
              value={securitySettings.blockedIpAddresses}
              onChange={(e) => handleInputChange('blockedIpAddresses', e.target.value)}
              placeholder="192.168.1.100&#10;203.0.113.0/24"
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
              value={securitySettings.dataRetentionDays}
              onChange={(e) => handleInputChange('dataRetentionDays', parseInt(e.target.value))}
              description="How long to keep user data"
              min="30"
              max="3650"
              required
            />
            
            <Input
              label="Audit Log Retention (Days)"
              type="number"
              value={securitySettings.auditLogRetentionDays}
              onChange={(e) => handleInputChange('auditLogRetentionDays', parseInt(e.target.value))}
              description="How long to keep audit logs"
              min="90"
              max="3650"
              required
            />
          </div>
          
          <div className="space-y-4">
            <Checkbox
              label="SSL/TLS Required"
              description="Force HTTPS connections"
              checked={securitySettings.sslRequired}
              onChange={(e) => handleInputChange('sslRequired', e.target.checked)}
            />
            
            <Checkbox
              label="Secure Cookies"
              description="Use secure cookie attributes"
              checked={securitySettings.cookieSecure}
              onChange={(e) => handleInputChange('cookieSecure', e.target.checked)}
            />
            
            <Checkbox
              label="GDPR Compliance"
              description="Enable GDPR compliance features"
              checked={securitySettings.gdprCompliance}
              onChange={(e) => handleInputChange('gdprCompliance', e.target.checked)}
            />
            
            <Checkbox
              label="CCPA Compliance"
              description="Enable CCPA compliance features"
              checked={securitySettings.ccpaCompliance}
              onChange={(e) => handleInputChange('ccpaCompliance', e.target.checked)}
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

export default SecurityPoliciesTab;