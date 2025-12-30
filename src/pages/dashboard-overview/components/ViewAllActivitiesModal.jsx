import React, { useEffect, useRef, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import { useActivityFeedAll } from '../../../hooks/useActivityFeedAll';

const ViewAllActivitiesModal = ({ isOpen, onClose }) => {
  const { activities, loading, loadingMore, error, hasMore, loadMore, totalCount } = useActivityFeedAll(isOpen);
  const scrollContainerRef = useRef(null);
  const observerRef = useRef(null);
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

  // Format timestamp
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    if (typeof timestamp === 'string' && (timestamp.includes('ago') || timestamp.includes('Started'))) {
      return timestamp;
    }
    
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
    
    if (raw.seekers) {
      const firstName = raw.seekers.first_name || '';
      const lastName = raw.seekers.last_name || '';
      return `${firstName} ${lastName}`.trim() || null;
    }
    
    if (raw.profiles && (raw.partner_id || activity?.type?.includes('listing'))) {
      const firstName = raw.profiles.first_name || '';
      const lastName = raw.profiles.last_name || '';
      return `${firstName} ${lastName}`.trim() || null;
    }
    
    if (raw.profiles && !raw.partner_id) {
      const firstName = raw.profiles.first_name || '';
      const lastName = raw.profiles.last_name || '';
      return `${firstName} ${lastName}`.trim() || null;
    }
    
    if (raw.first_name || raw.last_name) {
      return `${raw.first_name || ''} ${raw.last_name || ''}`.trim() || null;
    }
    
    return null;
  };

  // Extract monetary value from activity
  const getActivityValue = (activity) => {
    const raw = activity?.raw;
    
    if (raw?.total) {
      return `$${parseFloat(raw.total).toFixed(2)}`;
    }
    
    if (raw?.amount) {
      return `$${parseFloat(raw.amount).toFixed(2)}`;
    }
    
    const valueMatch = activity?.description?.match(/\$[\d,]+\.?\d*/);
    if (valueMatch) {
      return valueMatch[0];
    }
    
    if (activity?.value || activity?.amount) {
      return `$${parseFloat(activity.value || activity.amount).toFixed(2)}`;
    }
    
    return null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">All Recent Activities</h2>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? 'Loading...' : totalCount ? `Showing ${activities.length} of ${totalCount} activities` : `${activities.length} activities`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <Icon name="X" size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-6"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Icon name="Loader2" size={32} className="animate-spin text-blue-600 mb-4" />
              <p className="text-gray-500">Loading activities...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Icon name="AlertCircle" size={48} className="text-red-500 mx-auto mb-4" />
              <p className="text-lg font-semibold text-red-600 mb-2">Failed to load activities</p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Activity" size={48} className="text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500">No activities found</p>
            </div>
          ) : (
            <div className="space-y-4">
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
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <Image
                          src={userAvatar}
                          alt={userName || 'User'}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 mb-1">
                          {activity?.title}
                        </p>
                        {activity?.description && (
                          <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        {userName && (
                          <p className="text-xs font-medium text-gray-700 mb-1">
                            {userName}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
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
                <div className="flex items-center justify-center py-8">
                  <Icon name="Loader2" size={20} className="animate-spin text-blue-600 mr-3" />
                  <p className="text-sm text-gray-500">Loading more activities...</p>
                </div>
              )}
              
              {/* End of list indicator */}
              {!hasMore && activities.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500">You've reached the end of the list</p>
                  <p className="text-xs text-gray-400 mt-1">All activities loaded</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewAllActivitiesModal;

