import React, { useState, useEffect, useRef } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
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
  const [showAllActivities, setShowAllActivities] = useState(false);
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
        attachments,
        profiles:user_id (first_name, last_name, email, avatar_url),
        admin_profiles:admin_id (first_name, last_name, email, avatar_url)
      `)
      .eq('ticket_id', ticket.dbId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      // Check storage for files if attachments are missing
      // First, get all files in the ticket folder
      let storageFiles = [];
      try {
        const { data: files, error: listError } = await storage.support.list(
          `${ticket.dbId}/`,
          {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' }
          }
        );
        
        if (!listError && files && files.length > 0) {
          storageFiles = files.map(file => {
            const { data: urlData } = storage.support.getPublicUrl(`${ticket.dbId}/${file.name}`);
            return {
              name: file.name,
              url: urlData.publicUrl,
              size: file.metadata?.size || 0,
              type: file.metadata?.mimetype || (file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image/jpeg' : 'application/octet-stream'),
              created_at: file.created_at || file.updated_at
            };
          });
        }
      } catch (storageError) {
        console.warn('Error checking storage for attachments:', storageError);
      }
      
      // Match files to replies based on timing
      const repliesWithAttachments = data.map((reply) => {
        // If attachments exist, use them
        if (reply.attachments && Array.isArray(reply.attachments) && reply.attachments.length > 0) {
          return reply;
        }
        
        // If no attachments, try to find files from storage that might belong to this message
        if (storageFiles.length > 0 && !reply.admin_id) {
          const messageTime = new Date(reply.created_at).getTime();
          // Find files created within 2 minutes of the message
          const matchingFiles = storageFiles
            .filter(file => {
              if (!file.created_at) return false;
              const fileTime = new Date(file.created_at).getTime();
              const timeDiff = Math.abs(fileTime - messageTime);
              return timeDiff < 2 * 60 * 1000; // 2 minutes
            })
            .map(({ created_at, ...file }) => ({
              name: file.name.split('/').pop(), // Just the filename
              url: file.url,
              size: file.size,
              type: file.type
            }));
          
          if (matchingFiles.length > 0) {
            return {
              ...reply,
              attachments: matchingFiles
            };
          }
        }
        
        return reply;
      });
      
      setReplies(repliesWithAttachments);
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

      // Fetch user bookings stats - check BOTH roles since users can switch
      let seekerBookingsCount = 0;
      let partnerBookingsCount = 0;
      let totalBookingsCount = 0;
      let totalSpent = 0;
      let recentActivities = [];

      // Fetch activities for BOTH seeker and partner roles
      // This ensures we see all activities regardless of current role

      // ========== SEEKER ACTIVITIES ==========
      // Fetch bookings where user is the seeker
      const { data: seekerBookings, error: seekerBookingsError } = await supabase
        .from('bookings')
        .select('id, total_paid, price, payment_status, start_time, status, created_at, listings:listing_id (name)')
        .eq('seeker_id', ticket.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (seekerBookingsError) {
        logWarn('Error fetching seeker bookings:', seekerBookingsError);
      } else if (seekerBookings) {
        seekerBookingsCount = seekerBookings.length;

        // Add bookings as activities with role indicator
        recentActivities.push(...seekerBookings.map(b => ({
          type: 'booking',
          id: b.id,
          title: `Booking (as Seeker): ${b.listings?.name || 'Unknown Space'}`,
          description: `Status: ${b.status || 'Unknown'}`,
          amount: parseFloat(b.total_paid || b.price || 0),
          timestamp: b.created_at,
          role: 'seeker',
          metadata: { booking: b }
        })));

        // Calculate total spent: only count paid bookings
        totalSpent = seekerBookings.reduce((sum, booking) => {
          if (booking.payment_status !== 'paid') return sum;
          const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0;
          return sum + amount;
        }, 0);
      }

      // Fetch recent payments/transactions through bookings (as seeker)
      const { data: userBookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('seeker_id', ticket.user.id)
        .limit(50);

      if (!bookingsError && userBookings && userBookings.length > 0) {
        const bookingIds = userBookings.map(b => b.id);
        
        const { data: payments, error: paymentsError } = await supabase
          .from('payment_logs')
          .select('id, amount, status, transaction_id, created_at, bookings:booking_id (id, listings:listing_id (name))')
          .in('booking_id', bookingIds)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!paymentsError && payments) {
          recentActivities.push(...payments.map(p => ({
            type: 'payment',
            id: p.id,
            title: `Payment (as Seeker): ${p.bookings?.listings?.name || 'Transaction'}`,
            description: `Status: ${p.status || 'Unknown'}`,
            amount: Math.abs(parseFloat(p.amount || 0)),
            timestamp: p.created_at,
            role: 'seeker',
            metadata: { payment: p }
          })));
        }
      }

      // Fetch recent reviews (as seeker)
      const { data: reviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, listings:listing_id (name)')
        .eq('seeker_id', ticket.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!reviewsError && reviews) {
        recentActivities.push(...reviews.map(r => ({
          type: 'review',
          id: r.id,
          title: `Review (as Seeker): ${r.listings?.name || 'Unknown Space'}`,
          description: `${r.rating} stars${r.comment ? ': ' + r.comment.substring(0, 50) + '...' : ''}`,
          timestamp: r.created_at,
          role: 'seeker',
          metadata: { review: r }
        })));
      }

      // ========== PARTNER ACTIVITIES ==========
      // Fetch bookings where user is the partner
      const { data: partnerBookings, error: partnerBookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          total_paid,
          base_amount,
          price,
          start_time,
          status,
          created_at,
          listings!inner(partner_id, name)
        `)
        .eq('listings.partner_id', ticket.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (partnerBookingsError) {
        logWarn('Error fetching partner bookings:', partnerBookingsError);
      } else if (partnerBookings) {
        partnerBookingsCount = partnerBookings.length;
        recentActivities.push(...partnerBookings.map(b => {
          // For partner bookings, show the booking amount (what the seeker paid)
          // Priority: total_paid > base_amount > price
          const bookingAmount = parseFloat(b.total_paid || b.base_amount || b.price || 0);
          return {
            type: 'booking',
            id: b.id,
            title: `Booking (as Partner): ${b.listings?.name || 'Unknown Space'}`,
            description: `Status: ${b.status || 'Unknown'}`,
            amount: bookingAmount,
            timestamp: b.created_at,
            role: 'partner',
            metadata: { booking: b }
          };
        }));
      }

      // Fetch recent listings activity (as partner)
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('id, name, status, created_at, updated_at')
        .eq('partner_id', ticket.user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (!listingsError && listings) {
        listings.forEach(l => {
          // Add listing creation
          recentActivities.push({
            type: 'listing_created',
            id: l.id,
            title: `Listed a space (as Partner): ${l.name}`,
            description: `Status: ${l.status || 'Unknown'}`,
            timestamp: l.created_at,
            role: 'partner',
            metadata: { listing: l }
          });
          
          // Add listing update if it was updated after creation
          if (l.updated_at && new Date(l.updated_at) > new Date(l.created_at)) {
            recentActivities.push({
              type: 'listing_updated',
              id: `${l.id}-update`,
              title: `Updated listing (as Partner): ${l.name}`,
              description: `Status: ${l.status || 'Unknown'}`,
              timestamp: l.updated_at,
              role: 'partner',
              metadata: { listing: l }
            });
          }
        });
      }

      // Fetch payout requests (as partner)
      const { data: payoutRequests, error: payoutError } = await supabase
        .from('payout_requests')
        .select('id, amount, status, requested_at, updated_at')
        .eq('partner_id', ticket.user.id)
        .order('updated_at', { ascending: false })
        .limit(50);

      if (!payoutError && payoutRequests) {
        recentActivities.push(...payoutRequests.map(p => ({
          type: 'payout_request',
          id: p.id,
          title: `Requested payout (as Partner)`,
          description: `Amount: A$${parseFloat(p.amount || 0).toFixed(2)} • Status: ${p.status || 'Unknown'}`,
          amount: parseFloat(p.amount || 0),
          timestamp: p.requested_at || p.updated_at,
          role: 'partner',
          metadata: { payout: p }
        })));
      }

      // Fetch earnings (as partner)
      try {
        const { data: earnings, error: earningsError } = await supabase
          .from('earnings')
          .select('id, amount, status, created_at, booking_id, bookings:booking_id (id, listings:listing_id (name))')
          .eq('partner_id', ticket.user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!earningsError && earnings && earnings.length > 0) {
          recentActivities.push(...earnings.map(e => ({
            type: 'earning',
            id: e.id,
            title: `Earning (as Partner): ${e.bookings?.listings?.name || 'Booking'}`,
            description: `Status: ${e.status || 'Unknown'}`,
            amount: parseFloat(e.amount || 0),
            timestamp: e.created_at,
            role: 'partner',
            metadata: { earning: e }
          })));
        }
      } catch (earningsErr) {
        logWarn('Could not fetch earnings:', earningsErr);
      }

      // Calculate total bookings count (both roles)
      totalBookingsCount = seekerBookingsCount + partnerBookingsCount;

      // Fetch favorites (for all users)
      const { data: favorites, error: favoritesError } = await supabase
        .from('favorites')
        .select('id, created_at, listings:listing_id (name)')
        .eq('user_id', ticket.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!favoritesError && favorites) {
        recentActivities.push(...favorites.map(f => ({
          type: 'favorite',
          id: f.id,
          title: `Favorited: ${f.listings?.name || 'Space'}`,
          description: 'Added to favorites',
          timestamp: f.created_at,
          metadata: { favorite: f }
        })));
      }

      // Fetch user status history (if available)
      try {
        const { data: statusHistory, error: statusHistoryError } = await supabase
          .from('user_status_history')
          .select('id, old_status, new_status, reason, created_at')
          .eq('user_id', ticket.user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!statusHistoryError && statusHistory && statusHistory.length > 0) {
          recentActivities.push(...statusHistory.map(sh => ({
            type: 'status_change',
            id: sh.id,
            title: `Account status changed`,
            description: `From ${sh.old_status || 'Unknown'} to ${sh.new_status || 'Unknown'}${sh.reason ? `: ${sh.reason}` : ''}`,
            timestamp: sh.created_at,
            metadata: { statusChange: sh }
          })));
        }
      } catch (statusErr) {
        logWarn('Could not fetch status history:', statusErr);
      }

      // Fetch recent support tickets as activities
      const { data: recentTickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id, ticket_id, subject, status, created_at')
        .eq('user_id', ticket.user.id)
        .neq('id', ticket.dbId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!ticketsError && recentTickets) {
        recentActivities.push(...recentTickets.map(t => ({
          type: 'ticket',
          id: t.id,
          title: `Support Ticket: ${t.subject || 'No subject'}`,
          description: `Status: ${t.status || 'Unknown'}`,
          timestamp: t.created_at,
          metadata: { ticket: t }
        })));
      }

      // Sort all activities by timestamp (most recent first)
      recentActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

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
        bookingsCount: totalBookingsCount || 0,
        seekerBookingsCount: seekerBookingsCount || 0,
        partnerBookingsCount: partnerBookingsCount || 0,
        totalSpent: totalSpent || 0,
        ticketCount: ticketCount || 0,
        memberSince: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A',
        accountStatus,
        recentActivities,
        currentRole: userRole
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
    const now = new Date();
    const messageDate = new Date(date);
    const diffInSeconds = Math.floor((now - messageDate) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    let relativeTime = '';
    if (diffInSeconds < 60) {
      relativeTime = 'Just now';
    } else if (diffInMinutes < 60) {
      relativeTime = `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      relativeTime = `${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      relativeTime = `${diffInDays}d ago`;
    } else {
      relativeTime = messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return {
      formatted: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(messageDate),
      relativeTime
    };
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
      isInitial: true,
      attachments: ticket.attachments || []
    },
    ...replies.map(reply => ({
      id: reply.id,
      sender: reply.admin_id ? 'support' : 'user',
      message: reply.content,
      timestamp: reply.created_at,
      attachments: reply.attachments || [],
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
                                {formatTimestamp(message.timestamp).formatted}
                              </span>
                            </div>
                            <p className="text-sm">{message.message}</p>
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {message.attachments.map((att, idx) => {
                                  const isImage = att.type?.startsWith('image/') || 
                                                 att.url?.match(/\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i);
                                  
                                  if (isImage) {
                                    return (
                                      <div key={idx} className="relative group">
                                        <a
                                          href={att.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="block"
                                        >
                                          <img
                                            src={att.url}
                                            alt={att.name || 'Attachment'}
                                            className="max-w-full max-h-64 rounded-lg border border-border object-contain cursor-pointer hover:opacity-90 transition-opacity"
                                            onError={(e) => {
                                              // Fallback to link if image fails to load
                                              e.target.style.display = 'none';
                                              const fallback = e.target.nextElementSibling;
                                              if (fallback) fallback.style.display = 'flex';
                                            }}
                                          />
                                          <a
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hidden text-xs underline opacity-80 hover:opacity-100 flex items-center gap-1 mt-1"
                                          >
                                            <Icon name="Paperclip" size={12} />
                                            {att.name || 'Attachment'}
                                          </a>
                                        </a>
                                        <div className="text-xs opacity-70 mt-1">
                                          {att.name || 'Image'}
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <a
                                        key={idx}
                                        href={att.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs underline opacity-80 hover:opacity-100 flex items-center gap-1"
                                      >
                                        <Icon name="Paperclip" size={12} />
                                        {att.name || 'Attachment'}
                                        {att.size && (
                                          <span className="opacity-70">
                                            ({(att.size / 1024).toFixed(1)}KB)
                                          </span>
                                        )}
                                      </a>
                                    );
                                  }
                                })}
                              </div>
                            )}
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
                  {/* User Profile Header Card */}
                  <div className="bg-card border border-border rounded-lg p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <Image
                        src={ticket.user?.avatar || '/assets/images/no_image.png'}
                        alt={ticket.user?.name}
                        className="w-20 h-20 rounded-full object-cover border-2 border-border"
                      />
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-foreground mb-1">{ticket.user?.name || 'Unknown User'}</h3>
                        <div className="flex items-center gap-2 text-muted-foreground mb-2">
                          <Icon name="Mail" size={14} />
                          <span className="text-sm">{ticket.user?.email}</span>
                        </div>
                        {userDetails && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Icon name="Calendar" size={14} />
                            <span>Member since {userDetails.memberSince}</span>
                          </div>
                        )}
                      </div>
                      {userDetails?.profile?.role && (
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          userDetails.profile.role === 'partner' 
                            ? 'bg-blue-100 text-blue-700'
                            : userDetails.profile.role === 'seeker'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {userDetails.profile.role === 'partner' ? 'Partner' : 
                           userDetails.profile.role === 'seeker' ? 'Seeker' : 
                           userDetails.profile.role.replace('_', ' ')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Information & Account Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact Information Card */}
                    <div className="bg-card border border-border rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Icon name="Phone" size={18} className="text-primary" />
                        <h4 className="font-semibold text-foreground">Contact Information</h4>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Icon name="Mail" size={16} className="text-muted-foreground mt-0.5" />
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Email Address</p>
                            <p className="text-sm font-medium text-foreground">{ticket.user?.email || 'Not provided'}</p>
                          </div>
                        </div>
                        {userDetails?.profile?.phone ? (
                          <div className="flex items-start gap-3">
                            <Icon name="Phone" size={16} className="text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Phone Number</p>
                              <p className="text-sm font-medium text-foreground">{userDetails.profile.phone}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3 opacity-50">
                            <Icon name="Phone" size={16} className="text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Phone Number</p>
                              <p className="text-sm text-muted-foreground">Not provided</p>
                            </div>
                          </div>
                        )}
                        {userDetails?.profile?.location ? (
                          <div className="flex items-start gap-3">
                            <Icon name="MapPin" size={16} className="text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Location</p>
                              <p className="text-sm font-medium text-foreground">{userDetails.profile.location}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3 opacity-50">
                            <Icon name="MapPin" size={16} className="text-muted-foreground mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground mb-0.5">Location</p>
                              <p className="text-sm text-muted-foreground">Not provided</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Account Statistics Card */}
                    <div className="bg-card border border-border rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Icon name="BarChart3" size={18} className="text-primary" />
                        <h4 className="font-semibold text-foreground">Account Statistics</h4>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <Icon name="Calendar" size={16} className="text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Total Bookings</span>
                          </div>
                          <span className="text-lg font-semibold text-foreground">{userDetails?.bookingsCount || 0}</span>
                        </div>
                        {(userDetails?.seekerBookingsCount > 0 || userDetails?.partnerBookingsCount > 0) && (
                          <div className="pl-4 space-y-2 text-xs">
                            {userDetails?.seekerBookingsCount > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                  As Seeker
                                </span>
                                <span className="font-medium">{userDetails.seekerBookingsCount}</span>
                              </div>
                            )}
                            {userDetails?.partnerBookingsCount > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                  As Partner
                                </span>
                                <span className="font-medium">{userDetails.partnerBookingsCount}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {userDetails?.totalSpent > 0 && (
                          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-2">
                              <Icon name="DollarSign" size={16} className="text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Total Spent (as Seeker)</span>
                            </div>
                            <span className="text-lg font-semibold text-green-600">
                              A${(userDetails?.totalSpent || 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <Icon name="MessageSquare" size={16} className="text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Support Tickets</span>
                          </div>
                          <span className="text-lg font-semibold text-foreground">{userDetails?.ticketCount || 0}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2">
                            <Icon name="CheckCircle" size={16} className="text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Account Status</span>
                          </div>
                          <span className={`text-sm font-medium px-2 py-1 rounded ${
                            userDetails?.accountStatus === 'Active' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {userDetails?.accountStatus || 'Active'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activities */}
                  {userDetails?.recentActivities && userDetails.recentActivities.length > 0 && (
                    <div className="bg-card border border-border rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Icon name="Activity" size={18} className="text-primary" />
                          <h4 className="font-semibold text-foreground">Recent Activities</h4>
                          <span className="text-xs text-muted-foreground">
                            ({showAllActivities ? userDetails.recentActivities.length : Math.min(10, userDetails.recentActivities.length)} of {userDetails.recentActivities.length})
                          </span>
                        </div>
                        {userDetails.recentActivities.length > 10 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllActivities(!showAllActivities)}
                            className="flex items-center gap-2"
                          >
                            <Icon name={showAllActivities ? "ChevronUp" : "ChevronDown"} size={14} />
                            {showAllActivities ? 'Show Less' : 'View More'}
                          </Button>
                        )}
                      </div>
                      <div className="space-y-2">
                        {(showAllActivities ? userDetails.recentActivities : userDetails.recentActivities.slice(0, 10)).map((activity) => {
                          const getActivityIcon = () => {
                            switch (activity.type) {
                              case 'booking': return 'Calendar';
                              case 'payment': return 'DollarSign';
                              case 'review': return 'Star';
                              case 'listing_created': return 'Plus';
                              case 'listing_updated': return 'Edit';
                              case 'payout_request': return 'CreditCard';
                              case 'earning': return 'TrendingUp';
                              case 'favorite': return 'Heart';
                              case 'status_change': return 'Shield';
                              case 'ticket': return 'MessageSquare';
                              default: return 'Circle';
                            }
                          };

                          const getActivityColor = () => {
                            switch (activity.type) {
                              case 'booking': return 'text-blue-600 bg-blue-100';
                              case 'payment': return 'text-green-600 bg-green-100';
                              case 'review': return 'text-yellow-600 bg-yellow-100';
                              case 'listing_created': return 'text-purple-600 bg-purple-100';
                              case 'listing_updated': return 'text-indigo-600 bg-indigo-100';
                              case 'payout_request': return 'text-cyan-600 bg-cyan-100';
                              case 'earning': return 'text-emerald-600 bg-emerald-100';
                              case 'favorite': return 'text-pink-600 bg-pink-100';
                              case 'status_change': return 'text-red-600 bg-red-100';
                              case 'ticket': return 'text-orange-600 bg-orange-100';
                              default: return 'text-gray-600 bg-gray-100';
                            }
                          };

                          return (
                            <div key={`${activity.type}-${activity.id}`} className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border hover:bg-muted/80 transition-colors">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`p-1.5 rounded ${getActivityColor()}`}>
                                    <Icon name={getActivityIcon()} size={14} />
                                  </div>
                                  <p className="font-medium text-foreground">{activity.title}</p>
                                  {activity.role && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      activity.role === 'seeker' 
                                        ? 'bg-green-100 text-green-700'
                                        : activity.role === 'partner'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {activity.role === 'seeker' ? 'Seeker' : activity.role === 'partner' ? 'Partner' : activity.role}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground ml-8">
                                  <span className="flex items-center gap-1">
                                    <Icon name="Clock" size={12} />
                                    {formatTimestamp(activity.timestamp).relativeTime}
                                  </span>
                                  {activity.description && (
                                    <span className="text-xs">{activity.description}</span>
                                  )}
                                </div>
                              </div>
                              {activity.amount && activity.amount > 0 && (
                                <div className="text-right ml-4">
                                  <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
                                  <p className="text-lg font-semibold text-foreground">
                                    A${activity.amount.toFixed(2)}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Previous Tickets */}
                  {previousTickets.length > 0 && (
                    <div className="bg-card border border-border rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Icon name="MessageSquare" size={18} className="text-primary" />
                        <h4 className="font-semibold text-foreground">Previous Support Tickets</h4>
                        <span className="text-xs text-muted-foreground">(Last 5 tickets)</span>
                      </div>
                      <div className="space-y-2">
                        {previousTickets.map((prevTicket) => (
                          <div key={prevTicket.id} className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border hover:bg-muted/80 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Icon name="Ticket" size={14} className="text-muted-foreground" />
                                <p className="font-medium text-foreground">{prevTicket.subject || 'No subject'}</p>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground ml-6">
                                <span className="font-mono text-xs">{prevTicket.ticket_id}</span>
                                <span className="flex items-center gap-1">
                                  <Icon name="Clock" size={12} />
                                  {formatTimestamp(prevTicket.created_at).relativeTime}
                                </span>
                              </div>
                            </div>
                            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                              prevTicket.status === 'resolved' || prevTicket.status === 'closed'
                                ? 'bg-green-100 text-green-700'
                                : prevTicket.status === 'in-progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {prevTicket.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {!userDetails && (
                    <div className="text-center py-12">
                      <LoadingSpinner text="Loading user details..." />
                    </div>
                  )}

                  {/* Empty State */}
                  {userDetails && 
                   (!userDetails.recentActivities || userDetails.recentActivities.length === 0) && 
                   previousTickets.length === 0 && (
                    <div className="bg-card border border-border rounded-lg p-8 text-center">
                      <Icon name="Info" size={48} className="text-muted-foreground mx-auto mb-4" />
                      <h4 className="font-medium text-foreground mb-2">No Additional Information</h4>
                      <p className="text-sm text-muted-foreground">
                        This user has no recent activities or previous support tickets.
                      </p>
                    </div>
                  )}
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
                              {formatTimestamp(note.created_at).formatted}
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
                  {/* Related Booking (if ticket is linked to a specific booking) */}
                  {ticket.bookingId && (
                    <div className="bg-card border border-border rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Icon name="Link" size={18} className="text-primary" />
                        <h4 className="font-semibold text-foreground">Ticket-Related Booking</h4>
                        <span className="text-xs text-muted-foreground bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          Directly linked
                        </span>
                      </div>
                      {relatedBookings.length > 0 ? (
                        <div className="space-y-3">
                          {relatedBookings.map((booking) => (
                            <div key={booking.id} className="p-4 bg-muted rounded-lg border border-border">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Icon name="Building" size={18} className="text-primary" />
                                  <div>
                                    <p className="font-semibold text-foreground">{booking.spaceName || 'Unknown Space'}</p>
                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                                      {booking.booking_reference || 'No reference'}
                                    </p>
                                  </div>
                                </div>
                                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                                  booking.status === 'confirmed' || booking.status === 'completed'
                                    ? 'bg-green-100 text-green-700'
                                    : booking.status === 'cancelled'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {booking.status || 'Unknown'}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="flex items-start gap-2">
                                  <Icon name="DollarSign" size={16} className="text-muted-foreground mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-0.5">Booking Amount</p>
                                    <p className="text-sm font-semibold text-foreground">
                                      {booking.amount || 'A$0.00'}
                                    </p>
                                  </div>
                                </div>
                                {booking.date && (
                                  <div className="flex items-start gap-2">
                                    <Icon name="Calendar" size={16} className="text-muted-foreground mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">Date</p>
                                      <p className="text-sm font-medium text-foreground">{booking.date}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <LoadingSpinner text="Loading booking details..." />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recent Activities from User Details */}
                  {userDetails?.recentActivities && userDetails.recentActivities.length > 0 && (
                    <div className="bg-card border border-border rounded-lg p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Icon name="Activity" size={18} className="text-primary" />
                          <h4 className="font-semibold text-foreground">User's Recent Activities</h4>
                          <span className="text-xs text-muted-foreground">
                            ({showAllActivities ? userDetails.recentActivities.length : Math.min(10, userDetails.recentActivities.length)} of {userDetails.recentActivities.length})
                          </span>
                        </div>
                        {userDetails.recentActivities.length > 10 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllActivities(!showAllActivities)}
                            className="flex items-center gap-2"
                          >
                            <Icon name={showAllActivities ? "ChevronUp" : "ChevronDown"} size={14} />
                            {showAllActivities ? 'Show Less' : 'View More'}
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Recent bookings, payments, reviews, listings, payout requests, and other activities by this user.
                      </p>
                      <div className="space-y-2">
                        {(showAllActivities ? userDetails.recentActivities : userDetails.recentActivities.slice(0, 10)).map((activity) => {
                          const getActivityIcon = () => {
                            switch (activity.type) {
                              case 'booking': return 'Calendar';
                              case 'payment': return 'DollarSign';
                              case 'review': return 'Star';
                              case 'listing_created': return 'Plus';
                              case 'listing_updated': return 'Edit';
                              case 'payout_request': return 'CreditCard';
                              case 'earning': return 'TrendingUp';
                              case 'favorite': return 'Heart';
                              case 'status_change': return 'Shield';
                              case 'ticket': return 'MessageSquare';
                              default: return 'Circle';
                            }
                          };

                          const getActivityColor = () => {
                            switch (activity.type) {
                              case 'booking': return 'text-blue-600 bg-blue-100';
                              case 'payment': return 'text-green-600 bg-green-100';
                              case 'review': return 'text-yellow-600 bg-yellow-100';
                              case 'listing_created': return 'text-purple-600 bg-purple-100';
                              case 'listing_updated': return 'text-indigo-600 bg-indigo-100';
                              case 'payout_request': return 'text-cyan-600 bg-cyan-100';
                              case 'earning': return 'text-emerald-600 bg-emerald-100';
                              case 'favorite': return 'text-pink-600 bg-pink-100';
                              case 'status_change': return 'text-red-600 bg-red-100';
                              case 'ticket': return 'text-orange-600 bg-orange-100';
                              default: return 'text-gray-600 bg-gray-100';
                            }
                          };

                          return (
                            <div key={`${activity.type}-${activity.id}`} className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border hover:bg-muted/80 transition-colors">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`p-1.5 rounded ${getActivityColor()}`}>
                                    <Icon name={getActivityIcon()} size={14} />
                                  </div>
                                  <p className="font-medium text-foreground">{activity.title}</p>
                                  {activity.role && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      activity.role === 'seeker' 
                                        ? 'bg-green-100 text-green-700'
                                        : activity.role === 'partner'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {activity.role === 'seeker' ? 'Seeker' : activity.role === 'partner' ? 'Partner' : activity.role}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground ml-8">
                                  <span className="flex items-center gap-1">
                                    <Icon name="Clock" size={12} />
                                    {formatTimestamp(activity.timestamp).relativeTime}
                                  </span>
                                  {activity.description && (
                                    <span className="text-xs">{activity.description}</span>
                                  )}
                                </div>
                              </div>
                              {activity.amount && activity.amount > 0 && (
                                <div className="text-right ml-4">
                                  <p className="text-xs text-muted-foreground mb-0.5">Amount</p>
                                  <p className="text-lg font-semibold text-foreground">
                                    A${activity.amount.toFixed(2)}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Previous Tickets */}
                  {previousTickets.length > 0 && (
                    <div className="bg-card border border-border rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <Icon name="MessageSquare" size={18} className="text-primary" />
                        <h4 className="font-semibold text-foreground">Previous Support Tickets</h4>
                        <span className="text-xs text-muted-foreground">(Last 5 tickets)</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        History of previous support interactions with this user.
                      </p>
                      <div className="space-y-2">
                        {previousTickets.map((prevTicket) => (
                          <div key={prevTicket.id} className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border hover:bg-muted/80 transition-colors">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Icon name="Ticket" size={14} className="text-muted-foreground" />
                                <p className="font-medium text-foreground">{prevTicket.subject || 'No subject'}</p>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground ml-6">
                                <span className="font-mono text-xs">{prevTicket.ticket_id}</span>
                                <span className="flex items-center gap-1">
                                  <Icon name="Clock" size={12} />
                                  {formatTimestamp(prevTicket.created_at).relativeTime}
                                </span>
                              </div>
                            </div>
                            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                              prevTicket.status === 'resolved' || prevTicket.status === 'closed'
                                ? 'bg-green-100 text-green-700'
                                : prevTicket.status === 'in-progress'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {prevTicket.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {!ticket.bookingId && 
                   (!userDetails?.recentActivities || userDetails.recentActivities.length === 0) && 
                   previousTickets.length === 0 && (
                    <div className="bg-card border border-border rounded-lg p-12 text-center">
                      <Icon name="Link" size={48} className="text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Related Items</h3>
                      <p className="text-sm text-muted-foreground">
                        This ticket is not linked to any booking, and the user has no recent activities or previous support tickets.
                      </p>
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
                  <span className="text-foreground">{formatTimestamp(ticket.createdAt).formatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="text-foreground">{formatTimestamp(ticket.lastUpdated).formatted}</span>
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
