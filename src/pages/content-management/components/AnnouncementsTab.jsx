import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import ContentEditor from './ContentEditor';
import ContentDetailsModal from './ContentDetailsModal';
import ActionDropdown from './ActionDropdown';

const AnnouncementsTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, item: null });

  const announcements = [
    {
      id: 1,
      title: "Platform Maintenance Scheduled",
      status: "published",
      audience: "all_users",
      publishDate: "2025-01-15T10:00:00Z",
      scheduledDate: "2025-01-20T02:00:00Z",
      author: "Admin Team",
      views: 1250,
      content: `We will be performing scheduled maintenance on our platform to improve performance and add new features.\n\nDuring this time, the platform will be temporarily unavailable. We apologize for any inconvenience.`
    },
    {
      id: 2,
      title: "New Host Verification Process",
      status: "draft",
      audience: "hosts_only",
      publishDate: null,
      scheduledDate: "2025-01-25T09:00:00Z",
      author: "Policy Team",
      views: 0,
      content: `We're introducing enhanced verification requirements for all hosts to ensure platform safety and quality.\n\nThis new process will include identity verification and property documentation.`
    },
    {
      id: 3,
      title: "Holiday Booking Surge Notice",
      status: "scheduled",
      audience: "guests_only",
      publishDate: null,
      scheduledDate: "2025-02-01T08:00:00Z",
      author: "Marketing Team",
      views: 0,
      content: `Due to increased demand during holiday season, we recommend booking your spaces early to secure availability.\n\nSpecial holiday rates may apply during peak periods.`
    },
    {
      id: 4,
      title: "Commission Structure Update",
      status: "published",
      audience: "hosts_only",
      publishDate: "2025-01-10T14:30:00Z",
      scheduledDate: null,
      author: "Finance Team",
      views: 890,
      content: `We're updating our commission structure to better support our host community while maintaining platform sustainability.\n\nThe new rates will take effect from February 1st, 2025.`
    }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'archived', label: 'Archived' }
  ];

  const audienceOptions = [
    { value: 'all_users', label: 'All Users' },
    { value: 'hosts_only', label: 'Hosts Only' },
    { value: 'guests_only', label: 'Guests Only' }
  ];

  const filteredAnnouncements = announcements?.filter(item => {
    const matchesSearch = item?.title?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
                         item?.author?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item?.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedItems(filteredAnnouncements?.map(item => item?.id));
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

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowEditor(true);
  };

  const handleBulkAction = (action) => {
    console.log(`Bulk ${action} for items:`, selectedItems);
    setSelectedItems([]);
  };

  const handleViewDetails = (item) => {
    setDetailsModal({ isOpen: true, item });
  };

  const handleDuplicate = (item) => {
    console.log('Duplicating announcement:', item?.id);
    // Create a copy with new ID and draft status
    const duplicatedItem = {
      ...item,
      id: Date.now(),
      title: `${item?.title} (Copy)`,
      status: 'draft',
      publishDate: null,
      views: 0
    };
    setEditingItem(duplicatedItem);
    setShowEditor(true);
  };

  const handlePublish = (item) => {
    console.log('Publishing announcement:', item?.id);
    // Update item status to published
  };

  const handleArchive = (item) => {
    console.log('Archiving announcement:', item?.id);
    // Update item status to archived
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete "${item?.title}"?`)) {
      console.log('Deleting announcement:', item?.id);
      // Remove item from list
    }
  };

  const handleViewHistory = (item) => {
    console.log('Viewing history for announcement:', item?.id);
    // Open history modal or navigate to history page
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      published: { color: 'bg-success/10 text-success', label: 'Published' },
      draft: { color: 'bg-muted text-muted-foreground', label: 'Draft' },
      scheduled: { color: 'bg-warning/10 text-warning', label: 'Scheduled' },
      archived: { color: 'bg-destructive/10 text-destructive', label: 'Archived' }
    };

    const config = statusConfig?.[status] || statusConfig?.draft;
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (showEditor) {
    return (
      <ContentEditor
        item={editingItem}
        type="announcement"
        onClose={() => setShowEditor(false)}
        onSave={(data) => {
          console.log('Saving announcement:', data);
          setShowEditor(false);
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Platform Announcements</h2>
          <p className="text-sm text-muted-foreground">
            Manage platform-wide announcements and notifications
          </p>
        </div>
        <Button onClick={handleCreate} iconName="Plus" iconPosition="left">
          Create Announcement
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search announcements..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e?.target?.value)}
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
              onClick={() => handleBulkAction('publish')}
            >
              Publish
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('archive')}
            >
              Archive
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
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-12 p-4">
                  <input
                    type="checkbox"
                    checked={selectedItems?.length === filteredAnnouncements?.length && filteredAnnouncements?.length > 0}
                    onChange={(e) => handleSelectAll(e?.target?.checked)}
                    className="rounded border-border"
                  />
                </th>
                <th className="text-left p-4 font-medium text-foreground">Title</th>
                <th className="text-left p-4 font-medium text-foreground">Status</th>
                <th className="text-left p-4 font-medium text-foreground">Audience</th>
                <th className="text-left p-4 font-medium text-foreground">Published</th>
                <th className="text-left p-4 font-medium text-foreground">Scheduled</th>
                <th className="text-left p-4 font-medium text-foreground">Views</th>
                <th className="text-left p-4 font-medium text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredAnnouncements?.map((item) => (
                <tr key={item?.id} className="hover:bg-muted/30 transition-smooth">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedItems?.includes(item?.id)}
                      onChange={(e) => handleSelectItem(item?.id, e?.target?.checked)}
                      className="rounded border-border"
                    />
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-foreground">{item?.title}</p>
                      <p className="text-sm text-muted-foreground">by {item?.author}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(item?.status)}
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-foreground">
                      {audienceOptions?.find(opt => opt?.value === item?.audience)?.label}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(item?.publishDate)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(item?.scheduledDate)}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-foreground">{item?.views?.toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(item)}
                        iconName="Edit"
                        className="h-8 w-8 p-0"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(item)}
                        iconName="Eye"
                        className="h-8 w-8 p-0"
                      />
                      <ActionDropdown
                        item={item}
                        type="announcement"
                        onEdit={handleEdit}
                        onDuplicate={handleDuplicate}
                        onPublish={handlePublish}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        onViewHistory={handleViewHistory}
                        onApprove={(item) => console.log('Approving announcement:', item?.id)}
                        onReject={(item) => console.log('Rejecting announcement:', item?.id)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {filteredAnnouncements?.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Megaphone" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No announcements found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria' : 'Create your first announcement to get started'}
          </p>
          {!searchTerm && statusFilter === 'all' && (
            <Button onClick={handleCreate} iconName="Plus" iconPosition="left">
              Create Announcement
            </Button>
          )}
        </div>
      )}
      <ContentDetailsModal
        isOpen={detailsModal?.isOpen}
        onClose={() => setDetailsModal({ isOpen: false, item: null })}
        item={detailsModal?.item}
        type="announcement"
      />
    </div>
  );
};

export default AnnouncementsTab;