import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logError, logDebug, logWarn } from '../utils/logger';
import { handleDatabaseError, formatErrorForUser } from '../utils/errorHandler';
import { useToast } from '../components/ui/Toast';

/**
 * Hook for managing platform settings
 * Fetches settings from database, provides save functionality, and real-time updates
 */
const usePlatformSettings = (category = 'general') => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const channelRef = useRef(null);

  // Default values for platform information settings
  const defaultSettings = {
    platformName: 'SPACEL',
    companyName: 'SPACEL Inc.',
    supportEmail: 'support@spacel.com',
    contactPhone: '',
    address: '',
    timezone: 'America/New_York',
    defaultLanguage: 'en',
    maintenanceMode: false,
    userRegistration: true,
    spaceListings: true,
    bookingSystem: true,
    paymentProcessing: true,
    reviewSystem: true,
    chatSupport: true
  };

  /**
   * Fetch settings from database
   */
  const fetchSettings = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logDebug('Fetching platform settings', { category });

      const { data, error: fetchError } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('category', category)
        .order('setting_key', { ascending: true });

      if (fetchError) {
        logError('Error fetching platform settings:', fetchError);
        throw fetchError;
      }

      // Transform database records into settings object
      const settingsMap = {};
      let latestUpdate = null;

      if (data && data.length > 0) {
        data.forEach((record) => {
          let value = record.setting_value;
          
          // Handle JSONB values - they might be stored as objects or strings
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch (e) {
              // If parsing fails, use the string as-is
            }
          }

          // Convert based on setting_type
          switch (record.setting_type) {
            case 'number':
              value = typeof value === 'number' ? value : parseFloat(value) || 0;
              break;
            case 'boolean':
              value = typeof value === 'boolean' ? value : value === 'true' || value === true;
              break;
            case 'json':
              value = typeof value === 'object' ? value : (typeof value === 'string' ? JSON.parse(value) : {});
              break;
            default:
              // string type - keep as is
              break;
          }

          settingsMap[record.setting_key] = value;

          // Track latest update time
          if (record.updated_at) {
            const updateTime = new Date(record.updated_at);
            if (!latestUpdate || updateTime > latestUpdate) {
              latestUpdate = updateTime;
            }
          }
        });
      }

      // Merge with defaults for missing settings
      const mergedSettings = { ...defaultSettings, ...settingsMap };
      
      setSettings(mergedSettings);
      setLastUpdated(latestUpdate);

      logDebug('Platform settings fetched', { 
        category, 
        count: data?.length || 0,
        lastUpdated: latestUpdate 
      });
    } catch (err) {
      const appError = handleDatabaseError(err, 'Fetch platform settings');
      logError('Error fetching platform settings:', appError);
      setError(formatErrorForUser(appError));
      
      // Use defaults on error
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, [category, isAdmin]);

  /**
   * Save settings to database
   */
  const saveSettings = useCallback(async (settingsToSave, changedKeys = []) => {
    if (!isAdmin || !user?.id) {
      showToast('You must be an admin to save settings', 'error');
      return false;
    }

    if (!changedKeys || changedKeys.length === 0) {
      logWarn('No settings changed, skipping save');
      return false;
    }

    try {
      setSaving(true);
      setError(null);

      logDebug('Saving platform settings', { 
        category, 
        changedKeys,
        changedCount: changedKeys.length 
      });

      // Prepare upsert operations for each changed setting
      const upserts = changedKeys.map((key) => {
        let value = settingsToSave[key];
        let settingType = 'string';

        // Determine setting type
        if (typeof value === 'boolean') {
          settingType = 'boolean';
        } else if (typeof value === 'number') {
          settingType = 'number';
        } else if (typeof value === 'object' && value !== null) {
          settingType = 'json';
          value = JSON.stringify(value);
        }

        return {
          setting_key: key,
          setting_value: value,
          setting_type: settingType,
          category: category,
          description: getSettingDescription(key),
          updated_at: new Date().toISOString()
        };
      });

      // First, fetch old values for history tracking
      const { data: oldSettingsData } = await supabase
        .from('platform_settings')
        .select('setting_key, setting_value, setting_type')
        .in('setting_key', changedKeys)
        .eq('category', category);

      const oldValuesMap = {};
      if (oldSettingsData) {
        oldSettingsData.forEach((record) => {
          let value = record.setting_value;
          if (typeof value === 'string') {
            try {
              value = JSON.parse(value);
            } catch (e) {
              // Keep as string if parsing fails
            }
          }
          oldValuesMap[record.setting_key] = value;
        });
      }

      // Use upsert to insert or update settings
      // Supabase upsert automatically handles conflicts on unique columns
      const { error: saveError } = await supabase
        .from('platform_settings')
        .upsert(upserts, {
          onConflict: 'setting_key',
          ignoreDuplicates: false
        });

      if (saveError) {
        logError('Error saving platform settings:', saveError);
        throw saveError;
      }

      // Fetch user profile for history tracking
      let userProfile = null;
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          userProfile = profileData;
        }
      }

      // Log changes to history table
      const historyEntries = changedKeys.map((key) => {
        const oldValue = oldValuesMap[key] ?? null;
        const newValue = settingsToSave[key];
        
        // Determine impact level based on setting type and change magnitude
        let impactLevel = 'low';
        if (category === 'security' || key.includes('password') || key.includes('session') || key.includes('lockout')) {
          impactLevel = 'high';
        } else if (category === 'payment' && (key.includes('fee') || key.includes('rate'))) {
          impactLevel = 'high';
        } else if (key === 'maintenanceMode') {
          impactLevel = 'critical';
        } else if (category === 'general' && (key.includes('registration') || key.includes('booking'))) {
          impactLevel = 'medium';
        }

        const userName = userProfile 
          ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email || 'Unknown'
          : user?.email || 'Unknown';
        const userEmail = userProfile?.email || user?.email || 'N/A';

        return {
          setting_key: key,
          category: category,
          old_value: oldValue,
          new_value: newValue,
          setting_type: upserts.find(u => u.setting_key === key)?.setting_type || 'string',
          changed_by: user.id,
          changed_by_name: userName,
          changed_by_email: userEmail,
          impact_level: impactLevel
        };
      });

      // Insert history entries
      const { error: historyError } = await supabase
        .from('platform_settings_history')
        .insert(historyEntries);

      if (historyError) {
        logWarn('Error logging settings history:', historyError);
        // Don't fail the save if history logging fails
      }

      // Update local state
      setSettings(settingsToSave);
      setLastUpdated(new Date());

      logDebug('Platform settings saved successfully', { 
        category, 
        savedCount: changedKeys.length 
      });

      showToast('Settings saved successfully', 'success');
      return true;
    } catch (err) {
      const appError = handleDatabaseError(err, 'Save platform settings');
      logError('Error saving platform settings:', appError);
      const errorMessage = formatErrorForUser(appError);
      setError(errorMessage);
      showToast(errorMessage || 'Failed to save settings', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [category, isAdmin, user?.id, showToast]);

  /**
   * Get description for a setting key
   */
  const getSettingDescription = (key) => {
    const descriptions = {
      // General settings
      platformName: 'The name displayed across the platform',
      companyName: 'Legal company name for documentation',
      supportEmail: 'Primary contact email for user support',
      contactPhone: 'Customer service phone number',
      address: 'Complete business address for legal purposes',
      timezone: 'Default timezone for the platform',
      defaultLanguage: 'Primary language for the platform',
      maintenanceMode: 'Enable to temporarily disable platform access for maintenance',
      userRegistration: 'Allow new users to register on the platform',
      spaceListings: 'Enable space owners to create new listings',
      bookingSystem: 'Allow users to make space reservations',
      paymentProcessing: 'Enable payment transactions on the platform',
      reviewSystem: 'Allow users to leave reviews and ratings',
      chatSupport: 'Enable live chat support for users',
      // Payment settings
      defaultCurrency: 'Primary currency for the platform',
      supportedCurrencies: 'List of currencies supported on the platform',
      // Payment methods settings (category: payment_methods)
      cardsPaymentMethod: 'Enable card payments via Stripe (credit/debit cards, bank transfers)',
      stripeLink: 'Enable Stripe Link checkout payments',
      applePay: 'Enable Apple Pay payment method',
      googlePay: 'Enable Google Pay payment method',
      cancellation_refund_percentage: 'Percentage of the booking refunded to the seeker on cancellation',
      cancellation_minimum_hours: 'Minimum hours before booking start that a seeker can cancel and still receive the refund',
      cancellation_fee_percentage: 'Percentage of the booking kept by the platform as a cancellation fee',
      refundPolicy: 'Default refund policy for bookings',
      taxCalculation: 'Automatically calculate and apply taxes based on location',
      invoiceGeneration: 'Automatically generate invoices for bookings',
      // Notification settings
      emailNotifications: 'Enable email notifications',
      smsNotifications: 'Enable SMS notifications',
      pushNotifications: 'Enable browser push notifications',
      emailProvider: 'Email service provider',
      smsProvider: 'SMS service provider',
      fromEmail: 'Email address for outgoing messages',
      fromName: 'Display name for outgoing emails',
      replyToEmail: 'Email for user replies',
      welcomeEmail: 'Send welcome email to new users',
      bookingConfirmation: 'Confirm successful bookings',
      paymentReceipts: 'Send payment confirmation receipts',
      cancellationNotice: 'Notify about booking cancellations',
      reminderEmails: 'Send booking reminders',
      marketingEmails: 'Send promotional content',
      adminAlerts: 'Critical system notifications',
      systemMaintenance: 'Maintenance and update notifications',
      securityAlerts: 'Security-related notifications',
      // Security settings
      passwordMinLength: 'Minimum number of characters required',
      passwordRequireUppercase: 'Require uppercase letters (A-Z)',
      passwordRequireLowercase: 'Require lowercase letters (a-z)',
      passwordRequireNumbers: 'Require numbers (0-9)',
      passwordRequireSymbols: 'Require symbols (!@#$%)',
      passwordExpiryDays: 'Days before password expires (0 = never)',
      sessionTimeoutMinutes: 'Automatic logout after inactivity',
      maxLoginAttempts: 'Failed attempts before account lockout',
      lockoutDurationMinutes: 'Account lockout duration',
      twoFactorRequired: 'Mandatory two-factor authentication',
      twoFactorForAdmins: 'Mandatory 2FA for admin accounts',
      emailVerificationRequired: 'Verify email addresses during registration',
      phoneVerificationRequired: 'Verify phone numbers during registration',
      apiRateLimit: 'Maximum requests per time window',
      apiRateLimitWindow: 'Time window for rate limiting',
      allowedIpAddresses: 'List of allowed IP addresses',
      blockedIpAddresses: 'List of blocked IP addresses',
      sslRequired: 'Force HTTPS connections',
      cookieSecure: 'Use secure cookie attributes',
      cookieSameSite: 'Cookie security policy',
      dataRetentionDays: 'How long to keep user data',
      auditLogRetentionDays: 'How long to keep audit logs',
      gdprCompliance: 'Enable GDPR compliance features',
      ccpaCompliance: 'Enable CCPA compliance features'
    };
    return descriptions[key] || '';
  };

  /**
   * Reset settings to defaults
   */
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    setError(null);
  }, []);

  // Fetch settings on mount and when category changes
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Set up real-time subscription for settings changes
  useEffect(() => {
    if (!isAdmin || !category) return;

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    logDebug('Setting up real-time subscription for platform settings', { category });

    const channel = supabase
      .channel(`platform_settings_${category}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_settings',
          filter: `category=eq.${category}`
        },
        (payload) => {
          logDebug('Platform settings change received', {
            eventType: payload.eventType,
            category
          });

          // Refetch settings when changes occur
          fetchSettings();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [category, isAdmin, fetchSettings]);

  return {
    settings,
    loading,
    saving,
    error,
    lastUpdated,
    saveSettings,
    resetSettings,
    refetch: fetchSettings
  };
};

export default usePlatformSettings;

