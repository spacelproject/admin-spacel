import React, { useState, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';

const ContentEditor = ({ item, type, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: item?.title || '',
    content: item?.content || '',
    status: item?.status || 'draft',
    audience: item?.audience || 'all_users',
    scheduledDate: item?.scheduledDate ? new Date(item.scheduledDate).toISOString().slice(0, 16) : '',
    tags: item?.tags || [],
    seoTitle: item?.metadata?.seoTitle || '',
    seoDescription: item?.metadata?.seoDescription || '',
    enableNotifications: item?.metadata?.enableNotifications || false,
    category: item?.category || 'user_guide',
    priority: item?.priority || 'medium'
  });

  const [activeTab, setActiveTab] = useState('content');
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const textareaRef = useRef(null);

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'archived', label: 'Archived' }
  ];

  const audienceOptions = [
    { value: 'all_users', label: 'All Users' },
    { value: 'seekers_only', label: 'Seekers Only' },
    { value: 'partners_only', label: 'Partners Only' }
  ];

  const categoryOptions = [
    { value: 'user_guide', label: 'User Guide' },
    { value: 'host_guide', label: 'Host Guide' },
    { value: 'guest_guide', label: 'Guest Guide' },
    { value: 'policies', label: 'Policies' },
    { value: 'technical', label: 'Technical' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    // Basic validation
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }
    
    if (!formData.content.trim()) {
      alert('Please enter content');
      return;
    }
    
    if (formData.status === 'scheduled' && !formData.scheduledDate) {
      alert('Please select a scheduled date');
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const insertFormatting = (format) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.content.substring(start, end);
    
    let newText = '';
    switch (format) {
      case 'bold':
        newText = `**${selectedText}**`;
        break;
      case 'italic':
        newText = `*${selectedText}*`;
        break;
      case 'heading':
        newText = `## ${selectedText}`;
        break;
      case 'list':
        newText = `- ${selectedText}`;
        break;
      case 'link':
        newText = `[${selectedText}](url)`;
        break;
      default:
        newText = selectedText;
    }

    const newContent = formData.content.substring(0, start) + newText + formData.content.substring(end);
    handleInputChange('content', newContent);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + newText.length, start + newText.length);
    }, 0);
  };

  const tabs = [
    { id: 'content', label: 'Content', icon: 'FileText' },
    { id: 'settings', label: 'Settings', icon: 'Settings' },
    { id: 'seo', label: 'SEO', icon: 'Search' }
  ];

  const getEditorTitle = () => {
    const typeLabels = {
      announcement: 'Announcement',
      documentation: 'Documentation',
      legal: 'Legal Page'
    };
    return `${item ? 'Edit' : 'Create'} ${typeLabels[type] || 'Content'}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-modal flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{getEditorTitle()}</h2>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
              iconName={showPreview ? "Edit" : "Eye"}
              iconPosition="left"
            >
              {showPreview ? 'Edit' : 'Preview'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : `Save ${type === 'announcement' ? 'Announcement' : type === 'documentation' ? 'Article' : 'Page'}`}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex space-x-8 px-6" aria-label="Content editor tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-smooth
                  ${activeTab === tab.id
                    ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                  }
                `}
              >
                <Icon name={tab.icon} size={16} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'content' && (
            <div className="h-full flex">
              {/* Editor */}
              <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col`}>
                <div className="p-6 border-b border-border">
                  <Input
                    label="Title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter title..."
                    required
                  />
                </div>

                {/* Formatting Toolbar */}
                <div className="flex items-center space-x-2 p-4 border-b border-border bg-muted/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting('bold')}
                    iconName="Bold"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting('italic')}
                    iconName="Italic"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting('heading')}
                    iconName="Heading"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting('list')}
                    iconName="List"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => insertFormatting('link')}
                    iconName="Link"
                  />
                  <div className="h-6 w-px bg-border mx-2" />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="Image"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="Paperclip"
                  />
                </div>

                {/* Text Editor */}
                <div className="flex-1 p-6 min-h-[500px]">
                  <textarea
                    ref={textareaRef}
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    placeholder="Start writing your content..."
                    className="w-full h-full min-h-[450px] resize-none border-0 outline-none bg-transparent text-foreground placeholder-muted-foreground text-sm leading-relaxed"
                    style={{ minHeight: '450px' }}
                  />
                </div>
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="w-1/2 border-l border-border">
                  <div className="p-6 h-full overflow-y-auto">
                    <h1 className="text-2xl font-bold text-foreground mb-4">{formData.title}</h1>
                    <div className="prose prose-sm max-w-none text-foreground">
                      {formData.content.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-4">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Status"
                  options={statusOptions}
                  value={formData.status}
                  onChange={(value) => handleInputChange('status', value)}
                />

                {type === 'announcement' && (
                  <Select
                    label="Target Audience"
                    options={audienceOptions}
                    value={formData.audience}
                    onChange={(value) => handleInputChange('audience', value)}
                  />
                )}

                {type === 'announcement' && (
                  <Select
                    label="Priority"
                    options={priorityOptions}
                    value={formData.priority}
                    onChange={(value) => handleInputChange('priority', value)}
                  />
                )}

                {type === 'documentation' && (
                  <Select
                    label="Category"
                    options={categoryOptions}
                    value={formData.category}
                    onChange={(value) => handleInputChange('category', value)}
                  />
                )}

                {formData.status === 'scheduled' && (
                  <Input
                    label="Scheduled Date"
                    type="datetime-local"
                    value={formData.scheduledDate}
                    onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                  />
                )}
              </div>

              {type === 'announcement' && (
                <div className="space-y-4">
                  <Checkbox
                    label="Send push notifications"
                    description="Notify users when this announcement is published"
                    checked={formData.enableNotifications}
                    onChange={(e) => handleInputChange('enableNotifications', e.target.checked)}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Tags
                </label>
                <div className="space-y-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTagInput(value);
                      
                      // If user types a comma, add the tag before the comma
                      if (value.endsWith(',')) {
                        const newTag = value.slice(0, -1).trim();
                        if (newTag && !formData.tags.includes(newTag)) {
                          handleInputChange('tags', [...formData.tags, newTag]);
                          setTagInput('');
                        } else {
                          setTagInput('');
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      // Allow Enter to add a tag
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const newTag = tagInput.trim();
                        if (newTag && !formData.tags.includes(newTag)) {
                          handleInputChange('tags', [...formData.tags, newTag]);
                          setTagInput('');
                        }
                      }
                    }}
                    onBlur={() => {
                      // Add tag when input loses focus
                      const newTag = tagInput.trim();
                      if (newTag && !formData.tags.includes(newTag)) {
                        handleInputChange('tags', [...formData.tags, newTag]);
                        setTagInput('');
                      } else {
                        setTagInput('');
                      }
                    }}
                    placeholder="Type a tag and press Enter or comma"
                    description="Tags help users find your content"
                  />
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = formData.tags.filter((_, i) => i !== index);
                              handleInputChange('tags', newTags);
                            }}
                            className="ml-1.5 hover:text-destructive transition-colors"
                          >
                            <Icon name="X" size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Type a tag and press Enter or comma to add it. Click the X on a tag to remove it.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              <Input
                label="SEO Title"
                value={formData.seoTitle}
                onChange={(e) => handleInputChange('seoTitle', e.target.value)}
                placeholder="Enter SEO title..."
                description="Recommended length: 50-60 characters"
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  SEO Description
                </label>
                <textarea
                  value={formData.seoDescription}
                  onChange={(e) => handleInputChange('seoDescription', e.target.value)}
                  placeholder="Enter SEO description..."
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended length: 150-160 characters
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-medium text-foreground mb-2">Search Preview</h3>
                <div className="space-y-1">
                  <div className="text-lg text-primary hover:underline cursor-pointer">
                    {formData.seoTitle || formData.title || 'Page Title'}
                  </div>
                  <div className="text-sm text-success">
                    https://spacel.com/{type}/{formData.title.toLowerCase().replace(/\s+/g, '-')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formData.seoDescription || formData.content.substring(0, 160) + '...'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentEditor;