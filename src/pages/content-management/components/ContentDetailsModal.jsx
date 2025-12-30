import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import useAnnouncements from '../../../hooks/useAnnouncements';
import { useAuth } from '../../../contexts/AuthContext';

const ContentDetailsModal = ({ isOpen, onClose, item, type = 'content' }) => {
  const [viewers, setViewers] = useState([]);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const { getAnnouncementViewers, trackAnnouncementView } = useAnnouncements();
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && item?.id && type === 'announcement') {
      fetchViewers();
      // Track view when admin opens the announcement details
      if (user?.id && item?.id) {
        trackAnnouncementView(item.id, user.id).catch(err => {
          console.error('Error tracking announcement view:', err);
        });
      }
    } else {
      setViewers([]);
    }
  }, [isOpen, item?.id, type, user?.id]);

  const fetchViewers = async () => {
    if (!item?.id) return;
    
    try {
      setLoadingViewers(true);
      const viewersData = await getAnnouncementViewers(item.id);
      setViewers(viewersData);
    } catch (error) {
      console.error('Error fetching viewers:', error);
    } finally {
      setLoadingViewers(false);
    }
  };

  if (!isOpen || !item) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      published: { color: 'bg-success/10 text-success', label: 'Published' },
      draft: { color: 'bg-muted text-muted-foreground', label: 'Draft' },
      scheduled: { color: 'bg-warning/10 text-warning', label: 'Scheduled' },
      archived: { color: 'bg-destructive/10 text-destructive', label: 'Archived' },
      review: { color: 'bg-warning/10 text-warning', label: 'Under Review' },
      pending: { color: 'bg-warning/10 text-warning', label: 'Pending' },
      under_review: { color: 'bg-accent/10 text-accent', label: 'Under Review' },
      approved: { color: 'bg-success/10 text-success', label: 'Approved' },
      rejected: { color: 'bg-destructive/10 text-destructive', label: 'Rejected' }
    };

    const config = statusConfig?.[status] || statusConfig?.draft;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const renderTypeSpecificDetails = () => {
    switch (type) {
      case 'announcement':
        return (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Audience
                </label>
                <p className="text-foreground">
                  {item?.audience === 'all_users' ? 'All Users' : 
                   item?.audience === 'seekers_only' ? 'Seekers Only' : 
                   item?.audience === 'partners_only' ? 'Partners Only' : item?.audience ||'-'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Views
                </label>
                <p className="text-foreground">{item?.views?.toLocaleString() || '0'}</p>
              </div>
            </div>
            
            {/* Viewers List */}
            {item?.views > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Users Who Viewed ({viewers.length})
                </label>
                {loadingViewers ? (
                  <div className="flex items-center justify-center py-4">
                    <Icon name="Loader2" className="animate-spin text-primary" size={20} />
                    <span className="ml-2 text-sm text-muted-foreground">Loading viewers...</span>
                  </div>
                ) : viewers.length > 0 ? (
                  <div className="bg-muted/30 rounded-md p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-2">
                      {viewers.map((viewer) => (
                        <div
                          key={viewer.id}
                          className="flex items-center justify-between p-2 bg-card rounded-md border border-border"
                        >
                          <div className="flex items-center space-x-3">
                            {viewer.userAvatar ? (
                              <Image
                                src={viewer.userAvatar}
                                alt={viewer.userName}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Icon name="User" size={16} className="text-primary" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">{viewer.userName}</p>
                              <p className="text-xs text-muted-foreground">{viewer.userEmail}</p>
                            </div>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                              {viewer.userRole}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {viewer.readAt 
                                ? new Date(viewer.readAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'Unknown'
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No viewers yet</p>
                )}
              </div>
            )}
            
            {item?.scheduledDate && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Scheduled For
                </label>
                <p className="text-foreground">{formatDate(item?.scheduledDate)}</p>
              </div>
            )}
          </>
        );

      case 'documentation':
        return (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Category
                </label>
                <p className="text-foreground capitalize">
                  {item?.category?.replace('_', ' ') || '-'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Version
                </label>
                <p className="text-foreground">v{item?.version || '1.0'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Views
                </label>
                <p className="text-foreground">{item?.views?.toLocaleString() || '0'}</p>
              </div>
            </div>
          </>
        );

      case 'legal':
        return (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Version
                </label>
                <p className="text-foreground">v{item?.version || '1.0'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Effective Date
                </label>
                <p className="text-foreground">{formatDate(item?.effectiveDate)}</p>
              </div>
            </div>
            {item?.slug && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  URL Slug
                </label>
                <p className="text-foreground font-mono text-sm">/{item?.slug}</p>
              </div>
            )}
          </>
        );

      case 'moderation':
        return (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Report Reason
                </label>
                <p className="text-foreground">{item?.reportReason || '-'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Priority
                </label>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  item?.priority === 'high' ? 'bg-destructive/10 text-destructive' :
                  item?.priority === 'medium'? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
                }`}>
                  {item?.priority || 'Low'}
                </span>
              </div>
            </div>
            {item?.reporter && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Reported By
                </label>
                <p className="text-foreground">{item?.reporter}</p>
              </div>
            )}
            {item?.moderatorNote && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Moderator Note
                </label>
                <div className="bg-accent/5 border border-accent/20 rounded-md p-3">
                  <p className="text-foreground text-sm">{item?.moderatorNote}</p>
                </div>
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{item?.title}</h2>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge(item?.status)}
                <span className="text-sm text-muted-foreground">
                  by {item?.author}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            iconName="X"
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                {type === 'moderation' ? 'Submitted' : 'Created'}
              </label>
              <p className="text-foreground">
                {formatDate(item?.publishDate || item?.submittedDate || item?.lastUpdated)}
              </p>
            </div>
            {item?.lastUpdated && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Last Updated
                </label>
                <p className="text-foreground">{formatDate(item?.lastUpdated)}</p>
              </div>
            )}
          </div>

          {/* Type-specific details */}
          {renderTypeSpecificDetails()}

          {/* Content/Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              {type === 'moderation' ? 'Report Details' : 'Content'}
            </label>
            <div className="bg-muted/30 rounded-md p-4 max-h-60 overflow-y-auto">
              <p className="text-foreground whitespace-pre-wrap text-sm">
                {item?.content || 'No content available'}
              </p>
            </div>
          </div>

          {/* Images (for moderation items) */}
          {item?.images && item?.images?.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Attached Images
              </label>
              <div className="grid grid-cols-3 gap-2">
                {item?.images?.map((image, index) => (
                  <div key={index} className="aspect-square rounded-md overflow-hidden bg-muted">
                    <img
                      src={image}
                      alt={`Attachment ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rating (for reviews) */}
          {typeof item?.rating === 'number' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Rating
              </label>
              <div className="flex items-center space-x-1">
                {[...Array(5)]?.map((_, i) => (
                  <Icon
                    key={i}
                    name="Star"
                    size={20}
                    className={i < item?.rating ? 'text-warning fill-current' : 'text-muted-foreground'}
                  />
                ))}
                <span className="ml-2 text-sm text-muted-foreground">
                  ({item?.rating}/5)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/20">
          <div className="text-sm text-muted-foreground">
            {type === 'moderation' ? 'Moderation Details' : 'Content Details'}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {(item?.status === 'draft' || item?.status === 'pending') && (
              <Button>
                Edit {type === 'moderation' ? 'Review' : 'Content'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentDetailsModal;