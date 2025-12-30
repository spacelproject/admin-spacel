import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';

const BulkMessageModal = ({ isOpen, onClose, selectedUserIds, users, onSuccess }) => {
  const { user: adminUser } = useAuth();
  const { showToast } = useToast();
  const [messageData, setMessageData] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [progress, setProgress] = useState({ sent: 0, total: 0 });

  if (!isOpen) return null;

  const selectedUsersData = users?.filter(u => selectedUserIds.includes(u.id)) || [];

  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'normal', label: 'Normal Priority' },
    { value: 'high', label: 'High Priority' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const messageTemplates = [
    {
      id: 'welcome',
      title: 'Welcome Message',
      subject: 'Welcome to our platform!',
      message: 'Hello,\n\nWelcome to our platform! We\'re excited to have you as part of our community.\n\nIf you have any questions or need assistance, please don\'t hesitate to reach out.\n\nBest regards,\nThe Support Team'
    },
    {
      id: 'account_update',
      title: 'Account Update',
      subject: 'Important Account Update',
      message: 'Hello,\n\nWe wanted to inform you about an important update to your account.\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nThe Support Team'
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
    setMessageData({
      subject: template.subject || '',
      message: template.message || '',
      priority: messageData.priority
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!messageData.subject?.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!messageData.message?.trim()) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setProgress({ sent: 0, total: selectedUserIds.length });

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const userId of selectedUserIds) {
        try {
          const user = selectedUsersData.find(u => u.id === userId);
          if (!user) continue;

          // Get or create conversation
          let conversationId;
          
          const { data: existingConvs } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(participant1_id.eq.${userId},participant2_id.eq.${adminUser.id}),and(participant1_id.eq.${adminUser.id},participant2_id.eq.${userId})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingConvs) {
            conversationId = existingConvs.id;
          } else {
            const { data: newConv, error: convError } = await supabase
              .from('conversations')
              .insert({
                participant1_id: userId,
                participant2_id: adminUser.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (convError) throw convError;
            conversationId = newConv.id;
          }

          // Send message
          const messageContent = messageData.subject 
            ? `${messageData.subject}\n\n${messageData.message}`
            : messageData.message;

          const { data: newMessage, error: messageError } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: adminUser.id,
              content: messageContent,
              message_type: 'text',
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (messageError) throw messageError;

          // Create notification
          await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              type: 'message',
              title: 'New message from Admin',
              message: `You have received a new message: ${messageData.subject || 'No subject'}`,
              data: {
                conversation_id: conversationId,
                message_id: newMessage.id,
                sender_id: adminUser.id,
                priority: messageData.priority
              },
              read: false,
              created_at: new Date().toISOString()
            });

          // Update conversation timestamp
          await supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

          successCount++;
          setProgress(prev => ({ ...prev, sent: prev.sent + 1 }));
        } catch (error) {
          console.error(`Error sending message to user ${userId}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        showToast(`Successfully sent message to ${successCount} user(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`, 'success');
        onSuccess?.();
        handleClose();
      } else {
        showToast('Failed to send messages to all users', 'error');
      }
    } catch (error) {
      console.error('Error in bulk messaging:', error);
      setErrors({ general: error.message });
      showToast(`Error sending messages: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
      setProgress({ sent: 0, total: 0 });
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
    setProgress({ sent: 0, total: 0 });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="MessageCircle" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Bulk Message</h2>
              <p className="text-sm text-muted-foreground">
                Send message to {selectedUserIds.length} selected user(s)
              </p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* General Error */}
          {errors?.general && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <div className="flex items-center space-x-2">
                <Icon name="AlertCircle" size={16} className="text-destructive" />
                <p className="text-sm text-destructive">{errors.general}</p>
              </div>
            </div>
          )}

          {/* Selected Users Info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm font-medium text-foreground mb-2">
              Recipients ({selectedUserIds.length})
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {selectedUsersData.map((user) => (
                <div key={user.id} className="text-sm text-muted-foreground">
                  • {user.name} ({user.email})
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar */}
          {isSubmitting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sending messages...</span>
                <span className="text-foreground font-medium">
                  {progress.sent} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.sent / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Message Templates */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Quick Templates</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {messageTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className="p-3 text-left border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
                  disabled={isSubmitting}
                >
                  <p className="text-sm font-medium text-foreground">{template.title}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <Select
            label="Priority"
            options={priorityOptions}
            value={messageData.priority}
            onChange={(value) => handleInputChange('priority', value)}
          />

          {/* Subject */}
          <Input
            label="Subject"
            type="text"
            placeholder="Enter message subject"
            value={messageData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            error={errors?.subject}
            required
            disabled={isSubmitting}
          />

          {/* Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Message</label>
            <textarea
              placeholder="Type your message..."
              value={messageData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              disabled={isSubmitting}
            />
            {errors?.message && (
              <p className="text-xs text-destructive">{errors.message}</p>
            )}
          </div>
        </form>

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

export default BulkMessageModal;

