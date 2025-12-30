import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from './Toast';
import Button from './Button';
import Select from './Select';
import { Checkbox } from './Checkbox';
import Icon from '../AppIcon';
import { logDebug, logError } from '../../utils/logger';
import { playNotificationSound } from '../../utils/soundNotification';

const PreferencesModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    theme: 'light',
    language: 'en',
    notifications_enabled: true,
    email_notifications: true,
    push_notifications: false,
    sound_notifications: true,
    currency: 'USD',
    timezone: 'UTC'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchUserPreferences();
    }
  }, [isOpen, user?.id]);

  const fetchUserPreferences = async () => {
    if (!user?.id) return;

    try {
      setFetching(true);
      const { data: preferences, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (preferences) {
        setFormData({
          theme: preferences.theme || 'light',
          language: preferences.language || 'en',
          notifications_enabled: preferences.notifications_enabled ?? true,
          email_notifications: preferences.email_notifications ?? true,
          push_notifications: preferences.push_notifications ?? false,
          sound_notifications: preferences.sound_notifications ?? true,
          currency: preferences.currency || 'USD',
          timezone: preferences.timezone || 'UTC'
        });
      }
    } catch (error) {
      logError('Error fetching user preferences:', error);
      showToast('Failed to load preferences', 'error');
    } finally {
      setFetching(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      // Upsert user preferences
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          theme: formData.theme,
          language: formData.language,
          notifications_enabled: formData.notifications_enabled,
          email_notifications: formData.email_notifications,
          push_notifications: formData.push_notifications,
          sound_notifications: formData.sound_notifications,
          currency: formData.currency,
          timezone: formData.timezone,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      logDebug('Preferences updated successfully', { userId: user.id });

      showToast('Preferences saved successfully!', 'success');
      onClose();
    } catch (error) {
      logError('Error updating preferences:', error);
      showToast('Failed to save preferences. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' }
  ];

  const currencyOptions = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'AUD', label: 'AUD (A$)' }
  ];

  const timezoneOptions = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Paris', label: 'Paris (CET)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Settings" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Preferences</h2>
              <p className="text-sm text-muted-foreground">Customize your experience</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={onClose}
            disabled={loading}
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading preferences...</span>
            </div>
          ) : (
            <>
              {/* Appearance */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Appearance</h3>
                
                <Select
                  label="Theme"
                  options={themeOptions}
                  value={formData.theme}
                  onChange={(value) => handleSelectChange('theme', value)}
                  description="Choose your preferred color theme"
                />
              </div>

              {/* Language & Region */}
              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-foreground">Language & Region</h3>
                
                <Select
                  label="Language"
                  options={languageOptions}
                  value={formData.language}
                  onChange={(value) => handleSelectChange('language', value)}
                />

                <Select
                  label="Currency"
                  options={currencyOptions}
                  value={formData.currency}
                  onChange={(value) => handleSelectChange('currency', value)}
                />

                <Select
                  label="Timezone"
                  options={timezoneOptions}
                  value={formData.timezone}
                  onChange={(value) => handleSelectChange('timezone', value)}
                />
              </div>

              {/* Notifications */}
              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                
                <div className="space-y-3">
                  <Checkbox
                    label="Enable Notifications"
                    name="notifications_enabled"
                    checked={formData.notifications_enabled}
                    onChange={handleInputChange}
                    description="Receive notifications about important updates"
                  />

                  <Checkbox
                    label="Email Notifications"
                    name="email_notifications"
                    checked={formData.email_notifications}
                    onChange={handleInputChange}
                    disabled={!formData.notifications_enabled}
                    description="Receive notifications via email"
                  />

                  <Checkbox
                    label="Push Notifications"
                    name="push_notifications"
                    checked={formData.push_notifications}
                    onChange={handleInputChange}
                    disabled={!formData.notifications_enabled}
                    description="Receive browser push notifications"
                  />

                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <Checkbox
                        label="Sound Notifications"
                        name="sound_notifications"
                        checked={formData.sound_notifications}
                        onChange={handleInputChange}
                        disabled={!formData.notifications_enabled}
                        description="Play a sound when new notifications arrive"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        playNotificationSound();
                        showToast('Playing test sound...', 'info');
                      }}
                      disabled={!formData.notifications_enabled}
                      className="mt-0.5 shrink-0"
                      iconName="Volume2"
                    >
                      Test
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={loading || fetching}
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={handleSubmit}
            loading={loading}
            disabled={fetching}
            iconName="Save"
            iconPosition="left"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreferencesModal;

