import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import NotificationBell from '../../components/NotificationBell';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Checkbox } from '../../components/ui/Checkbox';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import Icon from '../../components/AppIcon';
import { isValidSemanticVersion, compareSemanticVersions, isValidHttpsUrl } from '../../utils/validation';
import { logError, logDebug } from '../../utils/logger';

const AppUpdates = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    currentAppVersion: '1.0.4',
    latestVersion: '1.0.4',
    minSupportedVersion: '1.0.0',
    updateType: 'optional',
    updateMessage: 'A new version is available. Please update to continue using the app.',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.spacel.marketplace',
    iosStoreUrl: 'https://apps.apple.com/app/spacel-marketplace/id123456789',
    enabled: true
  });

  // Validation errors
  const [errors, setErrors] = useState({});

  // Default values
  const defaultValues = {
    currentAppVersion: '1.0.4',
    latestVersion: '1.0.4',
    minSupportedVersion: '1.0.0',
    updateType: 'optional',
    updateMessage: 'A new version is available. Please update to continue using the app.',
    androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.spacel.marketplace',
    iosStoreUrl: 'https://apps.apple.com/app/spacel-marketplace/id123456789',
    enabled: true
  };

  // Load existing config
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_config')
        .select('value, updated_at')
        .eq('key', 'update_config')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        logError('Error loading app config:', error);
        showToast('Error loading configuration', 'error');
        return;
      }

      if (data && data.value) {
        try {
          const config = JSON.parse(data.value);
          
          setFormData({
            currentAppVersion: config.currentAppVersion || defaultValues.currentAppVersion,
            latestVersion: config.latestVersion || defaultValues.latestVersion,
            minSupportedVersion: config.minSupportedVersion || defaultValues.minSupportedVersion,
            updateType: config.updateType || defaultValues.updateType,
            updateMessage: config.updateMessage || defaultValues.updateMessage,
            androidStoreUrl: config.androidStoreUrl || defaultValues.androidStoreUrl,
            iosStoreUrl: config.iosStoreUrl || defaultValues.iosStoreUrl,
            enabled: config.enabled !== undefined ? config.enabled : defaultValues.enabled
          });
          
          setLastUpdated(data.updated_at);
        } catch (parseError) {
          logError('Error parsing config JSON:', parseError);
          showToast('Error parsing configuration data', 'error');
        }
      }
    } catch (err) {
      logError('Error loading config:', err);
      showToast('Error loading configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Current App Version validation
    if (!formData.currentAppVersion || !formData.currentAppVersion.trim()) {
      newErrors.currentAppVersion = 'Current app version is required';
    } else if (!isValidSemanticVersion(formData.currentAppVersion)) {
      newErrors.currentAppVersion = 'Must be in format X.Y.Z (e.g., 1.0.4)';
    }

    // Latest Version validation
    if (!formData.latestVersion || !formData.latestVersion.trim()) {
      newErrors.latestVersion = 'Latest version is required';
    } else if (!isValidSemanticVersion(formData.latestVersion)) {
      newErrors.latestVersion = 'Must be in format X.Y.Z (e.g., 1.4.0)';
    }

    // Minimum Supported Version validation
    if (!formData.minSupportedVersion || !formData.minSupportedVersion.trim()) {
      newErrors.minSupportedVersion = 'Minimum supported version is required';
    } else if (!isValidSemanticVersion(formData.minSupportedVersion)) {
      newErrors.minSupportedVersion = 'Must be in format X.Y.Z (e.g., 1.2.0)';
    } else if (isValidSemanticVersion(formData.latestVersion) && isValidSemanticVersion(formData.minSupportedVersion)) {
      const comparison = compareSemanticVersions(formData.minSupportedVersion, formData.latestVersion);
      if (comparison !== null && comparison > 0) {
        newErrors.minSupportedVersion = 'Must be less than or equal to latest version';
      }
    }

    // Update Type validation
    if (!formData.updateType || !['forced', 'optional'].includes(formData.updateType)) {
      newErrors.updateType = 'Update type must be either "forced" or "optional"';
    }

    // Update Message validation
    if (!formData.updateMessage || !formData.updateMessage.trim()) {
      newErrors.updateMessage = 'Update message is required';
    } else if (formData.updateMessage.length > 500) {
      newErrors.updateMessage = 'Update message must be 500 characters or less';
    }

    // Android Store URL validation
    if (!formData.androidStoreUrl || !formData.androidStoreUrl.trim()) {
      newErrors.androidStoreUrl = 'Android store URL is required';
    } else if (!isValidHttpsUrl(formData.androidStoreUrl)) {
      newErrors.androidStoreUrl = 'Must be a valid HTTPS URL';
    }

    // iOS Store URL validation
    if (!formData.iosStoreUrl || !formData.iosStoreUrl.trim()) {
      newErrors.iosStoreUrl = 'iOS store URL is required';
    } else if (!isValidHttpsUrl(formData.iosStoreUrl)) {
      newErrors.iosStoreUrl = 'Must be a valid HTTPS URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showToast('Please fix validation errors before saving', 'error');
      return;
    }

    const confirmSave = window.confirm('Are you sure you want to save these update settings? This will affect all app users.');
    if (!confirmSave) return;

    try {
      setSaving(true);
      
      const configJson = JSON.stringify({
        currentAppVersion: formData.currentAppVersion.trim(),
        latestVersion: formData.latestVersion.trim(),
        minSupportedVersion: formData.minSupportedVersion.trim(),
        updateType: formData.updateType,
        updateMessage: formData.updateMessage.trim(),
        androidStoreUrl: formData.androidStoreUrl.trim(),
        iosStoreUrl: formData.iosStoreUrl.trim(),
        enabled: formData.enabled
      });

      const { data, error } = await supabase
        .from('app_config')
        .upsert({
          key: 'update_config',
          value: configJson,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        });

      if (error) {
        logError('Error saving app config:', error);
        showToast('Error saving configuration', 'error');
        return;
      }

      setLastUpdated(new Date().toISOString());
      showToast('Update configuration saved successfully', 'success');
      logDebug('App update config saved successfully');
    } catch (err) {
      logError('Error saving config:', err);
      showToast('Error saving configuration', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const confirmReset = window.confirm('Are you sure you want to reset to default values? All unsaved changes will be lost.');
    if (!confirmReset) return;
    
    setFormData({ ...defaultValues });
    setErrors({});
    showToast('Form reset to default values', 'info');
  };

  // Calculate preview states
  const getPreviewState = (version) => {
    if (!isValidSemanticVersion(version) || !isValidSemanticVersion(formData.latestVersion) || !isValidSemanticVersion(formData.minSupportedVersion)) {
      return 'unknown';
    }

    const compareToMin = compareSemanticVersions(version, formData.minSupportedVersion);
    const compareToLatest = compareSemanticVersions(version, formData.latestVersion);

    if (compareToMin < 0) {
      return 'forced';
    } else if (compareToLatest < 0) {
      return 'optional';
    } else {
      return 'none';
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className="lg:ml-sidebar">
          <div className="flex items-center justify-center h-screen">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-muted-foreground">Loading update configuration...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="lg:ml-sidebar">
        {/* Header */}
        <header className="h-header bg-header-background border-b border-header-border px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="lg:hidden">
              <button className="p-2 hover:bg-muted rounded-md">
                <Icon name="Menu" size={20} />
              </button>
            </div>
            
            <div className="min-w-0 flex-1 lg:flex-none">
              <h1 className="text-xl font-semibold text-header-foreground truncate">App Update Management</h1>
              <p className="text-sm text-muted-foreground hidden lg:block">Configure mobile app update settings</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <UserProfileDropdown />
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 lg:p-6 space-y-6">
          <div className="max-w-7xl mx-auto">
            <BreadcrumbNavigation />
            
            {/* Update Configuration Form */}
            <div className="bg-card rounded-lg border border-border p-4 lg:p-6 card-shadow space-y-6">
              <div className="flex items-center space-x-2 mb-6">
                <Icon name="Settings" size={20} className="text-primary" />
                <h2 className="text-lg font-semibold text-card-foreground">Update Configuration</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Current App Version */}
                <Input
                  label="Current App Version"
                  type="text"
                  value={formData.currentAppVersion}
                  onChange={(e) => handleInputChange('currentAppVersion', e.target.value)}
                  description="The version currently deployed in app stores (format: X.Y.Z)"
                  placeholder="1.0.4"
                  required
                  error={errors.currentAppVersion}
                  disabled={saving}
                />

                {/* Latest Version */}
                <Input
                  label="Latest Version"
                  type="text"
                  value={formData.latestVersion}
                  onChange={(e) => handleInputChange('latestVersion', e.target.value)}
                  description="The newest version available (format: X.Y.Z)"
                  placeholder="1.4.0"
                  required
                  error={errors.latestVersion}
                  disabled={saving}
                />

                {/* Minimum Supported Version */}
                <Input
                  label="Minimum Supported Version"
                  type="text"
                  value={formData.minSupportedVersion}
                  onChange={(e) => handleInputChange('minSupportedVersion', e.target.value)}
                  description="Oldest version that can still use the app (format: X.Y.Z)"
                  placeholder="1.2.0"
                  required
                  error={errors.minSupportedVersion}
                  disabled={saving}
                />

                {/* Update Type */}
                <Select
                  label="Update Type"
                  options={[
                    { value: 'forced', label: 'Forced Update' },
                    { value: 'optional', label: 'Optional Update' }
                  ]}
                  value={formData.updateType}
                  onChange={(value) => handleInputChange('updateType', value)}
                  description={formData.updateType === 'forced' 
                    ? 'Blocks app until user updates' 
                    : 'Shows dismissible update dialog'}
                  required
                  error={errors.updateType}
                  disabled={saving}
                />

                {/* Enabled Toggle */}
                <div className="flex items-center justify-center md:justify-start pt-6">
                  <Checkbox
                    label="Enable Update System"
                    description="Master switch to enable/disable update checks"
                    checked={formData.enabled}
                    onChange={(e) => handleInputChange('enabled', e.target.checked)}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Update Message */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Update Message <span className="text-destructive">*</span>
                </label>
                <textarea
                  className={`w-full min-h-[100px] rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 ${
                    errors.updateMessage ? 'border-destructive focus-visible:ring-destructive' : 'border-gray-300'
                  }`}
                  value={formData.updateMessage}
                  onChange={(e) => handleInputChange('updateMessage', e.target.value)}
                  placeholder="Enter the message shown to users when an update is available..."
                  maxLength={500}
                  disabled={saving}
                />
                <div className="flex items-center justify-between mt-1">
                  {errors.updateMessage ? (
                    <p className="text-sm text-destructive">{errors.updateMessage}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Custom message shown to users (max 500 characters)
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formData.updateMessage.length}/500
                  </p>
                </div>
              </div>

              {/* Store URLs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Android Store URL"
                  type="url"
                  value={formData.androidStoreUrl}
                  onChange={(e) => handleInputChange('androidStoreUrl', e.target.value)}
                  description="Full Google Play Store URL"
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  required
                  error={errors.androidStoreUrl}
                  disabled={saving}
                />

                <Input
                  label="iOS Store URL"
                  type="url"
                  value={formData.iosStoreUrl}
                  onChange={(e) => handleInputChange('iosStoreUrl', e.target.value)}
                  description="Full Apple App Store URL"
                  placeholder="https://apps.apple.com/app/id..."
                  required
                  error={errors.iosStoreUrl}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-card rounded-lg border border-border p-4 lg:p-6 card-shadow">
              <div className="flex items-center space-x-2 mb-6">
                <Icon name="Eye" size={20} className="text-primary" />
                <h2 className="text-lg font-semibold text-card-foreground">Update Preview</h2>
              </div>

              {/* Current Version Info */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="Smartphone" size={16} className="text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Current App Version: <span className="font-semibold">{formData.currentAppVersion}</span>
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1 ml-6">
                  Users below minimum version ({formData.minSupportedVersion}) will see forced update
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon name="AlertCircle" size={16} className="text-destructive" />
                    <span className="font-medium text-card-foreground">Users on version &lt; {formData.minSupportedVersion}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs font-medium rounded">
                      FORCED UPDATE
                    </span>
                    <span className="text-sm text-muted-foreground">
                      App will be blocked until update
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon name="Info" size={16} className="text-warning" />
                    <span className="font-medium text-card-foreground">
                      Users on version &gt;= {formData.minSupportedVersion} but &lt; {formData.latestVersion}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-warning/10 text-warning text-xs font-medium rounded">
                      OPTIONAL UPDATE
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Update dialog can be dismissed
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center space-x-2 mb-2">
                    <Icon name="CheckCircle" size={16} className="text-success" />
                    <span className="font-medium text-card-foreground">Users on version &gt;= {formData.latestVersion}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-success/10 text-success text-xs font-medium rounded">
                      NO UPDATE
                    </span>
                    <span className="text-sm text-muted-foreground">
                      App is up to date
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-card rounded-lg border border-border p-4 lg:p-6 card-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Icon name="Clock" size={16} />
                  <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={saving}
                  >
                    Reset to Defaults
                  </Button>
                  
                  <Button
                    variant="default"
                    onClick={handleSave}
                    disabled={saving}
                    iconName={saving ? "Loader2" : "Save"}
                    iconPosition="left"
                  >
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppUpdates;

