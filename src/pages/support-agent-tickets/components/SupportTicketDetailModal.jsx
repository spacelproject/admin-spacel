import React, { useState, useEffect, useRef } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { supabase, storage } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';

const SupportTicketDetailModal = ({ ticket, isOpen, onClose, onUpdate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('conversation');
  const [newMessage, setNewMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [ticketStatus, setTicketStatus] = useState(ticket?.status || 'open');
  const [ticketPriority, setTicketPriority] = useState(ticket?.priority || 'medium');
  const [replies, setReplies] = useState([]);
  const [internalNotes, setInternalNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [relatedBookings, setRelatedBookings] = useState([]);
  const conversationEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Update status/priority when ticket changes
  useEffect(() => {
    if (ticket) {
      // Normalize status: if ticket has a status that's not 'open' or 'resolved', map it
      let normalizedStatus = ticket.status || 'open';
      if (normalizedStatus !== 'open' && normalizedStatus !== 'resolved') {
        // Map other statuses: pending, in-progress -> open; closed -> resolved
        if (normalizedStatus === 'closed') {
          normalizedStatus = 'resolved';
        } else {
          normalizedStatus = 'open';
        }
      }
      setTicketStatus(normalizedStatus);
      setTicketPriority(ticket.priority || 'medium');
    }
  }, [ticket]);

  // Set up real-time subscriptions and fetch initial data
  useEffect(() => {
    if (!isOpen || !ticket?.dbId) return;

    fetchReplies();
    fetchInternalNotes();
    if (ticket.bookingId) fetchRelatedBookings();

    // Real-time subscription for replies
    const repliesChannel = supabase
      .channel(`support_replies_${ticket.dbId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'support_ticket_replies',
          filter: `ticket_id=eq.${ticket.dbId}`
        }, 
        (payload) => {
          console.log('🔄 Reply change received:', payload.eventType);
          if (payload.eventType === 'INSERT') {
            // Fetch fresh replies to get full data with profiles
            fetchReplies();
          } else if (payload.eventType === 'UPDATE') {
            fetchReplies();
          }
        }
      )
      .subscribe()

    // Real-time subscription for internal notes
    const notesChannel = supabase
      .channel(`support_notes_${ticket.dbId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'support_ticket_notes',
          filter: `ticket_id=eq.${ticket.dbId}`
        }, 
        (payload) => {
          console.log('🔄 Note change received:', payload.eventType);
          fetchInternalNotes();
        }
      )
      .subscribe()

    // Real-time subscription for ticket updates
    const ticketChannel = supabase
      .channel(`support_ticket_${ticket.dbId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'support_tickets',
          filter: `id=eq.${ticket.dbId}`
        }, 
        (payload) => {
          console.log('🔄 Ticket update received:', payload.new);
          if (payload.new) {
            // Normalize status if it's not 'open' or 'resolved'
            let normalizedStatus = payload.new.status || ticketStatus;
            if (normalizedStatus !== 'open' && normalizedStatus !== 'resolved') {
              if (normalizedStatus === 'closed') {
                normalizedStatus = 'resolved';
              } else {
                normalizedStatus = 'open';
              }
            }
            setTicketStatus(normalizedStatus);
            setTicketPriority(payload.new.priority || ticketPriority);
            if (onUpdate) {
              onUpdate({ ...ticket, ...payload.new, status: normalizedStatus });
            }
          }
        }
      )
      .subscribe()

    return () => {
      repliesChannel.unsubscribe();
      notesChannel.unsubscribe();
      ticketChannel.unsubscribe();
    }
  }, [isOpen, ticket?.dbId]);

  const fetchReplies = async () => {
    if (!ticket?.dbId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_ticket_replies')
        .select(`
          id,
          content,
          created_at,
          user_id,
          admin_id,
          attachments,
          profiles:user_id (first_name, last_name, email, avatar_url),
          admin_profiles:admin_id (first_name, last_name, email, avatar_url)
        `)
        .eq('ticket_id', ticket.dbId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (data) {
        setReplies(data);
        // Auto-scroll to bottom after fetching
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
      showToast('Failed to load messages. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchInternalNotes = async () => {
    if (!ticket?.dbId) return;
    try {
      const { data, error } = await supabase
        .from('support_ticket_notes')
        .select(`
          id,
          note,
          created_at,
          author_admin_id,
          admin_profiles:author_admin_id (first_name, last_name, email, avatar_url)
        `)
        .eq('ticket_id', ticket.dbId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setInternalNotes(data);
      }
    } catch (error) {
      console.error('Error fetching internal notes:', error);
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchRelatedBookings = async () => {
    if (!ticket?.bookingId) {
      setRelatedBookings([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          start_time,
          end_time,
          total_paid,
          status,
          listings:listing_id (name)
        `)
        .eq('id', ticket.bookingId);

      if (error) throw error;
      if (data) {
        setRelatedBookings(data.map(b => ({
          id: b.id,
          start_time: b.start_time,
          end_time: b.end_time,
          price: b.total_paid || 0,
          status: b.status,
          listings: b.listings
        })));
      }
    } catch (error) {
      console.error('Error fetching related bookings:', error);
      setRelatedBookings([]);
    }
  };

  const formatTimestamp = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Show relative time with full date on hover
    let relativeTime = '';
    if (diffMins < 1) {
      relativeTime = 'Just now';
    } else if (diffMins < 60) {
      relativeTime = `${diffMins}m ago`;
    } else if (diffHours < 24) {
      relativeTime = `${diffHours}h ago`;
    } else if (diffDays === 1) {
      relativeTime = 'Yesterday';
    } else if (diffDays < 7) {
      relativeTime = `${diffDays}d ago`;
    } else {
      relativeTime = messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const fullDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(messageDate);

    return { relativeTime, fullDate };
  };

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Auto-scroll when replies change
  useEffect(() => {
    if (replies.length > 0 && activeTab === 'conversation') {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [replies.length, activeTab]);

  if (!isOpen || !ticket) return null;

  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'resolved', label: 'Resolved' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const templateResponses = [
    {
      id: 'welcome',
      title: 'Welcome & Acknowledgment',
      content: `Thank you for contacting SPACEL support. We have received your inquiry and will respond within 24 hours. Your ticket number is #${ticket.id} for future reference.`
    },
    {
      id: 'technical',
      title: 'Technical Issue Resolution',
      content: `We have identified the technical issue you reported. Our development team is working on a fix. We will update you as soon as the issue is resolved.`
    },
    {
      id: 'billing',
      title: 'Billing Inquiry Response',
      content: `Thank you for your billing inquiry. We have reviewed your account and will provide detailed information about your charges within the next business day.`
    },
    {
      id: 'resolved',
      title: 'Issue Resolved',
      content: `Your issue has been resolved. Please let us know if you need any further assistance. We appreciate your patience and thank you for using SPACEL.`
    }
  ];

  const priorityColors = {
    urgent: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200'
  };

  const statusColors = {
    open: 'bg-blue-100 text-blue-800 border-blue-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'in-progress': 'bg-purple-100 text-purple-800 border-purple-200',
    resolved: 'bg-green-100 text-green-800 border-green-200',
    closed: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const handleSendMessage = async (e) => {
    // Handle Enter key - send if Enter, new line if Shift+Enter
    if (e && e.type === 'keydown') {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendingMessage && (newMessage.trim() || attachments.length > 0)) {
          await sendMessage();
        }
        return;
      }
    }
    
    // For click events, just call sendMessage directly
    if (e && e.type === 'click') {
      e.preventDefault();
      if (!sendingMessage && (newMessage.trim() || attachments.length > 0)) {
        await sendMessage();
      }
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate files
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    for (const file of files) {
      if (file.size > maxSize) {
        showToast(`File ${file.name} exceeds 10MB limit`, 'error');
        return;
      }
      if (!allowedTypes.includes(file.type)) {
        showToast(`File type ${file.type} not allowed`, 'error');
        return;
      }
    }

    setUploadingFiles(true);
    try {
      const uploadedAttachments = [];
      
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${ticket.dbId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await storage.support.upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = storage.support.getPublicUrl(fileName);
        
        uploadedAttachments.push({
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type
        });
      }

      setAttachments(prev => [...prev, ...uploadedAttachments]);
      showToast(`${files.length} file(s) attached successfully`, 'success');
    } catch (error) {
      console.error('Error uploading files:', error);
      showToast(error.message || 'Failed to upload files. Please try again.', 'error');
    } finally {
      setUploadingFiles(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || !ticket?.dbId || !user?.id || sendingMessage) {
      console.log('❌ sendMessage blocked:', {
        hasMessage: !!newMessage.trim(),
        hasAttachments: attachments.length > 0,
        hasTicketDbId: !!ticket?.dbId,
        hasUserId: !!user?.id,
        sendingMessage
      });
      return;
    }
    
    // user_id is required - should be the ticket owner's user_id
    // admin_id is the admin/support agent replying
    if (!ticket?.user?.id) {
      console.error('❌ Ticket user ID missing:', ticket);
      showToast('Ticket user information missing. Cannot send reply.', 'error');
      return;
    }
    
    console.log('✅ Sending message with:', {
      ticket_id: ticket.dbId,
      user_id: ticket.user.id,
      admin_id: user.id,
      content_length: newMessage.trim().length,
      attachments_count: attachments.length
    });
    
    setSendingMessage(true);
    try {
      const { error } = await supabase
        .from('support_ticket_replies')
        .insert([{
          ticket_id: ticket.dbId,
          user_id: ticket.user.id, // Ticket owner's user_id (required)
          admin_id: user.id, // Admin/support agent replying
          content: newMessage.trim() || '(No message)',
          attachments: attachments.length > 0 ? attachments : []
        }]);

      if (error) {
        console.error('❌ Error inserting reply:', error);
        throw error;
      }

      console.log('✅ Reply sent successfully');
      setNewMessage('');
      setAttachments([]);
      // Real-time subscription will update replies automatically
      // But we can fetch to ensure immediate update
      await fetchReplies();
      
      // Update ticket's updated_at
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticket.dbId);

      if (onUpdate) {
        onUpdate({ ...ticket, updated_at: new Date().toISOString() });
      }

      showToast('Message sent successfully', 'success');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      showToast(error.message || 'Failed to send message. Please try again.', 'error');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateTicket = async () => {
    if (!ticket?.dbId || updatingTicket) return;
    
    // Check if anything actually changed
    const statusChanged = ticketStatus !== ticket.status;
    const priorityChanged = ticketPriority !== ticket.priority;
    
    if (!statusChanged && !priorityChanged) {
      showToast('No changes to save', 'info');
      return;
    }
    
    setUpdatingTicket(true);
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: ticketStatus,
          priority: ticketPriority,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticket.dbId);

      if (error) throw error;

      // Build informative toast message
      const changes = [];
      if (statusChanged) {
        changes.push(`status changed to ${ticketStatus.replace('-', ' ')}`);
      }
      if (priorityChanged) {
        changes.push(`priority changed to ${ticketPriority}`);
      }
      
      const changeMessage = changes.length > 0 
        ? `Ticket ${changes.join(' and ')}` 
        : 'Ticket updated';
      
      if (onUpdate) {
        onUpdate({ ...ticket, status: ticketStatus, priority: ticketPriority });
      }

      showToast(`${changeMessage} successfully`, 'success');
    } catch (error) {
      console.error('Error updating ticket:', error);
      showToast(error.message || 'Failed to update ticket. Please try again.', 'error');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!internalNote.trim() || !ticket?.dbId || !user?.id) return;
    
    try {
      const { error } = await supabase
        .from('support_ticket_notes')
        .insert([{
          ticket_id: ticket.dbId,
          author_admin_id: user.id,
          note: internalNote.trim()
        }]);

      if (error) throw error;

      setInternalNote('');
      // Real-time subscription will update notes automatically
      showToast('Internal note added', 'success');
    } catch (error) {
      console.error('Error adding internal note:', error);
      showToast(error.message || 'Failed to add internal note. Please try again.', 'error');
    }
  };

  const handleTemplateSelect = (template) => {
    setNewMessage(template.content);
  };

  const tabs = [
    { id: 'conversation', label: 'Conversation', icon: 'MessageCircle' },
    { id: 'notes', label: 'Internal Notes', icon: 'FileText' },
    { id: 'history', label: 'Ticket History', icon: 'Clock' },
    { id: 'details', label: 'User Details', icon: 'User' },
    { id: 'related', label: 'Related Items', icon: 'Link' }
  ];

  const conversationMessages = [
    {
      id: 'initial',
      sender: 'user',
      message: ticket.description || '',
      timestamp: ticket.createdAt,
      senderName: ticket.user?.name,
      attachments: ticket.attachments || []
    },
    ...replies.map(r => ({
      id: r.id,
      sender: r.admin_id ? 'support' : 'user',
      message: r.content,
      timestamp: r.created_at,
      senderName: r.admin_id 
        ? `${r.admin_profiles?.first_name || ''} ${r.admin_profiles?.last_name || ''}`.trim() || 'Support'
        : `${r.profiles?.first_name || ''} ${r.profiles?.last_name || ''}`.trim() || 'User',
      avatar: r.admin_id ? null : r.profiles?.avatar_url,
      attachments: r.attachments || []
    }))
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-modal flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-modal w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">
                Ticket #{ticket.id}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                iconName="Copy"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(ticket.id)
                    showToast('Ticket ID copied to clipboard', 'success')
                  } catch (error) {
                    showToast('Failed to copy ticket ID', 'error')
                  }
                }}
                title="Copy ticket ID"
              />
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityColors[ticket.priority] || priorityColors.medium}`}>
              {ticket.priority}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[ticket.status] || statusColors.open}`}>
              {ticket.status?.replace('-', ' ')}
            </span>
          </div>
          <Button variant="ghost" size="sm" iconName="X" onClick={onClose} />
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-border">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium transition-smooth ${
                    activeTab === tab.id
                      ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name={tab.icon} size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6" ref={messagesContainerRef}>
              {activeTab === 'conversation' && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="font-medium text-foreground mb-2">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground">Category: {ticket.category}</p>
                  </div>

                  {/* Loading State */}
                  {loading && replies.length === 0 && (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner text="Loading conversation..." />
                    </div>
                  )}

                  {/* Conversation Thread */}
                  {!loading && (
                    <div className="space-y-4">
                      {conversationMessages.length === 0 ? (
                        <div className="text-center py-12">
                          <Icon name="MessageCircle" size={48} className="text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">No messages yet</h3>
                          <p className="text-muted-foreground">Start the conversation by sending a reply.</p>
                        </div>
                      ) : (
                        conversationMessages.map((message, idx) => (
                          <div
                            key={message.id}
                            className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div className={`max-w-2xl ${message.sender === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground'} rounded-lg p-4 relative`}>
                              {/* Thread indicator */}
                              {message.id === 'initial' && (
                                <div className="absolute -left-2 top-4 w-2 h-2 bg-blue-500 rounded-full border-2 border-background" title="Original ticket message" />
                              )}
                              {message.sender === 'user' && message.id !== 'initial' && (
                                <div className="absolute -left-2 top-4 w-2 h-2 bg-green-500 rounded-full border-2 border-background" title="User reply" />
                              )}
                              {message.sender === 'support' && (
                                <div className="absolute -right-2 top-4 w-2 h-2 bg-primary rounded-full border-2 border-background" title="Agent response" />
                              )}
                              
                              <div className="flex items-center space-x-2 mb-2">
                                {message.sender === 'user' && message.avatar ? (
                                  <Image
                                    src={message.avatar}
                                    alt={message.senderName}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : message.sender === 'support' ? (
                                  <div className="w-6 h-6 bg-primary-foreground rounded-full flex items-center justify-center">
                                    <Icon name="Headphones" size={14} className="text-primary" />
                                  </div>
                                ) : null}
                                <span className="text-sm font-medium">
                                  {message.senderName}
                                </span>
                                <span className="text-xs opacity-70" title={formatTimestamp(message.timestamp).fullDate}>
                                  {formatTimestamp(message.timestamp).relativeTime}
                                </span>
                                {message.id === 'initial' && (
                                  <span className="text-xs opacity-70 italic bg-blue-100 px-2 py-0.5 rounded">Original</span>
                                )}
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {message.attachments.map((att, idx) => (
                                    <a
                                      key={idx}
                                      href={att.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs underline opacity-80 hover:opacity-100 flex items-center gap-1"
                                    >
                                      <Icon name="Paperclip" size={12} />
                                      {att.name || 'Attachment'}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={conversationEndRef} />
                    </div>
                  )}

                  {/* Response Templates */}
                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium text-foreground mb-3">Quick Templates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {templateResponses.map((template) => (
                        <Button
                          key={template.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleTemplateSelect(template)}
                          className="justify-start"
                        >
                          {template.title}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-border pt-4">
                    {/* Attachments Preview */}
                    {attachments.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        {attachments.map((att, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg border border-border">
                            <Icon name="Paperclip" size={14} className="text-muted-foreground" />
                            <span className="text-sm text-foreground truncate max-w-[150px]">{att.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(att.size / 1024).toFixed(1)}KB
                            </span>
                            <button
                              onClick={() => removeAttachment(idx)}
                              className="text-muted-foreground hover:text-foreground"
                              disabled={sendingMessage}
                            >
                              <Icon name="X" size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleSendMessage}
                      placeholder="Type your response... (Press Enter to send, Shift+Enter for new line)"
                      disabled={sendingMessage || uploadingFiles}
                      maxLength={5000}
                      className="w-full h-32 p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleFileSelect}
                          accept="image/*,.pdf,.doc,.docx,.txt"
                          disabled={sendingMessage || uploadingFiles}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          iconName="Paperclip"
                          disabled={sendingMessage || uploadingFiles}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {uploadingFiles ? 'Uploading...' : 'Attach File'}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {newMessage.length}/5000
                        </span>
                      </div>
                      <Button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!sendingMessage && !uploadingFiles && (newMessage.trim() || attachments.length > 0)) {
                            sendMessage();
                          }
                        }}
                        iconName="Send" 
                        iconPosition="right"
                        disabled={sendingMessage || uploadingFiles || (!newMessage.trim() && attachments.length === 0)}
                      >
                        {sendingMessage ? 'Sending...' : 'Send Response'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-foreground mb-4">Internal Notes</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add internal notes that are only visible to support agents. These notes are not shown to the user.
                    </p>

                    {/* Internal Notes List */}
                    <div className="space-y-3 mb-6">
                      {internalNotes.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-border rounded-lg">
                          <Icon name="FileText" size={32} className="text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No internal notes yet</p>
                        </div>
                      ) : (
                        internalNotes.map((note) => (
                          <div key={note.id} className="bg-muted rounded-lg p-4 border border-border">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-foreground">
                                  {note.admin_profiles 
                                    ? `${note.admin_profiles.first_name || ''} ${note.admin_profiles.last_name || ''}`.trim() || 'Support Agent'
                                    : 'Support Agent'}
                                </span>
                                <span className="text-xs text-muted-foreground" title={formatTimestamp(note.created_at).fullDate}>
                                  {formatTimestamp(note.created_at).relativeTime}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{note.note}</p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add Note Input */}
                    <div className="border-t border-border pt-4">
                      <textarea
                        value={internalNote}
                        onChange={(e) => setInternalNote(e.target.value)}
                        placeholder="Add an internal note..."
                        maxLength={2000}
                        className="w-full h-24 p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          {internalNote.length}/2000
                        </span>
                        <Button 
                          onClick={handleAddInternalNote}
                          iconName="Plus"
                          iconPosition="left"
                          disabled={!internalNote.trim()}
                        >
                          Add Note
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-foreground mb-4">Ticket Activity History</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Timeline of changes and activity for this ticket.
                    </p>

                    {/* Activity Timeline */}
                    <div className="space-y-4">
                      {/* Ticket Created */}
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-background"></div>
                          <div className="w-0.5 h-full bg-border mt-1"></div>
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="bg-muted rounded-lg p-4 border border-border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">Ticket Created</span>
                              <span className="text-xs text-muted-foreground" title={formatTimestamp(ticket.createdAt).fullDate}>
                                {formatTimestamp(ticket.createdAt).relativeTime}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Ticket #{ticket.id} was created by {ticket.user?.name}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Status: {ticket.status}
                              </span>
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                                Priority: {ticket.priority}
                              </span>
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                Category: {ticket.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Replies Activity */}
                      {replies.map((reply, idx) => (
                        <div key={reply.id} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full border-2 border-background ${
                              reply.admin_id ? 'bg-primary' : 'bg-green-500'
                            }`}></div>
                            {idx < replies.length - 1 && (
                              <div className="w-0.5 h-full bg-border mt-1"></div>
                            )}
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="bg-muted rounded-lg p-4 border border-border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-foreground">
                                  {reply.admin_id ? 'Agent Response' : 'User Reply'}
                                </span>
                                <span className="text-xs text-muted-foreground" title={formatTimestamp(reply.created_at).fullDate}>
                                  {formatTimestamp(reply.created_at).relativeTime}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {reply.admin_id 
                                  ? `${reply.admin_profiles?.first_name || ''} ${reply.admin_profiles?.last_name || ''}`.trim() || 'Support Agent'
                                  : `${reply.profiles?.first_name || ''} ${reply.profiles?.last_name || ''}`.trim() || 'User'}
                              </p>
                              <p className="text-sm text-foreground mt-2 line-clamp-2">
                                {reply.content}
                              </p>
                              {reply.attachments && reply.attachments.length > 0 && (
                                <div className="mt-2 flex gap-1">
                                  <Icon name="Paperclip" size={12} className="text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {reply.attachments.length} attachment(s)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Current Status */}
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full border-2 border-background"></div>
                        </div>
                        <div className="flex-1">
                          <div className="bg-muted rounded-lg p-4 border border-border">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">Current Status</span>
                              <span className="text-xs text-muted-foreground" title={formatTimestamp(ticket.lastUpdated).fullDate}>
                                Last updated {formatTimestamp(ticket.lastUpdated).relativeTime}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                ticket.status === 'resolved' || ticket.status === 'closed' 
                                  ? 'bg-green-100 text-green-800'
                                  : ticket.status === 'in-progress'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                Status: {ticket.status}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                Priority: {ticket.priority}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Image
                      src={ticket.user?.avatar || '/assets/images/no_image.png'}
                      alt={ticket.user?.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{ticket.user?.name}</h3>
                      <p className="text-muted-foreground">{ticket.user?.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'related' && (
                <div className="space-y-6">
                  {relatedBookings.length > 0 ? (
                    <div>
                      <h4 className="font-medium text-foreground mb-3">Related Bookings</h4>
                      <div className="space-y-2">
                        {relatedBookings.map((booking) => (
                          <div key={booking.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium text-foreground">{booking.listings?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {booking.booking_reference} • {formatTimestamp(booking.start_time).relativeTime}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-foreground">${booking.price}</p>
                              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                {booking.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Icon name="Link" size={48} className="text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No related bookings</h3>
                      <p className="text-muted-foreground">This ticket is not associated with any booking.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l border-border p-6 space-y-6">
            <div>
              <h3 className="font-medium text-foreground mb-4">Ticket Management</h3>
              
              <div className="space-y-4">
                <Select
                  label="Status"
                  options={statusOptions}
                  value={ticketStatus}
                  onChange={setTicketStatus}
                />

                <Select
                  label="Priority"
                  options={priorityOptions}
                  value={ticketPriority}
                  onChange={setTicketPriority}
                />

                <Button
                  onClick={handleUpdateTicket}
                  iconName="Save"
                  iconPosition="left"
                  fullWidth
                  disabled={updatingTicket}
                >
                  {updatingTicket ? 'Updating...' : 'Update Ticket'}
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="font-medium text-foreground mb-3">Ticket Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="text-foreground" title={formatTimestamp(ticket.createdAt).fullDate}>
                    {formatTimestamp(ticket.createdAt).relativeTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="text-foreground" title={formatTimestamp(ticket.lastUpdated).fullDate}>
                    {formatTimestamp(ticket.lastUpdated).relativeTime}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportTicketDetailModal;

