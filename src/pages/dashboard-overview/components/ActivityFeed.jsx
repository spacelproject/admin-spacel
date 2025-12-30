import React, { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import { useActivityFeed } from '../../../hooks/useActivityFeed';

const ActivityFeed = () => {
  const navigate = useNavigate();
  const { activities, loading, loadingMore, error, hasMore, loadMore } = useActivityFeed();
  const observerRef = useRef(null);
  
  // Set up intersection observer for infinite scroll
  const lastActivityRef = useCallback((node) => {
    if (loading || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px'
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, loadingMore, hasMore, loadMore]);

  // Format timestamp to match design (e.g., "2 hours ago", "Started 1 hour ago")
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    // If timestamp is already formatted, return as is
    if (typeof timestamp === 'string' && (timestamp.includes('ago') || timestamp.includes('Started'))) {
      return timestamp;
    }
    
    // Try to parse as date
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return timestamp;
    }
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    if (diffDays === 1) return '24 hours ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Extract user name from activity
  const getUserName = (activity) => {
    const raw = activity?.raw;
    if (!raw) return null;
    
    // For bookings - get seeker name
    if (raw.seekers) {
      const firstName = raw.seekers.first_name || '';
      const lastName = raw.seekers.last_name || '';
      return `${firstName} ${lastName}`.trim() || null;
    }
    
    // For listings - get partner name
    if (raw.profiles && (raw.partner_id || activity?.type?.includes('listing'))) {
      const firstName = raw.profiles.first_name || '';
      const lastName = raw.profiles.last_name || '';
      return `${firstName} ${lastName}`.trim() || null;
    }
    
    // For reviews, tickets, favorites - get user name
    if (raw.profiles && !raw.partner_id) {
      const firstName = raw.profiles.first_name || '';
      const lastName = raw.profiles.last_name || '';
      return `${firstName} ${lastName}`.trim() || null;
    }
    
    // For user registrations
    if (raw.first_name || raw.last_name) {
      return `${raw.first_name || ''} ${raw.last_name || ''}`.trim() || null;
    }
    
    return null;
  };

  // Extract monetary value from activity (if available)
  const getActivityValue = (activity) => {
    const raw = activity?.raw;
    
    // For bookings
    if (raw?.total) {
      return `$${parseFloat(raw.total).toFixed(2)}`;
    }
    
    // For payments
    if (raw?.amount) {
      return `$${parseFloat(raw.amount).toFixed(2)}`;
    }
    
    // Try to extract value from description
    const valueMatch = activity?.description?.match(/\$[\d,]+\.?\d*/);
    if (valueMatch) {
      return valueMatch[0];
    }
    
    // Check if activity has a value field
    if (activity?.value || activity?.amount) {
      return `$${parseFloat(activity.value || activity.amount).toFixed(2)}`;
    }
    
    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 card-shadow h-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-1 tracking-tight">Recent Activity</h3>
        <p className="text-sm font-normal text-gray-500">Your latest completed and ongoing tasks</p>
      </div>
      
      <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px]">
        {loading && activities.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Icon name="Loader2" size={24} className="animate-spin text-blue-600 mr-2" />
            <p className="text-sm text-gray-500">Loading activities...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Icon name="AlertCircle" size={24} className="text-red-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-red-600 mb-1">Failed to load activities</p>
            <p className="text-xs font-normal text-gray-500">{error}</p>
          </div>
        ) : activities?.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="Activity" size={24} className="text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-500">No recent activity</p>
          </div>
        ) : (
          <>
            {activities.map((activity, index) => {
            const activityValue = getActivityValue(activity);
            const timeAgo = formatTimeAgo(activity?.timestamp);
            const userName = getUserName(activity);
            const userAvatar = activity?.avatar || activity?.raw?.avatar_url || activity?.raw?.seekers?.avatar_url || activity?.raw?.profiles?.avatar_url || '/assets/images/no_image.png';
              const isLastItem = index === activities.length - 1;
            
            return (
            <div 
              key={activity?.id} 
                  ref={isLastItem ? lastActivityRef : null}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-smooth"
            >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <Image
                      src={userAvatar}
                      alt={userName || 'User'}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200"
                />
              </div>
              <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                    {activity?.title}
                  </p>
                    {userName && (
                      <p className="text-xs font-medium text-gray-700 mb-1">
                        {userName}
                      </p>
                    )}
                    <p className="text-xs font-normal text-gray-500">
                      {timeAgo}
                </p>
              </div>
            </div>
                {activityValue && (
                  <div className="ml-4 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {activityValue}
                    </p>
                  </div>
                )}
              </div>
            );
            })}
            
            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <Icon name="Loader2" size={20} className="animate-spin text-blue-600 mr-2" />
                <p className="text-sm text-gray-500">Loading more activities...</p>
              </div>
            )}
            
            {/* End of list indicator */}
            {!hasMore && activities.length > 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">You've reached the end</p>
                <p className="text-xs text-gray-400 mt-1">All activities loaded</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
