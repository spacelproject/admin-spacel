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
import { playNotificationSound, isSoundNotificationEnabled } from '../../../utils/soundNotification';

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
  const [userDetails, setUserDetails] = useState(null);
  const [previousTickets, setPreviousTickets] = useState([]);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const conversationEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  // Track message IDs that have already played sound to prevent duplicates
  const soundPlayedForMessages = useRef(new Set());

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
    if (!isOpen || !ticket?.dbId) {
      // Clear sound tracking when modal closes or ticket changes
      soundPlayedForMessages.current.clear();
      return;
    }

    // Clear sound tracking when switching to a new ticket
    soundPlayedForMessages.current.clear();

    fetchReplies();
    fetchInternalNotes();
    if (ticket.bookingId) fetchRelatedBookings();
    fetchUserDetails();
    fetchPreviousTickets();

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
        async (payload) => {
          console.log('🔄 Reply change received:', payload.eventType, payload.new);
          if (payload.eventType === 'INSERT' && payload.new) {
            // New message received - fetch full data with profiles and add to state
            try {
              const { data: newReply, error: replyError } = await supabase
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
                .eq('id', payload.new.id)
                .single();

              if (!replyError && newReply) {
                // Check if this reply already exists in state (avoid duplicates)
                setReplies(prevReplies => {
                  const exists = prevReplies.some(r => r.id === newReply.id);
                  if (exists) {
                    console.log('🔄 Reply already in state, skipping duplicate');
                    return prevReplies;
                  }
                  
                  // Add new reply to the end of the list
                  const updated = [...prevReplies, newReply];
                  
                  // Auto-scroll to show new message
                  setTimeout(() => {
                    scrollToBottom();
                  }, 100);
                  
                  // Show notification and play sound for new user message (not admin messages)
                  if (!newReply.admin_id) {
                    const userName = newReply.profiles?.first_name || 'User';
                    showToast(`New message from ${userName}`, 'info');
                    
                    // Play sound notification if enabled and not already played for this message
                    if (!soundPlayedForMessages.current.has(newReply.id)) {
                      soundPlayedForMessages.current.add(newReply.id);
                      
                      // Check if sound notifications are enabled
                      isSoundNotificationEnabled(user?.id).then(enabled => {
                        if (enabled) {
                          console.log('🔊 Playing sound for new support ticket message');
                          playNotificationSound();
                        } else {
                          console.log('🔇 Sound notifications disabled for user');
                        }
                      }).catch(err => {
                        console.warn('Error checking sound notification preference:', err);
                        // Default to playing sound if we can't check preference
                        playNotificationSound();
                      });
                    }
                  }
                  
                  return updated;
                });
              } else {
                // If we can't fetch the full reply, fallback to refetching all
                console.warn('Could not fetch new reply details, refetching all:', replyError);
                fetchReplies();
              }
            } catch (error) {
              console.error('Error processing new reply:', error);
              // Fallback to refetching all replies
              fetchReplies();
            }
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            // Reply was updated - update it in state
            setReplies(prevReplies => 
              prevReplies.map(reply => 
                reply.id === payload.new.id 
                  ? { ...reply, ...payload.new }
                  : reply
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('🔔 Replies subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time replies');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to real-time replies');
        }
      })

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
          booking_reference,
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
          booking_reference: b.booking_reference,
          listings: b.listings
        })));
      }
    } catch (error) {
      console.error('Error fetching related bookings:', error);
      setRelatedBookings([]);
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
        console.error('Error fetching user profile:', profileError);
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
        console.warn('Error fetching seeker bookings:', seekerBookingsError);
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
        console.warn('Error fetching partner bookings:', partnerBookingsError);
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
        console.warn('Could not fetch earnings:', earningsErr);
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

      // Check for profile-related activities that we can track
      // Note: We don't show generic "profile updated" since we can't tell what changed
      // Instead, we'll look for specific trackable changes like status changes
      
      // Fetch user status history (if available) - these are meaningful changes
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
        // user_status_history table might not exist - skip silently
        console.warn('Could not fetch status history:', statusErr);
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
        console.warn('Error fetching ticket count:', ticketCountError);
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
      console.error('Error fetching user details:', error);
    }
  };

  const fetchPreviousTickets = async () => {
    if (!ticket?.user?.id || !ticket?.dbId) return;
    
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('id, ticket_id, subject, status, created_at')
        .eq('user_id', ticket.user.id)
        .neq('id', ticket.dbId)
        .order('created_at', { ascending: false })
        .limit(5);
    
      if (error) {
        console.error('Error fetching previous tickets:', error);
      } else if (data) {
        setPreviousTickets(data);
      }
    } catch (error) {
      console.error('Error fetching previous tickets:', error);
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
                                          <div className="text-xs text-muted-foreground mt-1">
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
                                            <span className="text-muted-foreground">
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
                                    <p className="font-semibold text-foreground">{booking.listings?.name || 'Unknown Space'}</p>
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
                                      A${parseFloat(booking.price || 0).toFixed(2)}
                                    </p>
                          </div>
                      </div>
                                {booking.start_time && (
                                  <div className="flex items-start gap-2">
                                    <Icon name="Calendar" size={16} className="text-muted-foreground mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">Start Date</p>
                                      <p className="text-sm font-medium text-foreground">
                                        {new Date(booking.start_time).toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric', 
                                          year: 'numeric' 
                                        })}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(booking.start_time).toLocaleTimeString('en-US', { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                )}
                                {booking.end_time && (
                                  <div className="flex items-start gap-2">
                                    <Icon name="Calendar" size={16} className="text-muted-foreground mt-0.5" />
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-0.5">End Date</p>
                                      <p className="text-sm font-medium text-foreground">
                                        {new Date(booking.end_time).toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric', 
                                          year: 'numeric' 
                                        })}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Date(booking.end_time).toLocaleTimeString('en-US', { 
                                          hour: '2-digit', 
                                          minute: '2-digit' 
                                        })}
                                      </p>
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

