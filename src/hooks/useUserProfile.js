import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

export const useUserProfile = (userId) => {
  const [userProfile, setUserProfile] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [userSpaces, setUserSpaces] = useState([]);
  const [userActivity, setUserActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showToast } = useToast();
  const { isAdmin } = useAuth();

  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          avatar_url,
          phone,
          is_phone_verified,
          company_name,
          company_type,
          location,
          bio,
          payout_disabled,
          payout_disabled_at,
          payout_disabled_by,
          payout_disabled_reason,
          created_at,
          updated_at
        `)
        .eq('id', userId)
        .single();

      if (profileError) {
        throw profileError;
      }

      setUserProfile(profile);

      // Fetch user bookings with space details
      // For seekers: fetch bookings where they are the seeker
      // For partners: fetch bookings for their spaces
      let bookingsQuery;
      if (profile?.role === 'seeker') {
        bookingsQuery = supabase
          .from('bookings')
          .select(`
            id,
            listing_id,
            status,
            created_at,
            start_time,
            end_time,
            price,
            total_paid,
            guest_count,
            special_requests,
            payment_status,
            completed_at,
            cancelled_at,
            listings (
              id,
              name,
              address,
              category,
              hourly_price,
              daily_price
            )
          `)
          .eq('seeker_id', userId);
      } else if (profile?.role === 'partner') {
        // For partners, fetch bookings for their spaces
        bookingsQuery = supabase
          .from('bookings')
          .select(`
            id,
            listing_id,
            seeker_id,
            status,
            created_at,
            start_time,
            end_time,
            price,
            total_paid,
            guest_count,
            special_requests,
            payment_status,
            completed_at,
            cancelled_at,
            listings!inner (
              id,
              name,
              address,
              category,
              hourly_price,
              daily_price,
              partner_id
            )
          `)
          .eq('listings.partner_id', userId);
      } else {
        bookingsQuery = supabase
          .from('bookings')
          .select('*')
          .eq('seeker_id', userId);
      }

      const { data: bookings, error: bookingsError } = await bookingsQuery
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.warn('Error fetching bookings:', bookingsError);
      } else {
        setUserBookings(bookings || []);
      }

      // Fetch user spaces (listings) if user is a partner
      if (profile?.role === 'partner') {
        const { data: spaces, error: spacesError } = await supabase
          .from('listings')
          .select(`
            id,
            name,
            description,
            address,
            category,
            subcategory,
            hourly_price,
            daily_price,
            capacity,
            area,
            status,
            created_at,
            updated_at,
            images,
            amenities
          `)
          .eq('partner_id', userId)
          .order('created_at', { ascending: false });

        if (spacesError) {
          console.warn('Error fetching spaces:', spacesError);
        } else {
          setUserSpaces(spaces || []);
        }
      }

      // Fetch earnings data for partners
      let userEarnings = [];
      if (profile?.role === 'partner') {
        const { data: earningsData, error: earningsError } = await supabase
          .from('earnings')
          .select(`
            id,
            gross_amount,
            commission_amount,
            net_amount,
            status,
            created_at
          `)
          .eq('partner_id', userId);

        if (earningsError) {
          console.warn('Error fetching earnings:', earningsError);
        } else {
          userEarnings = earningsData || [];
        }
      }

      // Fetch user activity (notifications, booking modifications, status history)
      const [notificationsResult, modificationsResult, statusHistoryResult] = await Promise.all([
        // User notifications
        supabase
          .from('notifications')
          .select('id, type, title, message, created_at, read')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10),

        // User messages (recent conversations) - temporarily disabled to avoid query issues
        // supabase
        //   .from('messages')
        //   .select(`
        //     id,
        //     content,
        //     message_type,
        //     created_at,
        //     conversation_id
        //   `)
        //   .in('conversation_id', 
        //     supabase
        //       .from('conversations')
        //       .select('id')
        //       .or(`participant1_id.eq.${userId},participant2_id.eq.${userId}`)
        //   )
        //   .order('created_at', { ascending: false })
        //   .limit(10),

        // Booking modifications
        supabase
          .from('booking_modifications')
          .select(`
            id,
            modification_type,
            old_value,
            new_value,
            reason,
            created_at,
            bookings (
              id,
              listing_id,
              listings (
                name
              )
            )
          `)
          .eq('modified_by', userId)
          .order('created_at', { ascending: false })
          .limit(10),

        // Account status history (suspension/activation/etc)
        supabase
          .from('user_status_history')
          .select(`
            id,
            old_status,
            new_status,
            reason,
            changed_by,
            created_at,
            changed_by_profile:profiles!user_status_history_changed_by_fkey (
              id,
              email,
              first_name,
              last_name,
              role
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(25)
      ]);

      // Combine activity data
      const activityData = [
        ...(statusHistoryResult.data?.map((row) => {
          const adminName = row?.changed_by_profile
            ? `${row.changed_by_profile.first_name || ''} ${row.changed_by_profile.last_name || ''}`.trim() ||
              row.changed_by_profile.email ||
              row.changed_by
            : row?.changed_by;

          const title =
            row.new_status === 'suspended'
              ? 'Account Suspended'
              : row.new_status === 'active'
              ? 'Account Activated'
              : `Account Status: ${row.new_status}`;

          const message = adminName
            ? `Status changed from ${row.old_status || 'unknown'} to ${row.new_status} by ${adminName}`
            : `Status changed from ${row.old_status || 'unknown'} to ${row.new_status}`;

          return {
            id: row.id,
            type: 'status_change',
            title,
            message,
            timestamp: row.created_at,
            reason: row.reason
          };
        }) || []),
        ...(notificationsResult.data?.map(notif => ({
          id: notif.id,
          type: 'notification',
          title: notif.title,
          message: notif.message,
          timestamp: notif.created_at,
          read: notif.read
        })) || []),
        ...(modificationsResult.data?.map(mod => ({
          id: mod.id,
          type: 'booking_modification',
          title: `${mod.modification_type.replace('_', ' ')}`,
          message: `Modified booking for ${mod.bookings?.listings?.name || 'Unknown Space'}`,
          timestamp: mod.created_at,
          reason: mod.reason
        })) || [])
      ];

      // Sort by timestamp
      activityData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setUserActivity(activityData.slice(0, 20)); // Show last 20 activities

    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err.message);
      showToast('Failed to load user profile', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (userId) {
      fetchUserProfile(userId);
    }
  }, [userId, fetchUserProfile]);

  // Keep activity logs fresh in real-time (suspensions/activations + new notifications)
  useEffect(() => {
    if (!userId || !isAdmin) return;

    const channel = supabase
      .channel(`user-profile-activity-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_status_history', filter: `user_id=eq.${userId}` },
        () => fetchUserProfile(userId)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => fetchUserProfile(userId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isAdmin, fetchUserProfile]);

  return {
    userProfile,
    userBookings,
    userSpaces,
    userActivity,
    loading,
    error,
    refetch: () => fetchUserProfile(userId)
  };
};
