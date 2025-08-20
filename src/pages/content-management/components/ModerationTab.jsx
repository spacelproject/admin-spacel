import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Image from '../../../components/AppImage';
import ContentDetailsModal from './ContentDetailsModal';
import ActionDropdown from './ActionDropdown';

const ModerationTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedItems, setSelectedItems] = useState([]);
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, item: null });

  const moderationItems = [
    {
      id: 1,
      type: 'listing',
      title: 'Modern Downtown Loft',
      reporter: 'guest_user_123',
      reportReason: 'Misleading photos',
      status: 'pending',
      priority: 'high',
      submittedDate: '2025-01-16T14:30:00Z',
      content: 'The photos in this listing don\'t match the actual space. The room is much smaller than shown.',
      author: 'host_user_456',
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400&h=300&fit=crop'
      ]
    },
    {
      id: 2,
      type: 'review',
      title: 'Review for Cozy Studio Apartment',
      reporter: 'system_auto',
      reportReason: 'Inappropriate language',
      status: 'pending',
      priority: 'medium',
      submittedDate: '2025-01-16T12:15:00Z',
      content: 'This place was absolutely terrible. The host was rude and the space was dirty. I would never recommend this to anyone.',
      author: 'guest_user_789',
      rating: 1
    },
    {
      id: 3,
      type: 'message',
      title: 'Host-Guest Communication',
      reporter: 'guest_user_321',
      reportReason: 'Harassment',
      status: 'under_review',
      priority: 'high',
      submittedDate: '2025-01-16T09:45:00Z',
      content: 'The host has been sending inappropriate messages and making me uncomfortable.',
      author: 'host_user_654',
      conversationId: 'conv_12345'
    },
    {
      id: 4,
      type: 'listing',
      title: 'Luxury Penthouse Suite',
      reporter: 'guest_user_555',
      reportReason: 'Fake listing',
      status: 'approved',
      priority: 'high',
      submittedDate: '2025-01-15T16:20:00Z',
      content: 'This listing appears to be using stock photos and may not be a real property.',
      author: 'host_user_777',
      moderatorNote: 'Verified with host - legitimate listing with professional photos',
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop'
      ]
    },
    {
      id: 5,
      type: 'review',
      title: 'Review for Garden View Room',
      reporter: 'host_user_888',
      reportReason: 'False information',
      status: 'rejected',
      priority: 'low',
      submittedDate: '2025-01-15T11:30:00Z',
      content: 'Great location and clean space. Host was very responsive and helpful.',
      author: 'guest_user_999',
      rating: 5,
      moderatorNote: 'Review appears genuine and follows community guidelines'
    },
    {
      id: 6,
      type: 'listing',
      title: 'Beachfront Villa',
      reporter: 'guest_user_111',
      reportReason: 'Discriminatory content',
      status: 'pending',
      priority: 'high',
      submittedDate: '2025-01-16T08:00:00Z',
      content: 'The listing description contains language that may be discriminatory against certain groups.',
      author: 'host_user_222',
      images: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'
      ]
    }
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'listing', label: 'Listings' },
    { value: 'review', label: 'Reviews' },
    { value: 'message', label: 'Messages' },
    { value: 'profile', label: 'Profiles' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const filteredItems = moderationItems?.filter(item => {
    const matchesSearch = item?.title?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
                         item?.content?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    const matchesType = typeFilter === 'all' || item?.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || item?.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredItems?.map(item => item?.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, id]);
    } else {
      setSelectedItems(selectedItems?.filter(itemId => itemId !== id));
    }
  };

  const handleBulkAction = (action) => {
    console.log(`Bulk ${action} for items:`, selectedItems);
    setSelectedItems([]);
  };

  const handleModerationAction = (itemId, action) => {
    console.log(`${action} item:`, itemId);
  };

  const handleViewDetails = (item) => {
    setDetailsModal({ isOpen: true, item });
  };

  const handleEdit = (item) => {
    console.log('Editing moderation item:', item?.id);
  };

  const handleApprove = (item) => {
    console.log('Approving item:', item?.id);
    handleModerationAction(item?.id, 'approve');
  };

  const handleReject = (item) => {
    console.log('Rejecting item:', item?.id);
    handleModerationAction(item?.id, 'reject');
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete this ${item?.type}?`)) {
      console.log('Deleting moderation item:', item?.id);
    }
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      high: { color: 'bg-destructive/10 text-destructive', label: 'High' },
      medium: { color: 'bg-warning/10 text-warning', label: 'Medium' },
      low: { color: 'bg-muted text-muted-foreground', label: 'Low' }
    };

    const config = priorityConfig?.[priority] || priorityConfig?.low;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-warning/10 text-warning', label: 'Pending' },
      under_review: { color: 'bg-accent/10 text-accent', label: 'Under Review' },
      approved: { color: 'bg-success/10 text-success', label: 'Approved' },
      rejected: { color: 'bg-destructive/10 text-destructive', label: 'Rejected' }
    };

    const config = statusConfig?.[status] || statusConfig?.pending;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const getTypeIcon = (type) => {
    const typeIcons = {
      listing: 'Building',
      review: 'Star',
      message: 'MessageCircle',
      profile: 'User'
    };
    return typeIcons?.[type] || 'FileText';
  };

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Content Moderation</h2>
          <p className="text-sm text-muted-foreground">
            Review and moderate user-generated content
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" iconName="Filter">
            Advanced Filters
          </Button>
          <Button variant="outline" iconName="Download">
            Export Report
          </Button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e?.target?.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={typeOptions}
            value={typeFilter}
            onChange={setTypeFilter}
            placeholder="Filter by type"
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Filter by status"
          />
        </div>
      </div>
      {selectedItems?.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-sm font-medium text-foreground">
            {selectedItems?.length} item{selectedItems?.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('approve')}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('reject')}
            >
              Reject
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleBulkAction('delete')}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
      <div className="space-y-4">
        {filteredItems?.map((item) => (
          <div key={item?.id} className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-start space-x-4">
              <input
                type="checkbox"
                checked={selectedItems?.includes(item?.id)}
                onChange={(e) => handleSelectItem(item?.id, e?.target?.checked)}
                className="mt-1 rounded border-border"
              />
              
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <Icon name={getTypeIcon(item?.type)} size={20} className="text-muted-foreground" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-foreground mb-1">{item?.title}</h3>
                    <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                      <span>Reported by {item?.reporter}</span>
                      <span>•</span>
                      <span>{formatDate(item?.submittedDate)}</span>
                      <span>•</span>
                      <span className="capitalize">{item?.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getPriorityBadge(item?.priority)}
                    {getStatusBadge(item?.status)}
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Reason:</strong> {item?.reportReason}
                  </p>
                  <p className="text-sm text-foreground">
                    <strong>Content:</strong> {item?.content}
                  </p>
                  {item?.moderatorNote && (
                    <p className="text-sm text-accent mt-2">
                      <strong>Moderator Note:</strong> {item?.moderatorNote}
                    </p>
                  )}
                </div>
                
                {item?.images && item?.images?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-foreground mb-2">Attached Images:</p>
                    <div className="flex space-x-2">
                      {item?.images?.map((image, index) => (
                        <div key={index} className="w-20 h-20 rounded-lg overflow-hidden">
                          <Image
                            src={image}
                            alt={`Attachment ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {item?.rating && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-foreground mb-1">Rating:</p>
                    <div className="flex items-center space-x-1">
                      {[...Array(5)]?.map((_, i) => (
                        <Icon
                          key={i}
                          name="Star"
                          size={16}
                          className={i < item?.rating ? 'text-warning fill-current' : 'text-muted-foreground'}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      Content by: {item?.author}
                    </span>
                  </div>
                  
                  {item?.status === 'pending' || item?.status === 'under_review' ? (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(item)}
                        iconName="Check"
                        iconPosition="left"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(item)}
                        iconName="X"
                        iconPosition="left"
                      >
                        Reject
                      </Button>
                      <ActionDropdown
                        item={item}
                        type="moderation"
                        onEdit={handleEdit}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onDelete={handleDelete}
                        onDuplicate={() => {}}
                        onPublish={() => {}}
                        onArchive={() => {}}
                        onViewHistory={() => {}}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(item)}
                        iconName="Eye"
                        className="h-8 w-8 p-0"
                      />
                      <ActionDropdown
                        item={item}
                        type="moderation"
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onDuplicate={() => {}}
                        onPublish={() => {}}
                        onArchive={() => {}}
                        onViewHistory={() => {}}
                        onApprove={handleApprove}
                        onReject={handleReject}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filteredItems?.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Shield" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No moderation items found</h3>
          <p className="text-muted-foreground">
            {searchTerm || typeFilter !== 'all' || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria' : 'All content is currently compliant with community guidelines'}
          </p>
        </div>
      )}
      <ContentDetailsModal
        isOpen={detailsModal?.isOpen}
        onClose={() => setDetailsModal({ isOpen: false, item: null })}
        item={detailsModal?.item}
        type="moderation"
      />
    </div>
  );
};

export default ModerationTab;