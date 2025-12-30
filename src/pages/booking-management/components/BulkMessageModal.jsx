import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { useToast } from '../../../components/ui/Toast';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

const BulkMessageModal = ({ isOpen, onClose, selectedBookings, bookings, onSendMessage }) => {
  const { showToast } = useToast();
  const { user: adminUser } = useAuth();
  const [messageData, setMessageData] = useState({
    recipient: 'guest',
    subject: '',
    message: '',
    template: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const selectedBookingsData = bookings?.filter(b => selectedBookings.includes(b.id)) || [];

  const recipientOptions = [
    { value: 'guest', label: 'Guests Only' },
    { value: 'host', label: 'Hosts Only' },
    { value: 'both', label: 'Both Guests and Hosts' }
  ];

  const messageTemplates = {
    'booking_confirmed': {
      subject: 'Booking Confirmed',
      message: 'Your booking has been confirmed. We look forward to hosting you!'
    },
    'booking_cancelled': {
      subject: 'Booking Cancelled',
      message: 'Your booking has been cancelled. If you have any questions, please contact support.'
    },
    'payment_reminder': {
      subject: 'Payment Reminder',
      message: 'This is a reminder that payment is pending for your booking. Please complete payment to confirm your reservation.'
    },
    'refund_processed': {
      subject: 'Refund Processed',
      message: 'Your refund has been processed and should appear in your account within 5-7 business days.'
    }
  };

  const getTemplate = (key) => {
    return messageTemplates[key] || { subject: '', message: '' };
  };

  const validateForm = () => {
    const newErrors = {};

    if (!messageData.subject?.trim()) {
      newErrors.subject = 'Please enter a subject';
    }

    if (!messageData.message?.trim()) {
      newErrors.message = 'Please enter a message';
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

    try {
      const messageContent = messageData.subject 
        ? `${messageData.subject}\n\n${messageData.message}`
        : messageData.message;

      let totalSent = 0;
      const errors = [];

      // Send message to each booking's recipients
      for (const booking of selectedBookingsData) {
        try {
          // Determine recipient IDs and emails
          const guestId = booking?.raw?.seeker_id;
          const hostId = booking?.raw?.listings?.partner_id;
          const guestEmail = booking?.guestEmail;

          // Fetch host email if needed
          let hostEmail = null;
          if (hostId && (messageData.recipient === 'host' || messageData.recipient === 'both')) {
            const { data: hostProfile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', hostId)
              .single();
            hostEmail = hostProfile?.email;
          }

          // Determine recipients based on selection
          let recipientIds = [];
          if (messageData.recipient === 'guest' || messageData.recipient === 'both') {
            if (guestId) recipientIds.push(guestId);
          }
          if (messageData.recipient === 'host' || messageData.recipient === 'both') {
            if (hostId) recipientIds.push(hostId);
          }

          // Send message to each recipient
          for (const recipientId of recipientIds) {
            // Get or create conversation
            let conversationId;

            const { data: existingConvs } = await supabase
              .from('conversations')
              .select('id')
              .or(`and(participant1_id.eq.${recipientId},participant2_id.eq.${adminUser.id}),and(participant1_id.eq.${adminUser.id},participant2_id.eq.${recipientId})`)
              .order('created_at', { ascending: false })
              .limit(1);

            const existingConv = existingConvs?.[0];

            if (existingConv) {
              conversationId = existingConv.id;
            } else {
              const { data: newConv, error: convError } = await supabase
                .from('conversations')
                .insert({
                  participant1_id: recipientId,
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
                user_id: recipientId,
                type: 'message',
                title: `Bulk message about booking ${booking.booking_reference}`,
                message: messageData.subject || 'You have received a new message',
                data: {
                  conversation_id: conversationId,
                  message_id: newMessage.id,
                  sender_id: adminUser.id,
                  booking_id: booking.id
                },
                read: false,
                created_at: new Date().toISOString()
              });

            // Update conversation timestamp
            await supabase
              .from('conversations')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', conversationId);

            totalSent++;
          }
        } catch (error) {
          console.error(`Error sending message for booking ${booking.id}:`, error);
          errors.push({ bookingId: booking.id, error: error.message });
        }
      }

      if (errors.length > 0) {
        showToast(`Sent ${totalSent} messages, but ${errors.length} failed`, 'warning');
      } else {
        showToast(`Successfully sent ${totalSent} message(s)`, 'success');
      }

      onSendMessage?.({ totalSent, errors });
      handleClose();
    } catch (error) {
      console.error('Error sending bulk messages:', error);
      setErrors({ general: error.message });
      showToast(`Error sending messages: ${error.message}`, 'error');
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
    setErrors({});
    setIsSubmitting(false);
    onClose();
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon name="MessageCircle" size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Bulk Send Message</h2>
              <p className="text-sm text-muted-foreground">
                Sending message to {selectedBookings.length} selected booking(s)
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You are about to send a message to recipients from the following bookings:
            </p>
            <ul className="list-disc list-inside text-sm text-foreground max-h-32 overflow-y-auto border border-border rounded-md p-3 bg-muted/30">
              {selectedBookingsData.map(booking => (
                <li key={booking.id}>
                  {booking.guestName} - {booking.spaceName} (Reference: {booking.booking_reference})
                </li>
              ))}
            </ul>
          </div>

          <Select
            label="Recipient"
            options={recipientOptions}
            value={messageData.recipient}
            onChange={(value) => setMessageData(prev => ({ ...prev, recipient: value }))}
          />

          <Select
            label="Message Template (Optional)"
            options={[
              { value: '', label: 'No Template' },
              { value: 'booking_confirmed', label: 'Booking Confirmed' },
              { value: 'booking_cancelled', label: 'Booking Cancelled' },
              { value: 'payment_reminder', label: 'Payment Reminder' },
              { value: 'refund_processed', label: 'Refund Processed' }
            ]}
            value={messageData.template}
            onChange={handleTemplateChange}
          />

          <Input
            label="Subject"
            placeholder="Enter message subject"
            value={messageData.subject}
            onChange={(e) => setMessageData(prev => ({ ...prev, subject: e.target.value }))}
            error={errors.subject}
            required
          />

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Message <span className="text-destructive">*</span>
            </label>
            <Input
              type="textarea"
              placeholder="Enter your message..."
              value={messageData.message}
              onChange={(e) => setMessageData(prev => ({ ...prev, message: e.target.value }))}
              rows={6}
              error={errors.message}
              required
            />
          </div>

          {errors.general && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive">{errors.general}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border flex-shrink-0">
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
            disabled={!messageData.subject || !messageData.message || isSubmitting}
          >
            {isSubmitting ? 'Sending...' : `Send to ${selectedBookings.length} Booking(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkMessageModal;

