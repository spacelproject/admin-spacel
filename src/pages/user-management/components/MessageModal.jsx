import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Image from '../../../components/AppImage';

const MessageModal = ({ isOpen, onClose, user, onSendMessage }) => {
  const [messageData, setMessageData] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !user) return null;

  // Enhanced helper function to safely convert any value to string
  const safeToString = (value) => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      // Handle object with name property
      if (value?.name) {
        return typeof value?.name === 'string' ? value?.name : String(value?.name);
      }
      // Handle object with other potential name fields
      if (value?.firstName && value?.lastName) {
        return `${value?.firstName} ${value?.lastName}`;
      }
      if (value?.firstName) {
        return String(value?.firstName);
      }
      // Fallback for other objects
      return JSON.stringify(value);
    }
    // Handle numbers, booleans, etc.
    return String(value);
  };

  // Helper function to safely get user name with fallback
  const getUserName = (userNameData) => {
    const result = safeToString(userNameData);
    return result || 'User';
  };

  // Safe getters for all user properties
  const userName = getUserName(user?.name);
  const userEmail = safeToString(user?.email) || 'No email provided';
  const userType = safeToString(user?.userType) || 'Unknown';
  const userStatus = safeToString(user?.status) || 'Unknown';

  const priorityOptions = [
    { value: 'low', label: 'Low Priority', color: 'text-blue-600' },
    { value: 'normal', label: 'Normal Priority', color: 'text-green-600' },
    { value: 'high', label: 'High Priority', color: 'text-yellow-600' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' }
  ];

  const messageTemplates = [
    {
      id: 'welcome',
      title: 'Welcome Message',
      subject: 'Welcome to our platform!',
      message: 'Hello {{name}},\n\nWelcome to our platform! We\'re excited to have you as part of our community.\n\nIf you have any questions or need assistance, please don\'t hesitate to reach out.\n\nBest regards,\nThe Support Team'
    },
    {
      id: 'account_verification',
      title: 'Account Verification',
      subject: 'Account Verification Required',
      message: 'Hello {{name}},\n\nWe need to verify your account to ensure security. Please complete the verification process at your earliest convenience.\n\nBest regards,\nThe Support Team'
    },
    {
      id: 'booking_reminder',
      title: 'Booking Reminder',
      subject: 'Upcoming Booking Reminder',
      message: 'Hello {{name}},\n\nThis is a friendly reminder about your upcoming booking. Please make sure to arrive on time.\n\nBest regards,\nThe Support Team'
    },
    {
      id: 'custom',
      title: 'Custom Message',
      subject: '',
      message: ''
    }
  ];

  const handleInputChange = (field, value) => {
    setMessageData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTemplateSelect = (template) => {
    const processedMessage = template?.message?.replace(/{{name}}/g, userName);
    setMessageData({
      subject: template?.subject || '',
      message: processedMessage || '',
      priority: messageData?.priority
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!messageData?.subject?.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!messageData?.message?.trim()) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      const messagePayload = {
        to: safeToString(user?.id),
        recipient: {
          ...user,
          name: userName,
          email: userEmail
        },
        subject: messageData?.subject,
        message: messageData?.message,
        priority: messageData?.priority,
        timestamp: new Date()?.toISOString(),
        status: 'sent'
      };

      onSendMessage?.(messagePayload);
      handleClose();
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMessageData({
      subject: '',
      message: '',
      priority: 'normal'
    });
    setErrors({});
    setIsSubmitting(false);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="MessageCircle" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Send Message</h2>
              <p className="text-sm text-muted-foreground">Send a message to {userName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={handleClose}
            disabled={isSubmitting}
          />
        </div>

        {/* Content */}
        <div className="flex h-[70vh]">
          {/* Left Panel - User Info & Templates */}
          <div className="w-1/3 border-r border-border p-6 overflow-y-auto">
            {/* User Info */}
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-medium text-foreground">Recipient</h3>
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <Image
                    src={user?.avatar}
                    alt={userName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium text-foreground">{userName}</p>
                    <p className="text-sm text-muted-foreground">{userEmail}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <p className="font-medium text-foreground capitalize">{userType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <p className="font-medium text-foreground capitalize">{userStatus}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Templates */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground">Templates</h3>
              <div className="space-y-2">
                {messageTemplates?.map((template) => (
                  <button
                    key={template?.id}
                    type="button"
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-smooth"
                  >
                    <p className="font-medium text-foreground text-sm">{safeToString(template?.title)}</p>
                    {template?.subject && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{safeToString(template?.subject)}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Message Form */}
          <div className="flex-1 p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Priority */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-foreground">Compose Message</h3>
                <select
                  value={messageData?.priority}
                  onChange={(e) => handleInputChange('priority', e?.target?.value)}
                  className="px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
                >
                  {priorityOptions?.map((option) => (
                    <option key={option?.value} value={option?.value}>
                      {safeToString(option?.label)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <Input
                label="Subject"
                type="text"
                placeholder="Enter message subject"
                value={messageData?.subject}
                onChange={(e) => handleInputChange('subject', e?.target?.value)}
                error={errors?.subject}
                required
              />

              {/* Message */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Message <span className="text-destructive">*</span>
                </label>
                <textarea
                  placeholder="Type your message here..."
                  value={messageData?.message}
                  onChange={(e) => handleInputChange('message', e?.target?.value)}
                  rows={12}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
                {errors?.message && (
                  <p className="text-sm text-destructive">{safeToString(errors?.message)}</p>
                )}
              </div>

              {/* Character Count */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Icon name="Info" size={16} />
                  <span>Use {'{{'} name {'}}'} to insert the recipient's name</span>
                </div>
                <span>{messageData?.message?.length || 0} characters</span>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={handleSubmit}
            loading={isSubmitting}
            iconName="Send"
            iconPosition="left"
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;