import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';

const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAdmin, authInitialized } = useAuth();
  const { showToast } = useToast();

  const safeToast = useCallback((message, type) => {
    if (showToast) {
      showToast(message, type);
    } else {
      console.warn(`Toast not available: ${message} (${type})`);
    }
  }, [showToast]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      console.log('🔍 Fetching announcements from database...');
      setLoading(true);
      setError(null);

      // Don't fetch if auth is not initialized yet
      if (!authInitialized) {
        console.log('⏳ Auth not initialized, waiting...');
        return;
      }

      // Don't fetch if user is not authenticated or not admin
      if (!user || !isAdmin) {
        console.log('⚠️ User not authenticated or not admin, clearing announcements');
        setAnnouncements([]);
        setLoading(false);
        return;
      }

      console.log('✅ User authenticated as admin, fetching announcements...');

      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select(`
          *,
          author:author_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (announcementsError) {
        console.error('❌ Error fetching announcements:', announcementsError);
        throw announcementsError;
      }

      console.log('✅ Fetched announcements:', announcementsData?.length);

      // Get view counts from user_announcements table for each announcement
      const announcementIds = (announcementsData || []).map(a => a.id);
      let viewCounts = {};
      
      if (announcementIds.length > 0) {
        const { data: viewData, error: viewError } = await supabase
          .from('user_announcements')
          .select('announcement_id')
          .in('announcement_id', announcementIds)
          .eq('is_read', true);

        if (!viewError && viewData) {
          // Count views per announcement
          viewCounts = viewData.reduce((acc, view) => {
            acc[view.announcement_id] = (acc[view.announcement_id] || 0) + 1;
            return acc;
          }, {});
        }
      }

      // Transform the data
      const transformedAnnouncements = (announcementsData || []).map(announcement => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        status: announcement.status,
        audience: announcement.audience,
        publishDate: announcement.publish_date,
        scheduledDate: announcement.scheduled_date,
        author: announcement.author ? 
          `${announcement.author.first_name || ''} ${announcement.author.last_name || ''}`.trim() || announcement.author_name :
          announcement.author_name,
        views: viewCounts[announcement.id] || 0, // Use actual count from user_announcements
        priority: announcement.priority || 'medium',
        tags: announcement.tags || [],
        metadata: announcement.metadata || {},
        createdAt: new Date(announcement.created_at),
        updatedAt: new Date(announcement.updated_at),
        raw: announcement
      }));

      setAnnouncements(transformedAnnouncements);
    } catch (err) {
      console.error('❌ Error fetching announcements:', err);
      setError(err.message || 'Failed to fetch announcements');
      safeToast('Failed to fetch announcements', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, authInitialized, safeToast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Set up real-time subscription for announcements (including views updates)
  useEffect(() => {
    if (!user || !isAdmin) return;

    console.log('🔔 Setting up real-time subscription for announcements...');

    const announcementsChannel = supabase
      .channel(`announcements-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements'
        },
        (payload) => {
          console.log('📢 Announcement change received:', payload.eventType);
          
          if (payload.eventType === 'UPDATE') {
            // Update the specific announcement in the list
            setAnnouncements(prev => prev.map(announcement => {
              if (announcement.id === payload.new.id) {
                return {
                  ...announcement,
                  title: payload.new.title,
                  content: payload.new.content,
                  status: payload.new.status,
                  audience: payload.new.audience,
                  publishDate: payload.new.publish_date,
                  scheduledDate: payload.new.scheduled_date,
                  views: payload.new.views || 0,
                  priority: payload.new.priority || 'medium',
                  tags: payload.new.tags || [],
                  metadata: payload.new.metadata || {},
                  updatedAt: new Date(payload.new.updated_at),
                  raw: payload.new
                };
              }
              return announcement;
            }));
          } else if (payload.eventType === 'INSERT') {
            // New announcement added - refresh the list
            fetchAnnouncements();
          } else if (payload.eventType === 'DELETE') {
            // Announcement deleted - remove from list
            setAnnouncements(prev => prev.filter(announcement => announcement.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Subscribe to user_announcements changes to update view counts in real-time
    const viewsChannel = supabase
      .channel(`announcement-views-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_announcements'
        },
        async (payload) => {
          console.log('👁️ User announcement view change received:', payload.eventType);
          
          // When a user views an announcement, recalculate views for that announcement
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const announcementId = payload.new.announcement_id;
            
            // Recalculate view count for this announcement
            const { data: viewData, error: viewError } = await supabase
              .from('user_announcements')
              .select('announcement_id')
              .eq('announcement_id', announcementId)
              .eq('is_read', true);

            if (!viewError && viewData) {
              const viewCount = viewData.length;
              
              // Update the view count in the announcements list
              setAnnouncements(prev => prev.map(announcement => {
                if (announcement.id === announcementId) {
                  return {
                    ...announcement,
                    views: viewCount
                  };
                }
                return announcement;
              }));
            }
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Unsubscribing from announcements real-time updates');
      announcementsChannel.unsubscribe();
      viewsChannel.unsubscribe();
    };
  }, [user, isAdmin, fetchAnnouncements]);

  const createAnnouncement = useCallback(async (announcementData) => {
    try {
      console.log('🔍 Creating announcement:', announcementData.title);
      
      const { data, error } = await supabase
        .from('announcements')
        .insert([{
          title: announcementData.title,
          content: announcementData.content,
          status: announcementData.status || 'draft',
          audience: announcementData.audience || 'all_users',
          publish_date: announcementData.publishDate,
          scheduled_date: announcementData.scheduledDate,
          author_id: user?.id,
          author_name: announcementData.author || 'Admin Team',
          priority: announcementData.priority || 'medium',
          tags: announcementData.tags || [],
          metadata: announcementData.metadata || {}
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('Announcement created successfully', 'success');
      fetchAnnouncements(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error creating announcement:', err);
      safeToast('Failed to create announcement', 'error');
      throw err;
    }
  }, [user, safeToast, fetchAnnouncements]);

  const updateAnnouncement = useCallback(async (id, updates) => {
    try {
      console.log('🔍 Updating announcement:', id);
      
      const { data, error } = await supabase
        .from('announcements')
        .update({
          title: updates.title,
          content: updates.content,
          status: updates.status,
          audience: updates.audience,
          publish_date: updates.publishDate,
          scheduled_date: updates.scheduledDate,
          priority: updates.priority,
          tags: updates.tags,
          metadata: updates.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('Announcement updated successfully', 'success');
      fetchAnnouncements(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error updating announcement:', err);
      safeToast('Failed to update announcement', 'error');
      throw err;
    }
  }, [safeToast, fetchAnnouncements]);

  const deleteAnnouncement = useCallback(async (id) => {
    try {
      console.log('🔍 Deleting announcement:', id);
      
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      safeToast('Announcement deleted successfully', 'success');
      fetchAnnouncements(); // Refresh the list
    } catch (err) {
      console.error('❌ Error deleting announcement:', err);
      safeToast('Failed to delete announcement', 'error');
      throw err;
    }
  }, [safeToast, fetchAnnouncements]);

  const publishAnnouncement = useCallback(async (id) => {
    try {
      console.log('🔍 Publishing announcement:', id);
      
      const { data, error } = await supabase
        .from('announcements')
        .update({
          status: 'published',
          publish_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('Announcement published successfully', 'success');
      fetchAnnouncements(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error publishing announcement:', err);
      safeToast('Failed to publish announcement', 'error');
      throw err;
    }
  }, [safeToast, fetchAnnouncements]);

  /**
   * Track when a user views an announcement
   * @param {string} announcementId - Announcement ID
   * @param {string} userId - User ID (optional, defaults to current user)
   * @returns {Promise<Object>} Success status
   */
  const trackAnnouncementView = useCallback(async (announcementId, userId = null) => {
    try {
      const currentUserId = userId || user?.id;
      if (!currentUserId || !announcementId) {
        console.warn('Cannot track view: Missing user ID or announcement ID');
        return { success: false, error: 'Missing user ID or announcement ID' };
      }

      // Check if view already exists
      const { data: existingView, error: checkError } = await supabase
        .from('user_announcements')
        .select('id, is_read, read_at')
        .eq('announcement_id', announcementId)
        .eq('user_id', currentUserId)
        .single();

      const nowIso = new Date().toISOString();

      if (existingView && !checkError) {
        // Update existing record if not already read
        if (!existingView.is_read) {
          const { error: updateError } = await supabase
            .from('user_announcements')
            .update({
              is_read: true,
              read_at: nowIso,
              updated_at: nowIso
            })
            .eq('id', existingView.id);

          if (updateError) {
            throw updateError;
          }
          console.log('✅ Updated announcement view record');
        } else {
          console.log('✅ Announcement already viewed by user');
        }
      } else {
        // Create new view record
        const { error: insertError } = await supabase
          .from('user_announcements')
          .insert({
            user_id: currentUserId,
            announcement_id: announcementId,
            is_read: true,
            read_at: nowIso,
            created_at: nowIso,
            updated_at: nowIso
          });

        if (insertError) {
          throw insertError;
        }
        console.log('✅ Created announcement view record');
      }

      return { success: true };
    } catch (err) {
      console.error('❌ Error tracking announcement view:', err);
      return { success: false, error: err.message };
    }
  }, [user?.id]);

  /**
   * Fetch users who viewed a specific announcement
   * @param {string} announcementId - Announcement ID
   * @returns {Promise<Array>} Array of users who viewed the announcement
   */
  const getAnnouncementViewers = useCallback(async (announcementId) => {
    try {
      const { data, error } = await supabase
        .from('user_announcements')
        .select(`
          id,
          user_id,
          is_read,
          read_at,
          created_at,
          profiles!user_announcements_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            avatar_url,
            role
          )
        `)
        .eq('announcement_id', announcementId)
        .eq('is_read', true)
        .order('read_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data || []).map(view => {
        const profile = view.profiles;
        return {
          id: view.id,
          userId: view.user_id,
          userName: profile 
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email
            : 'Unknown User',
          userEmail: profile?.email || '',
          userAvatar: profile?.avatar_url || null,
          userRole: profile?.role || '',
          readAt: view.read_at,
          createdAt: view.created_at
        };
      });
    } catch (err) {
      console.error('❌ Error fetching announcement viewers:', err);
      return [];
    }
  }, []);

  return {
    announcements,
    loading,
    error,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    publishAnnouncement,
    trackAnnouncementView,
    getAnnouncementViewers,
    refetch: fetchAnnouncements
  };
};

export default useAnnouncements;
