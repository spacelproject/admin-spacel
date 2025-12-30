import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Image from '../../../components/AppImage';
import ContentDetailsModal from './ContentDetailsModal';
import ActionDropdown from './ActionDropdown';
import useContentReports from '../../../hooks/useContentReports';
import LoadingState from '../../../components/ui/LoadingState';

const ModerationTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedItems, setSelectedItems] = useState([]);
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, item: null });

  // Use real data from database
  const {
    reports: reportsData,
    loading,
    error,
    updateReport,
    assignReport,
    resolveReport,
    dismissReport
  } = useContentReports();

  // Transform reports data to match component expectations
  const moderationItems = useMemo(() => {
    if (!reportsData || reportsData.length === 0) return [];
    
    return reportsData.map(report => ({
      id: report.id,
      type: report.reportedItemType || 'listing', // listing, review, message, profile
      title: report.metadata?.title || `Report #${report.id.slice(0, 8)}`,
      reporter: report.reporter || 'Anonymous',
      reportReason: report.reportReason || 'Other',
      status: report.status === 'resolved' ? 'approved' : 
              report.status === 'dismissed' ? 'rejected' : 
              report.status, // pending, under_review, approved, rejected
      priority: report.priority || 'medium',
      submittedDate: report.createdAt || new Date(),
      content: report.reportDescription || report.reportReason || '',
      author: report.metadata?.author || 'Unknown',
      images: report.evidenceUrls || [],
      moderatorNote: report.resolutionNotes || null,
      rating: report.metadata?.rating || null,
      conversationId: report.metadata?.conversationId || null
    }));
  }, [reportsData]);

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

  const handleBulkAction = async (action) => {
    try {
      if (action === 'approve') {
        for (const id of selectedItems) {
          await resolveReport(id, {
            action: 'approved',
            notes: 'Bulk approved by moderator'
          });
        }
      } else if (action === 'reject') {
        for (const id of selectedItems) {
          await dismissReport(id, 'Bulk rejected - does not violate guidelines');
        }
      } else if (action === 'delete') {
        if (window.confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) {
          for (const id of selectedItems) {
            await dismissReport(id, 'Bulk deleted by moderator');
          }
        }
      }
      setSelectedItems([]);
    } catch (error) {
      console.error('Error executing bulk action:', error);
    }
  };

  const handleViewDetails = (item) => {
    setDetailsModal({ isOpen: true, item });
  };

  const handleEdit = (item) => {
    console.log('Editing moderation item:', item?.id);
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

  const handleModerationAction = async (itemId, action) => {
    try {
      if (action === 'approve') {
        await resolveReport(itemId, {
          action: 'approved',
          notes: 'Content approved by moderator'
        });
      } else if (action === 'reject') {
        await dismissReport(itemId, 'Content rejected - does not violate guidelines');
      }
    } catch (error) {
      console.error(`Error ${action}ing item:`, error);
    }
  };

  const handleApprove = async (item) => {
    try {
      await resolveReport(item.id, {
        action: 'approved',
        notes: 'Content approved by moderator'
      });
    } catch (error) {
      console.error('Error approving item:', error);
    }
  };

  const handleReject = async (item) => {
    try {
      await dismissReport(item.id, 'Content rejected - does not violate guidelines');
    } catch (error) {
      console.error('Error rejecting item:', error);
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete this ${item?.type}?`)) {
      try {
        await dismissReport(item.id, 'Report deleted by moderator');
      } catch (error) {
        console.error('Error deleting moderation item:', error);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    if (dateString instanceof Date) {
      return dateString.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Fetching content reports..." />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Icon name="AlertCircle" size={48} className="text-error mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Moderation Reports</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

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