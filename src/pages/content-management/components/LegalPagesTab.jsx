import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import ContentEditor from './ContentEditor';
import ContentDetailsModal from './ContentDetailsModal';
import ActionDropdown from './ActionDropdown';
import useLegalPages from '../../../hooks/useLegalPages';

const LegalPagesTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, item: null });

  // Use real data from database
  const {
    legalPages: legalPagesData,
    loading,
    error,
    createLegalPage,
    updateLegalPage,
    deleteLegalPage,
    publishLegalPage
  } = useLegalPages();

  // Transform legal pages data to match component expectations
  const legalPages = useMemo(() => {
    if (!legalPagesData || legalPagesData.length === 0) return [];
    
    return legalPagesData.map(page => ({
      id: page.id,
      title: page.title,
      slug: page.slug || page.title.toLowerCase().replace(/\s+/g, '-'),
      status: page.status,
      lastUpdated: page.lastUpdated || page.updatedAt,
      author: page.author || 'Legal Team',
      version: page.version || '1.0',
      effectiveDate: page.effectiveDate || page.updatedAt,
      content: page.content,
      pageType: page.pageType || 'legal'
    }));
  }, [legalPagesData]);

  const filteredPages = legalPages?.filter(page => 
    page?.title?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
    page?.author?.toLowerCase()?.includes(searchTerm?.toLowerCase())
  );

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setShowEditor(true);
  };

  const handleViewDetails = (item) => {
    setDetailsModal({ isOpen: true, item });
  };

  const handleDuplicate = (item) => {
    console.log('Duplicating legal page:', item?.id);
    const duplicatedItem = {
      ...item,
      id: Date.now(),
      title: `${item?.title} (Copy)`,
      slug: `${item?.slug}-copy`,
      status: 'draft',
      effectiveDate: null
    };
    setEditingItem(duplicatedItem);
    setShowEditor(true);
  };

  const handlePublish = async (item) => {
    try {
      await publishLegalPage(item.id);
    } catch (error) {
      console.error('Error publishing legal page:', error);
    }
  };

  const handleArchive = async (item) => {
    try {
      await updateLegalPage(item.id, { status: 'archived' });
    } catch (error) {
      console.error('Error archiving legal page:', error);
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item?.title}"?`)) {
      try {
        await deleteLegalPage(item.id);
      } catch (error) {
        console.error('Error deleting legal page:', error);
      }
    }
  };

  const handleViewHistory = (item) => {
    console.log('Viewing history for legal page:', item?.id);
  };

  const handlePreview = (item) => {
    console.log('Previewing legal page:', item?.id);
    window.open(`/legal/${item?.slug}`, '_blank');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      published: { color: 'bg-success/10 text-success', label: 'Published' },
      draft: { color: 'bg-muted text-muted-foreground', label: 'Draft' },
      review: { color: 'bg-warning/10 text-warning', label: 'Under Review' }
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
    if (dateString instanceof Date) {
      return dateString.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-6 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-10 w-40 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6">
              <div className="h-6 w-32 bg-muted animate-pulse rounded mb-4" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted animate-pulse rounded" />
                <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Icon name="AlertCircle" size={48} className="text-error mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Legal Pages</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (showEditor) {
    return (
      <ContentEditor
        item={editingItem}
        type="legal"
        onClose={() => {
          setShowEditor(false);
          setEditingItem(null);
        }}
        onSave={async (data) => {
          try {
            console.log('Saving legal page:', data);
            
            // Generate slug from title if not provided
            const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            
            if (editingItem) {
              // Update existing legal page
              await updateLegalPage(editingItem.id, {
                title: data.title,
                content: data.content,
                status: data.status,
                slug: slug,
                version: editingItem.version || '1.0',
                effectiveDate: data.effectiveDate ? new Date(data.effectiveDate).toISOString() : null,
                pageType: editingItem.pageType || 'legal',
                metadata: {
                  seoTitle: data.seoTitle,
                  seoDescription: data.seoDescription,
                  enableNotifications: data.enableNotifications
                }
              });
            } else {
              // Create new legal page
              await createLegalPage({
                title: data.title,
                content: data.content,
                status: data.status,
                slug: slug,
                version: '1.0',
                effectiveDate: data.effectiveDate ? new Date(data.effectiveDate).toISOString() : null,
                pageType: 'legal',
                metadata: {
                  seoTitle: data.seoTitle,
                  seoDescription: data.seoDescription,
                  enableNotifications: data.enableNotifications
                }
              });
            }
            
            setShowEditor(false);
            setEditingItem(null);
          } catch (error) {
            console.error('Error saving legal page:', error);
            alert(`Error saving legal page: ${error.message || 'Unknown error'}`);
          }
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Legal Pages</h2>
          <p className="text-sm text-muted-foreground">
            Manage terms, policies, and legal documentation
          </p>
        </div>
        <Button onClick={handleCreate} iconName="Plus" iconPosition="left">
          Create Legal Page
        </Button>
      </div>
      <div className="max-w-md">
        <Input
          type="search"
          placeholder="Search legal pages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e?.target?.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPages?.map((page) => (
          <div key={page?.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-card transition-smooth">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-2">{page?.title}</h3>
                {getStatusBadge(page?.status)}
              </div>
              <ActionDropdown
                item={page}
                type="legal"
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onPublish={handlePublish}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onViewHistory={handleViewHistory}
                onApprove={() => console.log('Approving legal page:', page?.id)}
                onReject={() => console.log('Rejecting legal page:', page?.id)}
                position="left"
              />
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-medium text-foreground">v{page?.version}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Last Updated:</span>
                <span className="text-foreground">{formatDate(page?.lastUpdated)}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Effective Date:</span>
                <span className="text-foreground">{formatDate(page?.effectiveDate)}</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Author:</span>
                <span className="text-foreground">{page?.author}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
              {page?.content?.split('\n')?.[0]}
            </p>

            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(page)}
              >
                Edit Page
              </Button>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewDetails(page)}
                  iconName="Eye"
                  className="h-8 w-8 p-0"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePreview(page)}
                  iconName="ExternalLink"
                  className="h-8 w-8 p-0"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {filteredPages?.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Scale" size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No legal pages found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm 
              ? 'Try adjusting your search criteria' : 'Create your first legal page to get started'
            }
          </p>
          {!searchTerm && (
            <Button onClick={handleCreate} iconName="Plus" iconPosition="left">
              Create Legal Page
            </Button>
          )}
        </div>
      )}
      <ContentDetailsModal
        isOpen={detailsModal?.isOpen}
        onClose={() => setDetailsModal({ isOpen: false, item: null })}
        item={detailsModal?.item}
        type="legal"
      />
    </div>
  );
};

export default LegalPagesTab;