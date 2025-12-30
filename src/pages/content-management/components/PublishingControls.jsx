import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';

const PublishingControls = ({ item, onPublish, onSchedule, onSaveDraft }) => {
  const [publishSettings, setPublishSettings] = useState({
    status: item?.status || 'draft',
    scheduledDate: item?.scheduledDate ? new Date(item.scheduledDate).toISOString().slice(0, 16) : '',
    audience: item?.audience || 'all_users',
    enableNotifications: item?.enableNotifications || false,
    sendEmail: false,
    sendPush: false
  });

  const statusOptions = [
    { value: 'draft', label: 'Save as Draft' },
    { value: 'published', label: 'Publish Now' },
    { value: 'scheduled', label: 'Schedule for Later' }
  ];

  const audienceOptions = [
    { value: 'all_users', label: 'All Users' },
    { value: 'seekers_only', label: 'Seekers Only' },
    { value: 'partners_only', label: 'Partners Only' }
  ];

  const handleSettingChange = (field, value) => {
    setPublishSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePublish = () => {
    if (publishSettings.status === 'published') {
      onPublish(publishSettings);
    } else if (publishSettings.status === 'scheduled') {
      onSchedule(publishSettings);
    } else {
      onSaveDraft(publishSettings);
    }
  };

  const getPublishButtonText = () => {
    switch (publishSettings.status) {
      case 'published':
        return 'Publish Now';
      case 'scheduled':
        return 'Schedule Publication';
      default:
        return 'Save Draft';
    }
  };

  const getPublishButtonVariant = () => {
    switch (publishSettings.status) {
      case 'published':
        return 'default';
      case 'scheduled':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Icon name="Settings" size={20} className="text-muted-foreground" />
        <h3 className="font-medium text-foreground">Publishing Settings</h3>
      </div>

      <div className="space-y-4">
        <Select
          label="Publication Status"
          options={statusOptions}
          value={publishSettings.status}
          onChange={(value) => handleSettingChange('status', value)}
        />

        {publishSettings.status === 'scheduled' && (
          <Input
            label="Scheduled Date & Time"
            type="datetime-local"
            value={publishSettings.scheduledDate}
            onChange={(e) => handleSettingChange('scheduledDate', e.target.value)}
            required
          />
        )}

        <Select
          label="Target Audience"
          options={audienceOptions}
          value={publishSettings.audience}
          onChange={(value) => handleSettingChange('audience', value)}
        />

        {publishSettings.status !== 'draft' && (
          <div className="space-y-3">
            <h4 className="font-medium text-foreground">Notification Settings</h4>
            
            <Checkbox
              label="Enable notifications"
              description="Send notifications when content is published"
              checked={publishSettings.enableNotifications}
              onChange={(e) => handleSettingChange('enableNotifications', e.target.checked)}
            />

            {publishSettings.enableNotifications && (
              <div className="ml-6 space-y-2">
                <Checkbox
                  label="Email notifications"
                  description="Send email to subscribed users"
                  checked={publishSettings.sendEmail}
                  onChange={(e) => handleSettingChange('sendEmail', e.target.checked)}
                />
                
                <Checkbox
                  label="Push notifications"
                  description="Send push notifications to mobile users"
                  checked={publishSettings.sendPush}
                  onChange={(e) => handleSettingChange('sendPush', e.target.checked)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {publishSettings.status === 'published' && 'Content will be published immediately'}
            {publishSettings.status === 'scheduled' && publishSettings.scheduledDate && 
              `Scheduled for ${new Date(publishSettings.scheduledDate).toLocaleString()}`}
            {publishSettings.status === 'draft' && 'Content will be saved as draft'}
          </div>
          
          <Button
            variant={getPublishButtonVariant()}
            onClick={handlePublish}
            disabled={publishSettings.status === 'scheduled' && !publishSettings.scheduledDate}
          >
            {getPublishButtonText()}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PublishingControls;