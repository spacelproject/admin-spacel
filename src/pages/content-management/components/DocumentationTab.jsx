import React, { useState, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import ContentEditor from './ContentEditor';
import ContentDetailsModal from './ContentDetailsModal';
import ActionDropdown from './ActionDropdown';
import useDocumentation from '../../../hooks/useDocumentation';
import LoadingState from '../../../components/ui/LoadingState';

const DocumentationTab = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [expandedSections, setExpandedSections] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, item: null });

  // Use real data from database
  const {
    documentation: docsData,
    loading,
    error,
    createDocumentation,
    updateDocumentation,
    deleteDocumentation,
    publishDocumentation,
    getHierarchicalDocumentation
  } = useDocumentation();

  // Transform documentation into hierarchical structure
  const documentation = useMemo(() => {
    if (!docsData || docsData.length === 0) return [];
    
    // Group by category/section
    const sectionsMap = {};
    const categories = ['getting-started', 'host-guide', 'guest-guide', 'policies'];
    
    categories.forEach(cat => {
      sectionsMap[cat] = {
        id: cat,
        title: cat === 'getting-started' ? 'Getting Started' :
              cat === 'host-guide' ? 'Host Guide' :
              cat === 'guest-guide' ? 'Guest Guide' :
              'Policies & Guidelines',
        type: 'section',
        children: []
      };
    });

    // Add documents to their sections
    docsData.forEach(doc => {
      const sectionId = doc.category === 'user_guide' ? 'getting-started' :
                        doc.category === 'host_guide' ? 'host-guide' :
                        doc.category === 'guest_guide' ? 'guest-guide' :
                        doc.category === 'policies' ? 'policies' : 'getting-started';
      
      if (sectionsMap[sectionId]) {
        sectionsMap[sectionId].children.push({
          ...doc,
          views: doc.viewCount || 0,
          version: doc.metadata?.version || '1.0',
          lastUpdated: doc.lastUpdated || doc.updatedAt
        });
      }
    });

    // Filter out empty sections and expand first section by default
    const sections = Object.values(sectionsMap).filter(s => s.children.length > 0);
    if (sections.length > 0 && expandedSections.length === 0) {
      setExpandedSections([sections[0].id]);
    }

    return sections;
  }, [docsData, expandedSections]);

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

  const handlePublish = async (item) => {
    try {
      await publishDocumentation(item.id);
    } catch (error) {
      console.error('Error publishing documentation:', error);
    }
  };

  const handleArchive = async (item) => {
    try {
      await updateDocumentation(item.id, { status: 'archived' });
    } catch (error) {
      console.error('Error archiving documentation:', error);
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item?.title}"?`)) {
      try {
        await deleteDocumentation(item.id);
      } catch (error) {
        console.error('Error deleting documentation:', error);
      }
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
      return [...acc, ...(section?.children || [])];
    }, []);
  };

  const filteredDocuments = getAllDocuments()?.filter(item => {
    const matchesSearch = item?.title?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
                         item?.author?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item?.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Show loading state
  if (loading) {
    return (
      <div className="p-6">
        <LoadingState message="Fetching documentation..." />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Icon name="AlertCircle" size={48} className="text-error mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Documentation</h3>
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
        type="documentation"
        onClose={() => {
          setShowEditor(false);
          setEditingItem(null);
        }}
        onSave={async (data) => {
          try {
            console.log('Saving documentation:', data);
            
            if (editingItem) {
              // Update existing documentation
              await updateDocumentation(editingItem.id, {
                title: data.title,
                content: data.content,
                status: data.status,
                category: data.category || 'user_guide',
                tags: data.tags || [],
                metadata: {
                  seoTitle: data.seoTitle,
                  seoDescription: data.seoDescription,
                  enableNotifications: data.enableNotifications,
                  version: editingItem.metadata?.version || '1.0'
                }
              });
            } else {
              // Create new documentation
              await createDocumentation({
                title: data.title,
                content: data.content,
                status: data.status,
                category: data.category || 'user_guide',
                tags: data.tags || [],
                metadata: {
                  seoTitle: data.seoTitle,
                  seoDescription: data.seoDescription,
                  enableNotifications: data.enableNotifications,
                  version: '1.0'
                }
              });
            }
            
            setShowEditor(false);
            setEditingItem(null);
          } catch (error) {
            console.error('Error saving documentation:', error);
            alert(`Error saving documentation: ${error.message || 'Unknown error'}`);
          }
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