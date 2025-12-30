import React, { useState, useEffect, useRef } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import { supabase } from '../../../lib/supabase';
import { storage } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';
import { logError, logWarn, logDebug } from '../../../utils/logger';

const TicketDetailModal = ({ ticket, isOpen, onClose, onUpdate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('conversation');
  const [newMessage, setNewMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [ticketStatus, setTicketStatus] = useState(ticket?.status || 'open');
  const [ticketPriority, setTicketPriority] = useState(ticket?.priority || 'medium');
  const [assignee, setAssignee] = useState(ticket?.assignee?.id || '');
  const [replies, setReplies] = useState([]);
  const [internalNotes, setInternalNotes] = useState([]);
  const [relatedBookings, setRelatedBookings] = useState([]);
  const [supportAgents, setSupportAgents] = useState([]);
  const [previousTickets, setPreviousTickets] = useState([]);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && ticket?.dbId) {
      fetchReplies();
      fetchInternalNotes();
      fetchSupportAgents();
      fetchPreviousTickets();
      fetchUserDetails();
      if (ticket.bookingId) {
        fetchRelatedBookings();
      }
    }
  }, [isOpen, ticket?.dbId, ticket?.bookingId, ticket?.user?.id]);

  // Real-time subscriptions for replies and notes
  useEffect(() => {
    if (!isOpen || !ticket?.dbId) return

    const repliesChannel = supabase
      .channel(`ticket_replies_${ticket.dbId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'support_ticket_replies',
          filter: `ticket_id=eq.${ticket.dbId}`
        }, 
        (payload) => {
          console.log('🔄 Reply change received:', payload.eventType)
          fetchReplies()
        }
      )
      .subscribe()

    const notesChannel = supabase
      .channel(`ticket_notes_${ticket.dbId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'support_ticket_notes',
          filter: `ticket_id=eq.${ticket.dbId}`
        }, 
        (payload) => {
          console.log('🔄 Note change received:', payload.eventType)
          fetchInternalNotes()
        }
      )
      .subscribe()

    return () => {
      repliesChannel.unsubscribe()
      notesChannel.unsubscribe()
    }
  }, [isOpen, ticket?.dbId])

  useEffect(() => {
    if (ticket) {
      setTicketStatus(ticket.status || 'open');
      setTicketPriority(ticket.priority || 'medium');
      setAssignee(ticket.assignee?.id || '');
    }
  }, [ticket]);

  const fetchReplies = async () => {
    if (!ticket?.dbId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('support_ticket_replies')
      .select(`
        id,
        content,
        created_at,
        user_id,
        admin_id,
        profiles:user_id (first_name, last_name, email, avatar_url),
        admin_profiles:admin_id (first_name, last_name, email, avatar_url)
      `)
      .eq('ticket_id', ticket.dbId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setReplies(data);
    }
    setLoading(false);
  };

  const fetchInternalNotes = async () => {
    if (!ticket?.dbId) return;
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

    if (!error && data) {
      setInternalNotes(data);
    }
  };

  const fetchSupportAgents = async () => {
    const { data, error } = await supabase
      .from('admin_users')
      .select(`
        user_id,
        email,
        profiles:user_id (first_name, last_name, avatar_url)
      `)
      .eq('role', 'support')
      .eq('is_active', true);

    if (!error && data) {
      setSupportAgents(data.map(agent => ({
        value: agent.user_id,
        label: `${agent.profiles?.first_name || ''} ${agent.profiles?.last_name || ''}`.trim() || agent.email.split('@')[0]
      })));
    }
  };

  const fetchRelatedBookings = async () => {
    if (!ticket?.bookingId) return;
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

    if (!error && data) {
      setRelatedBookings(data.map(b => ({
        id: b.id,
        spaceName: b.listings?.name || 'N/A',
        date: new Date(b.start_time).toLocaleDateString(),
        status: b.status,
        amount: `A$${b.total_paid?.toFixed(2) || '0.00'}`
      })));
    }
  };

  const fetchPreviousTickets = async () => {
    if (!ticket?.user?.id || !ticket?.dbId) return;
    
    const { data, error } = await supabase
      .from('support_tickets')
      .select('id, ticket_id, subject, status, created_at')
      .eq('user_id', ticket.user.id)
      .neq('id', ticket.dbId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!error && data) {
      setPreviousTickets(data);
    }
  };

  const fetchUserDetails = async () => {
    if (!ticket?.user?.id) return;
    
    try {
      // Fetch user profile with role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, phone, location, created_at, updated_at')
        .eq('id', ticket.user.id)
        .single();

      if (profileError) {
        logError('Error fetching user profile:', profileError);
        return;
      }

      const userRole = profile?.role || 'seeker';

      // Fetch user bookings stats based on role (matching useUsers.js logic)
      let bookingsCount = 0;
      let totalSpent = 0;

      if (userRole === 'seeker') {
        // For seekers: fetch bookings where they are the seeker
        const { data: seekerBookings, error: seekerBookingsError } = await supabase
        .from('bookings')
          .select('id, total_paid, price, payment_status')
        .eq('seeker_id', ticket.user.id);

        if (seekerBookingsError) {
          logWarn('Error fetching seeker bookings:', seekerBookingsError);
        } else if (seekerBookings) {
          bookingsCount = seekerBookings.length;

          // Calculate total spent: only count paid bookings (matching useUsers.js)
          totalSpent = seekerBookings.reduce((sum, booking) => {
            // Only count paid bookings
            if (booking.payment_status !== 'paid') return sum;
            
            // Use total_paid if available, otherwise use price (matching useUsers.js)
            const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0;
            return sum + amount;
          }, 0);
        }
      } else if (userRole === 'partner') {
        // For partners: fetch bookings where they are the partner
        const { data: partnerBookings, error: partnerBookingsError } = await supabase
        .from('bookings')
          .select(`
            id,
            listings!inner(partner_id)
          `)
          .eq('listings.partner_id', ticket.user.id);

        if (partnerBookingsError) {
          logWarn('Error fetching partner bookings:', partnerBookingsError);
        } else if (partnerBookings) {
          bookingsCount = partnerBookings.length;
          // For partners, totalSpent would be their earnings, but for support context we show 0
          totalSpent = 0;
        }
      }

      // Fetch ticket count
      const { count: ticketCount, error: ticketCountError } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', ticket.user.id);

      if (ticketCountError) {
        logWarn('Error fetching ticket count:', ticketCountError);
      }

      // Determine account status from profile
      const accountStatus = profile?.role === 'admin' || profile?.role === 'super_admin' 
        ? 'Admin' 
        : profile?.role === 'support' 
        ? 'Support Agent'
        : 'Active';

      setUserDetails({
        profile,
        bookingsCount: bookingsCount || 0,
        totalSpent: totalSpent || 0,
        ticketCount: ticketCount || 0,
        memberSince: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A',
        accountStatus
      });
    } catch (error) {
      logError('Error fetching user details:', error);
    }
  };

  if (!isOpen || !ticket) return null;

  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const assigneeOptions = [
    { value: '', label: 'Unassigned' },
    ...supportAgents
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

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      showToast('Please enter a message', 'error');
      return;
    }
    
    if (!ticket?.dbId) {
      logError('Ticket dbId missing:', ticket);
      showToast('Ticket information missing. Cannot send reply.', 'error');
      return;
    }
    
    if (!user?.id) {
      logError('User ID missing:', user);
      showToast('You must be logged in to send a reply.', 'error');
      return;
    }
    
    // user_id is required - should be the ticket owner's user_id
    // admin_id is the admin/support agent replying
    const ticketUserId = ticket?.user?.id || ticket?.user_id;
    
    if (!ticketUserId) {
      logError('Ticket user ID missing:', { ticket, user: ticket?.user });
      showToast('Ticket user information missing. Cannot send reply.', 'error');
      return;
    }
    
    logDebug('Sending reply:', {
      ticket_id: ticket.dbId,
      user_id: ticketUserId,
      admin_id: user.id,
      message_length: newMessage.length
    });
    
    try {
      const { data, error } = await supabase
      .from('support_ticket_replies')
      .insert([{
        ticket_id: ticket.dbId,
          user_id: ticketUserId, // Ticket owner's user_id (required)
        admin_id: user.id, // Admin/support agent replying
          content: newMessage.trim()
        }])
        .select();

      if (error) {
        logError('Error sending message:', error);
        showToast(error.message || 'Failed to send message. Please try again.', 'error');
        return;
      }

      logDebug('Reply sent successfully:', data);
      setNewMessage('');
      fetchReplies();
      
      // Update ticket's updated_at timestamp
      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticket.dbId);
      
      if (onUpdate) {
        onUpdate({ ...ticket, updated_at: new Date().toISOString() });
      }
      showToast('Message sent successfully', 'success');
    } catch (err) {
      logError('Exception sending message:', err);
      showToast('An unexpected error occurred. Please try again.', 'error');
    }
  };

  const handleAddInternalNote = async () => {
    if (!internalNote.trim() || !ticket?.dbId || !user?.id) return;
    
    const { error } = await supabase
      .from('support_ticket_notes')
      .insert([{
        ticket_id: ticket.dbId,
        author_admin_id: user.id,
        note: internalNote
      }]);

    if (!error) {
      setInternalNote('');
      fetchInternalNotes();
      showToast('Internal note added successfully', 'success');
    } else {
      showToast('Failed to add internal note. Please try again.', 'error');
    }
  };

  const handleUpdateTicket = async () => {
    if (!ticket?.dbId) return;
    
    const { error } = await supabase
      .from('support_tickets')
      .update({
        status: ticketStatus,
        priority: ticketPriority,
        assigned_to: assignee || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticket.dbId);

    if (!error && onUpdate) {
      onUpdate({
        ...ticket,
        status: ticketStatus,
        priority: ticketPriority,
        assignee: assigneeOptions.find(opt => opt.value === assignee) || null
      });
      showToast('Ticket updated successfully', 'success');
    } else if (error) {
      showToast('Failed to update ticket. Please try again.', 'error');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !ticket?.dbId || !user?.id) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${ticket.dbId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await storage.support.upload(fileName, file);
      
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = storage.support.getPublicUrl(fileName);

      // Append file link to message or save separately
      const fileLink = `[Attachment: ${file.name}](${publicUrl})`;
      setNewMessage(prev => prev ? `${prev}\n\n${fileLink}` : fileLink);
      
      showToast('File uploaded successfully', 'success');
      
      // Optionally save attachment reference to database
      // You could add an attachments field to support_ticket_replies table
    } catch (error) {
      console.error('Error uploading file:', error);
      showToast('Failed to upload file. Please try again.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatTimestamp = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const tabs = [
    { id: 'conversation', label: 'Conversation', icon: 'MessageCircle' },
    { id: 'details', label: 'User Details', icon: 'User' },
    { id: 'notes', label: 'Internal Notes', icon: 'FileText' },
    { id: 'related', label: 'Related Items', icon: 'Link' }
  ];

  // Build conversation array with initial ticket description and replies
  const conversation = [
    {
      id: 'initial',
      sender: 'user',
      message: ticket.description || 'No description provided',
      timestamp: ticket.createdAt,
      isInitial: true
    },
    ...replies.map(reply => ({
      id: reply.id,
      sender: reply.admin_id ? 'support' : 'user',
      message: reply.content,
      timestamp: reply.created_at,
      admin_id: reply.admin_id,
      admin_name: reply.admin_profiles ? `${reply.admin_profiles.first_name || ''} ${reply.admin_profiles.last_name || ''}`.trim() : 'Support Agent',
      user_name: reply.profiles ? `${reply.profiles.first_name || ''} ${reply.profiles.last_name || ''}`.trim() : ticket.user.name
    }))
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-modal flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-modal w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-foreground">
              Ticket #{ticket.id}
            </h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityColors[ticket.priority]}`}>
              {ticket.priority}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[ticket.status]}`}>
              {ticket.status.replace('-', ' ')}
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
                      ? 'text-primary border-b-2 border-primary' :'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon name={tab.icon} size={16} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'conversation' && (
                <div className="space-y-4">
                  <div className="mb-4">
                    <h3 className="font-medium text-foreground mb-2">{ticket.subject}</h3>
                    <p className="text-sm text-muted-foreground">Category: {ticket.category}</p>
                  </div>

                  {/* Conversation Thread */}
                  <div className="space-y-4">
                    {conversation.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No messages yet</p>
                    ) : (
                      conversation.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}
                        >
                          <div className={`max-w-2xl ${message.sender === 'user' ? 'bg-muted' : 'bg-primary text-primary-foreground'} rounded-lg p-4`}>
                            <div className="flex items-center space-x-2 mb-2">
                              {message.sender === 'user' ? (
                                <Image
                                  src={message.isInitial ? ticket.user.avatar : (message.user_name && ticket.user.avatar) || '/assets/images/no_image.png'}
                                  alt={message.isInitial ? ticket.user.name : message.user_name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-primary-foreground rounded-full flex items-center justify-center">
                                  <Icon name="Headphones" size={14} className="text-primary" />
                                </div>
                              )}
                              <span className="text-sm font-medium">
                                {message.sender === 'user' 
                                  ? (message.isInitial ? ticket.user.name : message.user_name)
                                  : message.admin_name}
                              </span>
                              <span className="text-xs opacity-70">
                                {formatTimestamp(message.timestamp)}
                              </span>
                            </div>
                            <p className="text-sm">{message.message}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="border-t border-border pt-4">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your response..."
                      className="w-full h-32 p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-2">
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="file-upload"
                          accept="image/*,.pdf,.doc,.docx"
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          iconName="Paperclip"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploading}
                        >
                          {uploading ? 'Uploading...' : 'Attach File'}
                        </Button>
                      </div>
                      <Button onClick={handleSendMessage} iconName="Send" iconPosition="right">
                        Send Response
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <Image
                      src={ticket.user.avatar}
                      alt={ticket.user.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{ticket.user.name}</h3>
                      <p className="text-muted-foreground">{ticket.user.email}</p>
                      {userDetails && (
                        <p className="text-sm text-muted-foreground">Member since: {userDetails.memberSince}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-foreground mb-3">Contact Information</h4>
                      <div className="space-y-2">
                        <p className="text-sm"><span className="font-medium">Email:</span> {ticket.user.email}</p>
                        {userDetails?.profile?.phone && (
                          <p className="text-sm"><span className="font-medium">Phone:</span> {userDetails.profile.phone}</p>
                        )}
                        {userDetails?.profile?.location && (
                          <p className="text-sm"><span className="font-medium">Location:</span> {userDetails.profile.location}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-foreground mb-3">Account Statistics</h4>
                      <div className="space-y-2">
                        <p className="text-sm"><span className="font-medium">Total Bookings:</span> {userDetails?.bookingsCount || 0}</p>
                        <p className="text-sm"><span className="font-medium">Total Spent:</span> A${(userDetails?.totalSpent || 0).toFixed(2)}</p>
                        <p className="text-sm"><span className="font-medium">Support Tickets:</span> {userDetails?.ticketCount || 0}</p>
                        <p className="text-sm"><span className="font-medium">Account Status:</span> {userDetails?.accountStatus || 'Active'}</p>
                        {userDetails?.profile?.role && (
                          <p className="text-sm"><span className="font-medium">User Role:</span> <span className="capitalize">{userDetails.profile.role.replace('_', ' ')}</span></p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  {/* Existing Notes */}
                  <div className="space-y-3">
                    {internalNotes.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No internal notes yet</p>
                    ) : (
                      internalNotes.map((note) => (
                        <div key={note.id} className="bg-muted rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-foreground">
                              {note.admin_profiles ? `${note.admin_profiles.first_name || ''} ${note.admin_profiles.last_name || ''}`.trim() : 'Support Agent'}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {formatTimestamp(note.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-foreground">{note.note}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add New Note */}
                  <div className="border-t border-border pt-4">
                    <textarea
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      placeholder="Add internal note (only visible to support team)..."
                      className="w-full h-24 p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex justify-end mt-3">
                      <Button onClick={handleAddInternalNote} iconName="Plus" iconPosition="left">
                        Add Note
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'related' && (
                <div className="space-y-6">
                  {ticket.bookingId && (
                    <div>
                      <h4 className="font-medium text-foreground mb-3">Related Bookings</h4>
                      <div className="space-y-2">
                        {relatedBookings.length === 0 ? (
                          <p className="text-muted-foreground">Loading related bookings...</p>
                        ) : (
                          relatedBookings.map((booking) => (
                            <div key={booking.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div>
                                <p className="font-medium text-foreground">{booking.spaceName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {booking.booking_reference} • {booking.date}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-foreground">{booking.amount}</p>
                                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                  {booking.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {!ticket.bookingId && (
                    <div>
                      <h4 className="font-medium text-foreground mb-3">Related Bookings</h4>
                      <p className="text-muted-foreground">No booking associated with this ticket</p>
                    </div>
                  )}

                  <div>
                    <h4 className="font-medium text-foreground mb-3">Previous Tickets</h4>
                    <div className="space-y-2">
                      {previousTickets.length === 0 ? (
                        <p className="text-muted-foreground">No previous tickets</p>
                      ) : (
                        previousTickets.map((prevTicket) => (
                          <div key={prevTicket.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div>
                              <p className="font-medium text-foreground">{prevTicket.subject}</p>
                              <p className="text-sm text-muted-foreground">#{prevTicket.ticket_id || prevTicket.id} • {prevTicket.status}</p>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatTimestamp(prevTicket.created_at)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
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

                <Select
                  label="Assignee"
                  options={assigneeOptions}
                  value={assignee}
                  onChange={setAssignee}
                />

                <Button
                  onClick={handleUpdateTicket}
                  iconName="Save"
                  iconPosition="left"
                  fullWidth
                >
                  Update Ticket
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h4 className="font-medium text-foreground mb-3">Ticket Info</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="text-foreground">{formatTimestamp(ticket.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="text-foreground">{formatTimestamp(ticket.lastUpdated)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;
