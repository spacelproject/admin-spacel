import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Image from '../../../components/AppImage';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { formatCurrencyDisplay } from '../../../utils/currency';

const MessageModal = ({ isOpen, onClose, user, onSendMessage }) => {
  const { user: adminUser } = useAuth();
  const [messageData, setMessageData] = useState({
    subject: '',
    message: '',
    priority: 'normal'
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(true); // Start with loading true
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false); // Track if we've loaded messages at least once
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const lastFetchedConvId = useRef(null);
  const addedMessageIds = useRef(new Set()); // Track message IDs we've already added

  // Set up conversation
  const setupConversation = async () => {
    if (!user?.id || !adminUser?.id) {
      console.log('Missing user or adminUser:', { userId: user?.id, adminUserId: adminUser?.id });
      return;
    }
    
    console.log('Setting up conversation between admin:', adminUser.id, 'and user:', user.id);
    
    try {
      // Check if conversation exists
      const { data: existingConvs, error: convCheckError } = await supabase
        .from('conversations')
        .select('id, created_at')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${adminUser.id}),and(participant1_id.eq.${adminUser.id},participant2_id.eq.${user.id})`)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (convCheckError) {
        console.error('Error checking existing conversation:', convCheckError);
        throw convCheckError;
      }
      
      const existingConv = existingConvs?.[0];
      
      if (existingConv) {
        console.log('Found existing conversation:', existingConv.id);
        setConversationId(existingConv.id);
        // Fetch messages and set up subscription in parallel for faster loading
        Promise.all([
          fetchMessages(existingConv.id),
          setupRealtimeSubscription(existingConv.id),
          markMessagesAsRead(existingConv.id)
        ]);
      } else {
        console.log('Creating new conversation...');
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participant1_id: user.id,
            participant2_id: adminUser.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (convError) {
          console.error('Error creating conversation:', convError);
          throw convError;
        }
        
        console.log('Created new conversation:', newConv.id);
        setConversationId(newConv.id);
        
        // Skip conversation_participants for now due to permission issues
        // The conversations table already has participant information
        
        // Set up everything in parallel for faster loading
        Promise.all([
          fetchMessages(newConv.id),
          setupRealtimeSubscription(newConv.id),
          markMessagesAsRead(newConv.id)
        ]);
      }
      
    } catch (error) {
      console.error('Error setting up conversation:', error);
    }
  };

  // Set up conversation and messages when modal opens
  useEffect(() => {
    if (isOpen && user?.id && adminUser?.id) {
      // Clear previous messages and ensure loading state is set
      setMessages([]);
      setLoadingMessages(true);
      // Use setTimeout to ensure state updates are processed before setupConversation
      setTimeout(() => {
        setupConversation();
      }, 0);
    }
    
    return () => {
      // Clean up subscription when modal closes
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [isOpen, user?.id, adminUser?.id]);

  if (!isOpen || !user) return null;

  // Fetch messages for the conversation
  const fetchMessages = async (convId) => {
    if (!convId) return;
    
    try {
      // Use a more efficient query with better indexing
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          read_at,
          message_type,
          space_context_name,
          profiles:sender_id (
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(50); // Limit to last 50 messages for better performance

      if (error) throw error;
      setMessages(data || []);
      setHasLoadedOnce(true); // Mark that we've loaded messages at least once
      lastFetchedConvId.current = convId; // Cache this conversation ID
      
      // Mark all loaded messages as added to prevent duplicates
      if (data && data.length > 0) {
        data.forEach(msg => {
          addedMessageIds.current.add(msg.id);
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Helper function to fetch message with profile data
  const fetchMessageWithProfile = async (messageId) => {
    // Skip if we've already added this message
    if (addedMessageIds.current.has(messageId)) {
      console.log('Message already in added set, skipping:', messageId);
      return;
    }

    try {
      const { data: messageWithProfile, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          read_at,
          message_type,
          space_context_name,
          profiles:sender_id (
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('id', messageId)
        .single();

      if (error) throw error;

      // Double-check it's not already in state
      setMessages(prev => {
        const messageExists = prev.some(msg => msg.id === messageWithProfile.id);
        if (messageExists || addedMessageIds.current.has(messageId)) {
          return prev; // Don't add duplicate
        }
        
        // Mark as added
        addedMessageIds.current.add(messageId);
        return [...prev, messageWithProfile];
      });

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error fetching message with profile:', error);
    }
  };

  // Set up real-time subscription for messages
  const setupRealtimeSubscription = (convId) => {
    if (!convId) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    subscriptionRef.current = supabase
      .channel(`messages-${convId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${convId}`
        }, 
        async (payload) => {
          console.log('Message change received:', payload);
          
          if (payload.eventType === 'INSERT') {
            // Skip if we've already added this message ID
            if (addedMessageIds.current.has(payload.new.id)) {
              console.log('Message already in added set, skipping duplicate:', payload.new.id);
              return;
            }
            
            // Fetch with profile data and add it
            fetchMessageWithProfile(payload.new.id);
          } else if (payload.eventType === 'UPDATE') {
            // Update existing message (e.g., read status)
            setMessages(prev => prev.map(msg => 
              msg.id === payload.new.id ? { ...msg, ...payload.new } : msg
            ));
          }
        }
      )
      .subscribe();
  };

  // Mark messages as read
  const markMessagesAsRead = async (convId) => {
    if (!convId || !adminUser?.id) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .neq('sender_id', adminUser.id) // Don't mark own messages as read
        .is('read_at', null); // Only mark unread messages

      if (error) throw error;
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

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
  const userType = safeToString(user?.role) || 'Unknown';
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

    if (!adminUser?.id || !conversationId) {
      setErrors({ general: 'Admin user not authenticated or conversation not set up' });
      return;
    }

    setIsSubmitting(true);

    try {
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
      
      // Fetch the message with profile data and add it immediately for better UX
      // The real-time subscription will try to add it too, but we prevent duplicates
      const { data: messageWithProfile, error: fetchError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          created_at,
          read_at,
          message_type,
          space_context_name,
          profiles:sender_id (
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('id', newMessage.id)
        .single();
      
      if (!fetchError && messageWithProfile) {
        // Mark this message ID as added to prevent duplicates from real-time subscription
        addedMessageIds.current.add(messageWithProfile.id);
        
        // Add message immediately - the real-time subscription will skip it
        setMessages(prev => {
          const messageExists = prev.some(msg => msg.id === messageWithProfile.id);
          if (messageExists) {
            return prev; // Don't add duplicate
          }
          return [...prev, messageWithProfile];
        });
        
        // Scroll to bottom
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
      
      // Create notification for recipient
      const recipientId = user.id;
      const notificationTitle = `New message from Admin`;
      const notificationMessage = `You have received a new message: ${messageData.subject || 'No subject'}`;
      
      // For regular users, create notification in notifications table
      await supabase
        .from('notifications')
        .insert({
          user_id: recipientId,
          type: 'message',
          title: notificationTitle,
          message: notificationMessage,
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
      
      // Clear form (but keep success state)
      setMessageData(prev => ({
        subject: '',
        message: '',
        priority: 'normal',
        success: prev.success // Keep success state
      }));

      const messagePayload = {
        to: user.id,
        recipient: {
          id: user.id,
          name: userName,
          email: userEmail
        },
        subject: messageData.subject,
        message: messageData.message,
        priority: messageData.priority,
        timestamp: new Date().toISOString(),
        status: 'sent',
        conversation_id: conversationId,
        message_id: newMessage.id
      };

      onSendMessage?.(messagePayload);
      
      // Show success message
      setErrors({});
      // Add a temporary success state
      setMessageData(prev => ({ ...prev, success: true }));
      
      // Clear success state after 2 seconds
      setTimeout(() => {
        setMessageData(prev => ({ ...prev, success: false }));
      }, 2000);
      
    } catch (error) {
      console.error('Error sending message:', error);
      setErrors({ general: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMessageData({
      subject: '',
      message: '',
      priority: 'normal',
      success: false
    });
    setErrors({});
    setIsSubmitting(false);
    setMessages([]);
    setConversationId(null);
    setHasLoadedOnce(false); // Reset loaded flag
    lastFetchedConvId.current = null; // Reset cache
    addedMessageIds.current.clear(); // Clear added message IDs
    
    // Clean up subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden border border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-gradient-to-r from-background to-muted/5">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Icon name="MessageCircle" size={24} className="text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Send Message</h2>
              <p className="text-sm text-muted-foreground">Start a conversation with {userName}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={handleClose}
            disabled={isSubmitting}
            className="hover:bg-destructive/10 hover:text-destructive transition-colors rounded-full w-10 h-10"
          />
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Message History */}
          <div className="w-2/3 border-r border-border/50 flex flex-col">
            {/* Message History Header */}
            <div className="p-6 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon name="MessageCircle" size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Conversation</h3>
                    <p className="text-sm text-muted-foreground">with {userName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loadingMessages || !hasLoadedOnce ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Icon name="Loader2" className="animate-spin text-primary" size={24} />
                  </div>
                  <p className="text-muted-foreground font-medium">Loading messages...</p>
                  <p className="text-sm text-muted-foreground mt-1">Please wait while we fetch your conversation</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-6">
                    <Icon name="MessageCircle" size={32} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No messages yet</h3>
                  <p className="text-muted-foreground mb-4">Start the conversation by sending your first message</p>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Icon name="ArrowDown" size={16} />
                    <span>Use the compose form on the right</span>
                  </div>
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = message.sender_id === adminUser?.id;
                  const isRead = message.read_at !== null;
                  const senderName = message.profiles 
                    ? `${message.profiles.first_name || ''} ${message.profiles.last_name || ''}`.trim() || 'Admin'
                    : (message.sender_id === adminUser?.id ? 'Admin' : 'User');
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-6`}
                    >
                      <div className={`max-w-[75%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                        <div className={`rounded-2xl p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                          isOwnMessage 
                            ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-br-md' 
                            : 'bg-gradient-to-br from-muted to-muted/80 text-foreground rounded-bl-md border border-border/50'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          {message.space_context_name && (
                            <div className="mt-2 pt-2 border-t border-current/20">
                              <p className="text-xs opacity-75 font-medium flex items-center">
                                <Icon name="MapPin" size={12} className="mr-1" />
                                Space: {message.space_context_name}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className={`flex items-center mt-2 text-xs text-muted-foreground ${
                          isOwnMessage ? 'justify-end' : 'justify-start'
                        }`}>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{senderName}</span>
                            <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                            <span>{new Date(message.created_at).toLocaleString()}</span>
                            {isOwnMessage && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                                <span className={`flex items-center space-x-1 ${
                                  isRead ? 'text-green-600' : 'text-yellow-600'
                                }`}>
                                  <Icon name={isRead ? 'CheckCircle' : 'Clock'} size={12} />
                                  <span>{isRead ? 'Read' : 'Sent'}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Right Panel - Compose & User Info */}
          <div className="w-1/3 flex flex-col">
            {/* User Info - Compact */}
            <div className="p-4 border-b border-border/50">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Image
                    src={user?.avatar}
                    alt={userName}
                    className="w-12 h-12 rounded-full object-cover border-2 border-border/50"
                  />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background ${
                    userStatus === 'active' ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground truncate">{userName}</h4>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      userStatus === 'active' 
                        ? 'text-green-700 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}>
                      {userStatus}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                      userType === 'partner' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>
                      {userType}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compose Form */}
            <div className="flex-1 p-4 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* General Error */}
                {errors?.general && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                        <Icon name="AlertCircle" size={16} className="text-destructive" />
                      </div>
                      <p className="text-sm text-destructive font-medium">{errors.general}</p>
                    </div>
                  </div>
                )}
                
                {/* Success Message */}
                {messageData?.success && (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <Icon name="CheckCircle" size={16} className="text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-sm text-green-800 dark:text-green-200 font-medium">Message sent successfully!</p>
                    </div>
                  </div>
                )}

                {/* Message Templates - Compact */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Icon name="Zap" size={16} className="text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Quick Templates</h3>
                  </div>
                  <div className="space-y-2">
                    {messageTemplates?.map((template) => (
                      <button
                        key={template?.id}
                        type="button"
                        onClick={() => handleTemplateSelect(template)}
                        className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                      >
                        <div className="flex items-center space-x-2">
                          <Icon name="MessageSquare" size={14} className="text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm group-hover:text-primary transition-colors truncate">
                              {safeToString(template?.title)}
                            </p>
                            {template?.subject && (
                              <p className="text-xs text-muted-foreground truncate">
                                {safeToString(template?.subject)}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Compose Message */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon name="Edit3" size={16} className="text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">Compose</h3>
                    </div>
                    <select
                      value={messageData?.priority}
                      onChange={(e) => handleInputChange('priority', e?.target?.value)}
                      className="px-2 py-1 rounded-md border border-border/50 bg-background text-foreground text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                    >
                      {priorityOptions?.map((option) => (
                        <option key={option?.value} value={option?.value}>
                          {safeToString(option?.label)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Subject */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Subject</label>
                  <input
                    type="text"
                    placeholder="Enter subject"
                    value={messageData?.subject}
                    onChange={(e) => handleInputChange('subject', e?.target?.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    required
                  />
                  {errors?.subject && (
                    <p className="text-xs text-destructive">{safeToString(errors?.subject)}</p>
                  )}
                </div>

                {/* Message */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Message</label>
                  <textarea
                    placeholder="Type your message..."
                    value={messageData?.message}
                    onChange={(e) => handleInputChange('message', e?.target?.value)}
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary resize-none transition-all text-sm"
                  />
                  {errors?.message && (
                    <p className="text-xs text-destructive">{safeToString(errors?.message)}</p>
                  )}
                </div>

                {/* Character Count */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{messageData?.message?.length || 0} characters</span>
                  <span className="text-xs">Use {'{{'} name {'}}'} for recipient name</span>
                </div>
            </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border/50">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Icon name="Shield" size={14} />
            <span>Encrypted & secure</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border-border/50 hover:border-destructive/50 hover:text-destructive transition-all text-sm"
            >
              Cancel
            </Button>
            <Button 
              variant="default" 
              onClick={handleSubmit}
              loading={isSubmitting}
              iconName="Send"
              iconPosition="left"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all text-sm"
            >
              {isSubmitting ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageModal;