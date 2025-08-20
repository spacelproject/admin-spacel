import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { useToast } from '../../../components/ui/Toast';

const SendMessageModal = ({ isOpen, onClose, booking, onSendMessage }) => {
  const [messageData, setMessageData] = useState({
    recipient: 'guest',
    subject: '',
    message: '',
    template: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const recipientOptions = [
    { value: 'guest', label: 'Guest' },
    { value: 'host', label: 'Host' },
    { value: 'both', label: 'Both Guest & Host' }
  ];

  const messageTemplates = [
    { value: '', label: 'Custom Message' },
    { value: 'booking_confirmation', label: 'Booking Confirmation' },
    { value: 'check_in_reminder', label: 'Check-in Reminder' },
    { value: 'check_out_reminder', label: 'Check-out Reminder' },
    { value: 'booking_modification', label: 'Booking Modification' },
    { value: 'cancellation_notice', label: 'Cancellation Notice' },
    { value: 'refund_processed', label: 'Refund Processed' },
    { value: 'payment_issue', label: 'Payment Issue' }
  ];

  const getTemplate = (templateKey) => {
    const templates = {
      booking_confirmation: {
        subject: 'Booking Confirmation - ' + booking?.id,
        message: `Dear ${booking?.guestName},\n\nYour booking for ${booking?.spaceName} has been confirmed.\n\nBooking Details:\n- Check-in: ${new Date(booking?.checkIn)?.toLocaleDateString()}\n- Check-out: ${new Date(booking?.checkOut)?.toLocaleDateString()}\n- Total: $${booking?.total}\n\nWe look forward to hosting you!\n\nBest regards,\nAdmin Team`
      },
      check_in_reminder: {
        subject: 'Check-in Reminder - ' + booking?.id,
        message: `Dear ${booking?.guestName},\n\nThis is a friendly reminder that your check-in date for ${booking?.spaceName} is approaching.\n\nCheck-in Date: ${new Date(booking?.checkIn)?.toLocaleDateString()}\n\nPlease ensure you have all necessary documents and contact information ready.\n\nBest regards,\nAdmin Team`
      },
      check_out_reminder: {
        subject: 'Check-out Reminder - ' + booking?.id,
        message: `Dear ${booking?.guestName},\n\nWe hope you're enjoying your stay at ${booking?.spaceName}.\n\nThis is a reminder that your check-out date is: ${new Date(booking?.checkOut)?.toLocaleDateString()}\n\nPlease ensure you follow the check-out procedures provided.\n\nThank you for choosing us!\n\nBest regards,\nAdmin Team`
      },
      booking_modification: {
        subject: 'Booking Modification Notice - ' + booking?.id,
        message: `Dear ${booking?.guestName},\n\nYour booking for ${booking?.spaceName} has been modified.\n\nPlease review the updated booking details in your account.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nAdmin Team`
      },
      cancellation_notice: {
        subject: 'Booking Cancellation - ' + booking?.id,
        message: `Dear ${booking?.guestName},\n\nWe regret to inform you that your booking for ${booking?.spaceName} has been cancelled.\n\nBooking ID: ${booking?.id}\n\nIf this cancellation was unexpected, please contact our support team immediately.\n\nBest regards,\nAdmin Team`
      },
      refund_processed: {
        subject: 'Refund Processed - ' + booking?.id,
        message: `Dear ${booking?.guestName},\n\nYour refund for booking ${booking?.id} has been processed successfully.\n\nRefund Details:\n- Original Amount: $${booking?.total}\n- Processing Time: 3-5 business days\n\nThe refund will be credited back to your original payment method.\n\nBest regards,\nAdmin Team`
      },
      payment_issue: {
        subject: 'Payment Issue - Action Required - ' + booking?.id,
        message: `Dear ${booking?.guestName},\n\nWe've encountered an issue with the payment for your booking ${booking?.id}.\n\nPlease log into your account to review and update your payment information.\n\nIf you need assistance, please contact our support team.\n\nBest regards,\nAdmin Team`
      }
    };

    return templates?.[templateKey] || { subject: '', message: '' };
  };

  useEffect(() => {
    if (booking) {
      setMessageData({
        recipient: 'guest',
        subject: '',
        message: '',
        template: ''
      });
    }
  }, [booking]);

  if (!isOpen || !booking) return null;

  const handleInputChange = (field, value) => {
    setMessageData(prev => ({ ...prev, [field]: value }));
  };

  const handleTemplateChange = (templateKey) => {
    if (templateKey) {
      const template = getTemplate(templateKey);
      setMessageData(prev => ({
        ...prev,
        template: templateKey,
        subject: template?.subject || '',
        message: template?.message || ''
      }));
    } else {
      setMessageData(prev => ({
        ...prev,
        template: '',
        subject: '',
        message: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!messageData?.subject?.trim()) {
      showToast('Please enter a subject', 'error');
      return;
    }

    if (!messageData?.message?.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const messageInfo = {
        bookingId: booking?.id,
        recipient: messageData?.recipient,
        recipientEmail: messageData?.recipient === 'guest' ? booking?.guestEmail : 
                       messageData?.recipient === 'host' ? booking?.hostEmail :
                       [booking?.guestEmail, booking?.hostEmail],
        subject: messageData?.subject,
        message: messageData?.message,
        template: messageData?.template,
        sentAt: new Date()?.toISOString()
      };

      onSendMessage?.(messageInfo);
      
      const recipientText = messageData?.recipient === 'both' ? 'guest and host' : messageData?.recipient;
      showToast(`Message sent successfully to ${recipientText}`, 'success');
      handleClose();
    } catch (error) {
      console.error('Error sending message:', error);
      showToast('Failed to send message', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMessageData({
      recipient: 'guest',
      subject: '',
      message: '',
      template: ''
    });
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon name="MessageCircle" size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Send Message</h2>
              <p className="text-sm text-muted-foreground">Booking ID: {booking?.id}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Booking Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-foreground">Booking Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Guest:</span>
                <p className="font-medium text-foreground">{booking?.guestName}</p>
                <p className="text-xs text-muted-foreground">{booking?.guestEmail}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Host:</span>
                <p className="font-medium text-foreground">{booking?.hostName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Space:</span>
                <p className="font-medium text-foreground">{booking?.spaceName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <p className="font-medium text-foreground capitalize">{booking?.status}</p>
              </div>
            </div>
          </div>

          {/* Message Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Recipient"
                options={recipientOptions}
                value={messageData?.recipient}
                onChange={(value) => handleInputChange('recipient', value)}
                required
              />

              <Select
                label="Message Template"
                options={messageTemplates}
                value={messageData?.template}
                onChange={(value) => handleTemplateChange(value)}
                placeholder="Choose a template (optional)"
              />
            </div>

            <Input
              label="Subject"
              type="text"
              placeholder="Enter message subject"
              value={messageData?.subject}
              onChange={(e) => handleInputChange('subject', e?.target?.value)}
              required
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm min-h-32"
                placeholder="Enter your message"
                value={messageData?.message}
                onChange={(e) => handleInputChange('message', e?.target?.value)}
                required
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Be clear and professional in your communication</span>
                <span>{messageData?.message?.length || 0} characters</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          {(messageData?.subject || messageData?.message) && (
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <h4 className="font-medium text-foreground mb-2">Message Preview</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">To:</span>
                  <span className="ml-2 text-foreground">
                    {messageData?.recipient === 'guest' ? booking?.guestEmail : 
                     messageData?.recipient === 'host' ? booking?.hostName :
                     `${booking?.guestEmail}, ${booking?.hostName}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Subject:</span>
                  <span className="ml-2 text-foreground">{messageData?.subject}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <pre className="whitespace-pre-wrap text-foreground text-xs">
                    {messageData?.message}
                  </pre>
                </div>
              </div>
            </div>
          )}
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
            disabled={!messageData?.subject?.trim() || !messageData?.message?.trim()}
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SendMessageModal;