import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import ContentEditor from './ContentEditor';
import ContentDetailsModal from './ContentDetailsModal';
import ActionDropdown from './ActionDropdown';

const DocumentationTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedSections, setExpandedSections] = useState(['getting-started']);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, item: null });

  const documentation = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      type: 'section',
      children: [
        {
          id: 1,
          title: 'How to Create an Account',
          category: 'user_guide',
          status: 'published',
          lastUpdated: '2025-01-15T10:00:00Z',
          author: 'Support Team',
          views: 2450,
          version: '2.1',
          content: `Welcome to SPACIO! Creating an account is quick and easy.\n\nFollow these simple steps to get started:\n1. Click the "Sign Up" button\n2. Enter your email and password\n3. Verify your email address\n4. Complete your profile`
        },
        {
          id: 2,
          title: 'Platform Overview',
          category: 'user_guide',
          status: 'published',
          lastUpdated: '2025-01-12T14:30:00Z',
          author: 'Product Team',
          views: 1890,
          version: '1.5',
          content: `SPACIO is a comprehensive space booking platform that connects hosts with guests looking for unique spaces.\n\nKey features include:\n- Easy space discovery\n- Secure booking system\n- Integrated messaging\n- Payment processing`
        }
      ]
    },
    {
      id: 'host-guide',
      title: 'Host Guide',
      type: 'section',
      children: [
        {
          id: 3,
          title: 'Listing Your Space',
          category: 'host_guide',
          status: 'published',
          lastUpdated: '2025-01-14T09:15:00Z',
          author: 'Host Success Team',
          views: 3200,
          version: '3.0',
          content: `Learn how to create compelling space listings that attract guests.\n\nThis comprehensive guide covers:\n- Photography best practices\n- Writing effective descriptions\n- Setting competitive pricing\n- Managing availability`
        },
        {
          id: 4,
          title: 'Managing Bookings',
          category: 'host_guide',
          status: 'draft',
          lastUpdated: '2025-01-16T11:45:00Z',
          author: 'Host Success Team',
          views: 0,
          version: '1.0',
          content: `Efficiently manage your bookings and provide excellent guest experiences.\n\nTopics covered:\n- Accepting and declining requests\n- Communication with guests\n- Check-in procedures\n- Handling cancellations`
        }
      ]
    },
    {
      id: 'guest-guide',
      title: 'Guest Guide',
      type: 'section',
      children: [
        {
          id: 5,
          title: 'Finding the Perfect Space',
          category: 'guest_guide',
          status: 'published',
          lastUpdated: '2025-01-13T16:20:00Z',
          author: 'Customer Success Team',
          views: 1650,
          version: '2.3',
          content: `Discover how to find and book the perfect space for your needs.\n\nSearch tips:\n- Use filters effectively\n- Read reviews carefully\n- Check location and amenities\n- Compare pricing options`
        },
        {
          id: 6,
          title: 'Booking Process',
          category: 'guest_guide',
          status: 'published',
          lastUpdated: '2025-01-11T13:10:00Z',
          author: 'Customer Success Team',
          views: 2100,
          version: '1.8',
          content: `Step-by-step guide to booking your space.\n\nBooking steps:\n1. Select your dates\n2. Review space details\n3. Send booking request\n4. Complete payment\n5. Receive confirmation`
        }
      ]
    },
    {
      id: 'policies',
      title: 'Policies & Guidelines',
      type: 'section',
      children: [
        {
          id: 7,
          title: 'Community Guidelines',
          category: 'policies',
          status: 'published',
          lastUpdated: '2025-01-10T08:30:00Z',
          author: 'Legal Team',
          views: 980,
          version: '4.2',
          content: `Our community guidelines ensure a safe and respectful environment for all users.\n\nKey principles:\n- Respect for all community members\n- Honest and accurate listings\n- Prompt communication\n- Property care and cleanliness`
        }
      ]
    }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'user_guide', label: 'User Guide' },
    { value: 'host_guide', label: 'Host Guide' },
    { value: 'guest_guide', label: 'Guest Guide' },
    { value: 'policies', label: 'Policies' },
    { value: 'technical', label: 'Technical' }
  ];

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => 
      prev?.includes(sectionId) 
        ? prev?.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

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
    console.log('Duplicating documentation:', item?.id);
    const duplicatedItem = {
      ...item,
      id: Date.now(),
      title: `${item?.title} (Copy)`,
      status: 'draft',
      views: 0
    };
    setEditingItem(duplicatedItem);
    setShowEditor(true);
  };

  const handlePublish = (item) => {
    console.log('Publishing documentation:', item?.id);
  };

  const handleArchive = (item) => {
    console.log('Archiving documentation:', item?.id);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete "${item?.title}"?`)) {
      console.log('Deleting documentation:', item?.id);
    }
  };

  const handleViewHistory = (item) => {
    console.log('Viewing history for documentation:', item?.id);
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
    return new Date(dateString)?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getAllDocuments = () => {
    return documentation?.reduce((acc, section) => {
      return [...acc, ...section?.children];
    }, []);
  };

  const filteredDocuments = getAllDocuments()?.filter(item => {
    const matchesSearch = item?.title?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
                         item?.author?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item?.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (showEditor) {
    return (
      <ContentEditor
        item={editingItem}
        type="documentation"
        onClose={() => setShowEditor(false)}
        onSave={(data) => {
          console.log('Saving documentation:', data);
          setShowEditor(false);
        }}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Help Documentation</h2>
          <p className="text-sm text-muted-foreground">
            Manage help articles and user guides
          </p>
        </div>
        <Button onClick={handleCreate} iconName="Plus" iconPosition="left">
          Create Article
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search documentation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e?.target?.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={categoryOptions}
            value={categoryFilter}
            onChange={setCategoryFilter}
            placeholder="Filter by category"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-4">Documentation Structure</h3>
            <div className="space-y-2">
              {documentation?.map((section) => (
                <div key={section?.id}>
                  <button
                    onClick={() => toggleSection(section?.id)}
                    className="flex items-center justify-between w-full p-2 text-left rounded-md hover:bg-muted transition-smooth"
                  >
                    <div className="flex items-center space-x-2">
                      <Icon 
                        name={expandedSections?.includes(section?.id) ? "ChevronDown" : "ChevronRight"} 
                        size={16} 
                      />
                      <span className="font-medium text-foreground">{section?.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {section?.children?.length}
                    </span>
                  </button>
                  
                  {expandedSections?.includes(section?.id) && (
                    <div className="ml-6 mt-2 space-y-1">
                      {section?.children?.map((item) => (
                        <button
                          key={item?.id}
                          onClick={() => handleEdit(item)}
                          className="flex items-center justify-between w-full p-2 text-left rounded-md hover:bg-muted/50 transition-smooth"
                        >
                          <span className="text-sm text-foreground">{item?.title}</span>
                          {getStatusBadge(item?.status)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-medium text-foreground">
                All Articles ({filteredDocuments?.length})
              </h3>
            </div>
            
            <div className="divide-y divide-border">
              {filteredDocuments?.map((item) => (
                <div key={item?.id} className="p-4 hover:bg-muted/30 transition-smooth">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-medium text-foreground">{item?.title}</h4>
                        {getStatusBadge(item?.status)}
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                        <span>by {item?.author}</span>
                        <span>•</span>
                        <span>Updated {formatDate(item?.lastUpdated)}</span>
                        <span>•</span>
                        <span>v{item?.version}</span>
                        <span>•</span>
                        <span>{item?.views?.toLocaleString()} views</span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item?.content?.split('\n')?.[0]}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
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
                        type="documentation"
                        onEdit={handleEdit}
                        onDuplicate={handleDuplicate}
                        onPublish={handlePublish}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                        onViewHistory={handleViewHistory}
                        onApprove={() => console.log('Approving documentation:', item?.id)}
                        onReject={() => console.log('Rejecting documentation:', item?.id)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {filteredDocuments?.length === 0 && (
            <div className="text-center py-12">
              <Icon name="BookOpen" size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No articles found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || categoryFilter !== 'all' ? 'Try adjusting your search or filter criteria' : 'Create your first help article to get started'}
              </p>
              {!searchTerm && categoryFilter === 'all' && (
                <Button onClick={handleCreate} iconName="Plus" iconPosition="left">
                  Create Article
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
      <ContentDetailsModal
        isOpen={detailsModal?.isOpen}
        onClose={() => setDetailsModal({ isOpen: false, item: null })}
        item={detailsModal?.item}
        type="documentation"
      />
    </div>
  );
};

export default DocumentationTab;