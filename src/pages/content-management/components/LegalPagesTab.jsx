import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import ContentEditor from './ContentEditor';
import ContentDetailsModal from './ContentDetailsModal';
import ActionDropdown from './ActionDropdown';

const LegalPagesTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, item: null });

  const legalPages = [
    {
      id: 1,
      title: 'Terms of Service',
      slug: 'terms-of-service',
      status: 'published',
      lastUpdated: '2025-01-10T10:00:00Z',
      author: 'Legal Team',
      version: '3.2',
      effectiveDate: '2025-01-01T00:00:00Z',
      content: `These Terms of Service govern your use of the SPACIO platform and services.\n\nBy accessing or using our platform, you agree to be bound by these terms.\n\nKey sections include:\n- User responsibilities\n- Platform usage guidelines\n- Payment terms\n- Liability limitations\n- Dispute resolution procedures`
    },
    {
      id: 2,
      title: 'Privacy Policy',
      slug: 'privacy-policy',
      status: 'published',
      lastUpdated: '2025-01-08T14:30:00Z',
      author: 'Legal Team',
      version: '2.8',
      effectiveDate: '2025-01-01T00:00:00Z',
      content: `This Privacy Policy describes how SPACIO collects, uses, and protects your personal information.\n\nWe are committed to protecting your privacy and ensuring transparency in our data practices.\n\nCovered topics:\n- Information we collect\n- How we use your data\n- Data sharing practices\n- Your privacy rights\n- Security measures`
    },
    {
      id: 3,
      title: 'Cookie Policy',
      slug: 'cookie-policy',
      status: 'published',
      lastUpdated: '2025-01-05T09:15:00Z',
      author: 'Legal Team',
      version: '1.5',
      effectiveDate: '2025-01-01T00:00:00Z',
      content: `This Cookie Policy explains how SPACIO uses cookies and similar technologies.\n\nCookies help us provide you with a better user experience and improve our services.\n\nTypes of cookies we use:\n- Essential cookies\n- Performance cookies\n- Functionality cookies\n- Marketing cookies`
    },
    {
      id: 4,
      title: 'Host Agreement',
      slug: 'host-agreement',
      status: 'draft',
      lastUpdated: '2025-01-15T11:45:00Z',
      author: 'Legal Team',
      version: '4.0',
      effectiveDate: null,
      content: `The Host Agreement outlines the terms and conditions for listing spaces on SPACIO.\n\nThis agreement covers:\n- Host responsibilities\n- Listing requirements\n- Commission structure\n- Cancellation policies\n- Insurance and liability\n- Quality standards`
    },
    {
      id: 5,
      title: 'Guest Terms',
      slug: 'guest-terms',
      status: 'published',
      lastUpdated: '2025-01-12T16:20:00Z',
      author: 'Legal Team',
      version: '2.1',
      effectiveDate: '2025-01-01T00:00:00Z',
      content: `Guest Terms define the rules and expectations for booking and using spaces through SPACIO.\n\nImportant guidelines:\n- Booking procedures\n- Payment obligations\n- Cancellation rights\n- Property care requirements\n- Dispute resolution`
    },
    {
      id: 6,
      title: 'Community Standards',
      slug: 'community-standards',
      status: 'published',
      lastUpdated: '2025-01-14T13:10:00Z',
      author: 'Policy Team',
      version: '1.3',
      effectiveDate: '2025-01-01T00:00:00Z',
      content: `Our Community Standards promote a safe, respectful, and inclusive environment for all SPACIO users.\n\nCore principles:\n- Respect and inclusivity\n- Safety and security\n- Honest communication\n- Property respect\n- Fair treatment`
    },
    {
      id: 7,
      title: 'Refund Policy',
      slug: 'refund-policy',
      status: 'review',
      lastUpdated: '2025-01-16T08:30:00Z',
      author: 'Legal Team',
      version: '2.5',
      effectiveDate: null,
      content: `This Refund Policy outlines the conditions and procedures for booking refunds on SPACIO.\n\nRefund categories:\n- Full refunds\n- Partial refunds\n- No refund situations\n- Processing timeframes\n- Dispute procedures`
    },
    {
      id: 8,
      title: 'Intellectual Property Policy',
      slug: 'intellectual-property',
      status: 'published',
      lastUpdated: '2025-01-09T12:00:00Z',
      author: 'Legal Team',
      version: '1.8',
      effectiveDate: '2025-01-01T00:00:00Z',
      content: `Our Intellectual Property Policy protects the rights of content creators and platform users.\n\nKey areas:\n- Copyright protection\n- Trademark usage\n- User-generated content\n- DMCA procedures\n- Infringement reporting`
    }
  ];

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

  const handlePublish = (item) => {
    console.log('Publishing legal page:', item?.id);
  };

  const handleArchive = (item) => {
    console.log('Archiving legal page:', item?.id);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete "${item?.title}"?`)) {
      console.log('Deleting legal page:', item?.id);
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
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (showEditor) {
    return (
      <ContentEditor
        item={editingItem}
        type="legal"
        onClose={() => setShowEditor(false)}
        onSave={(data) => {
          console.log('Saving legal page:', data);
          setShowEditor(false);
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