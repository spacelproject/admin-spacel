import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
import { useCategories } from '../../../hooks/useCategories';
import { useToast } from '../../../components/ui/Toast';
import LoadingState from '../../../components/ui/LoadingState';
import { supabase } from '../../../lib/supabase';

const CategoryManagement = () => {
  const { 
    categories, 
    loading, 
    error, 
    createMainCategory, 
    createSubCategory, 
    updateCategory, 
    deleteCategory, 
    deleteSubCategory,
    refresh 
  } = useCategories();
  
  // Debug: Log categories when they change to verify database data is loaded
  useEffect(() => {
    if (categories && categories.length > 0) {
      console.log('✅ Categories loaded from database:', categories.length, 'main categories');
      categories.forEach(cat => {
        console.log(`📋 ${cat.label}: ${cat.subCategories?.length || 0} subcategories`, cat.subCategories?.map(s => s.label) || []);
      });
    } else if (!loading && !error) {
      console.log('⚠️ No categories found in database');
    }
    if (error) {
      console.error('❌ Error loading categories:', error);
    }
  }, [categories, loading, error]);
  
  // Force refresh on mount to ensure fresh data
  useEffect(() => {
    if (refresh) {
      refresh();
    }
  }, [refresh]);
  
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMainCategory, setNewMainCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [selectedMainCategory, setSelectedMainCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Track which categories have expanded subcategories (collapsed by default)
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  const handleAddMainCategory = async () => {
    if (!newMainCategory?.trim()) return;
    
    try {
      setIsProcessing(true);
      const result = await createMainCategory(newMainCategory.trim());
      if (result?.reactivated) {
        showToast(`Category "${newMainCategory.trim()}" was reactivated successfully`, 'success');
      } else {
        showToast('Category created successfully', 'success');
      }
      setNewMainCategory('');
    } catch (err) {
      showToast(err.message || 'Failed to create category', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMainCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsProcessing(true);
      await deleteCategory(categoryId);
      showToast('Category deleted successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete category', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSubCategory = async () => {
    if (!newSubCategory?.trim() || !selectedMainCategory) return;
    
    try {
      setIsProcessing(true);
      
      // Parse multiple subcategories (comma or line separated)
      const subCategoryNames = newSubCategory
        .split(/[,\n]/)
        .map(name => name.trim())
        .filter(name => name.length > 0);
      
      if (subCategoryNames.length === 0) {
        showToast('Please enter at least one subcategory name', 'error');
        return;
      }
      
      // Create all subcategories
      const results = [];
      const errors = [];
      
      for (const subCategoryName of subCategoryNames) {
        try {
          await createSubCategory(selectedMainCategory, subCategoryName);
          results.push(subCategoryName);
        } catch (err) {
          // Extract error message properly
          const errorMessage = err?.message || err?.error?.message || err?.toString() || 'Unknown error';
          errors.push({ name: subCategoryName, error: errorMessage });
          console.error(`Failed to create subcategory "${subCategoryName}":`, err);
        }
      }
      
      // Show success/error messages
      if (results.length > 0) {
        const message = results.length === 1 
          ? `Subcategory "${results[0]}" created successfully`
          : `${results.length} subcategories created successfully`;
        showToast(message, 'success');
      }
      
      if (errors.length > 0) {
        // Show detailed error messages
        const errorDetails = errors.map(e => `"${e.name}": ${e.error}`).join('; ');
        const errorMessage = errors.length === 1
          ? `Failed to create "${errors[0].name}": ${errors[0].error}`
          : `Failed to create ${errors.length} subcategory(ies): ${errorDetails}`;
        showToast(errorMessage, 'error');
        console.error('Subcategory creation errors:', errors);
      }
      
      // Clear input if all succeeded, otherwise keep it for retry
      if (errors.length === 0) {
    setNewSubCategory('');
    setSelectedMainCategory('');
      }
    } catch (err) {
      showToast(err.message || 'Failed to create subcategories', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveSubCategory = async (categoryId, subCategoryId) => {
    if (!window.confirm('Are you sure you want to delete this subcategory? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsProcessing(true);
      await deleteSubCategory(categoryId, subCategoryId);
      showToast('Subcategory deleted successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete subcategory', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditMainCategory = async (categoryId, newName) => {
    if (!newName?.trim()) {
      setEditingCategory(null);
      return;
    }
    
    try {
      setIsProcessing(true);
      await updateCategory(categoryId, { label: newName.trim() });
      showToast('Category updated successfully', 'success');
      setEditingCategory(null);
    } catch (err) {
      showToast(err.message || 'Failed to update category', 'error');
      setEditingCategory(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCategoryExpansion = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleEditSubCategory = async (categoryId, subCategoryId, newName) => {
    if (!newName?.trim()) {
      setEditingSubCategory(null);
      return;
    }
    
    try {
      setIsProcessing(true);
      // Find the subcategory to get its dbId
      const category = categories.find(cat => cat.id === categoryId);
      const subCategory = category?.subCategories.find(sub => sub.id === subCategoryId);
      
      if (!subCategory) {
        throw new Error('Subcategory not found');
      }
      
      // Update using the subcategory's dbId directly in sub_categories table
      const { error: updateError } = await supabase
        .from('sub_categories')
        .update({ 
          name: newName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subCategory.dbId);
      
      if (updateError) throw updateError;
      
      showToast('Subcategory updated successfully', 'success');
      setEditingSubCategory(null);
      await refresh();
    } catch (err) {
      showToast(err.message || 'Failed to update subcategory', 'error');
    setEditingSubCategory(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-foreground">Category Management</h3>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={refresh}
            iconName="RefreshCw"
            disabled={loading || isProcessing}
            size="sm"
          >
            Refresh
          </Button>
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
          iconPosition="right"
        >
          {isExpanded ? 'Hide' : 'Manage Categories'}
        </Button>
      </div>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">
            {error.message || 'Error loading categories. Please check if the main_categories, sub_categories, and main_category_sub_categories tables exist.'}
          </p>
        </div>
      )}
      
      {isExpanded && (
        <div className="space-y-6">
          {loading && !categories.length ? (
            <LoadingState message="Loading categories from database..." />
          ) : error ? (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive font-medium mb-2">Error loading categories</p>
              <p className="text-xs text-destructive/80 mb-3">{error.message}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                iconName="RefreshCw"
              >
                Retry Loading
              </Button>
            </div>
          ) : (
            <>
          {/* Add Main Category */}
          <div className="border-b border-border pb-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Add Main Category</h4>
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Enter category name..."
                value={newMainCategory}
                onChange={(e) => setNewMainCategory(e?.target?.value)}
                className="flex-1"
                onKeyPress={(e) => e?.key === 'Enter' && handleAddMainCategory()}
              />
              <Button
                onClick={handleAddMainCategory}
                disabled={!newMainCategory?.trim() || isProcessing || loading}
                iconName="Plus"
                iconPosition="left"
              >
                {isProcessing ? 'Adding...' : 'Add Category'}
              </Button>
            </div>
          </div>

          {/* Add SubCategory */}
          <div className="border-b border-border pb-4">
            <h4 className="text-sm font-medium text-foreground mb-3">Add SubCategory</h4>
            <div className="flex gap-3 mb-3">
              <select
                value={selectedMainCategory}
                onChange={(e) => setSelectedMainCategory(e?.target?.value)}
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="">Select main category...</option>
                {categories?.map(cat => (
                  <option key={cat?.id} value={cat?.id}>{cat?.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <textarea
                placeholder="Enter subcategory names (one per line or comma-separated)&#10;Example:&#10;Meeting Room&#10;Conference Room&#10;Private Office&#10;&#10;Or: Meeting Room, Conference Room, Private Office"
                value={newSubCategory}
                onChange={(e) => setNewSubCategory(e?.target?.value)}
                className="flex-1 w-full px-3 py-2 border border-border rounded-md bg-background text-foreground resize-y min-h-[100px] font-mono text-sm"
                disabled={!selectedMainCategory || isProcessing}
                rows={4}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {newSubCategory.split(/[,\n]/).filter(n => n.trim().length > 0).length > 0 
                    ? `${newSubCategory.split(/[,\n]/).filter(n => n.trim().length > 0).length} subcategory(ies) will be added`
                    : 'Enter one or more subcategory names, separated by commas or new lines'}
                </p>
              <Button
                onClick={handleAddSubCategory}
                  disabled={!newSubCategory?.trim() || !selectedMainCategory || isProcessing || loading}
                iconName="Plus"
                iconPosition="left"
              >
                  {isProcessing ? 'Adding...' : 'Add SubCategory(ies)'}
              </Button>
              </div>
            </div>
          </div>

          {/* Categories List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">Current Categories</h4>
              <div className="flex items-center gap-2">
                {loading && (
                  <span className="text-xs text-muted-foreground">Loading from database...</span>
                )}
                {!loading && categories?.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {categories.length} main {categories.length === 1 ? 'category' : 'categories'} from database
                  </span>
                )}
                {!loading && categories?.length === 0 && !error && (
                  <span className="text-xs text-warning">No categories in database</span>
                )}
              </div>
            </div>
            <div className="space-y-4">
              {categories && categories.length > 0 ? categories.map((category) => (
                <div key={category?.id} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    {editingCategory === category?.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="text"
                          defaultValue={category?.label}
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e?.key === 'Enter') {
                              handleEditMainCategory(category?.id, e?.target?.value);
                            }
                          }}
                          onBlur={(e) => handleEditMainCategory(category?.id, e?.target?.value)}
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingCategory(null)}
                          iconName="X"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleCategoryExpansion(category?.id)}
                            iconName={expandedCategories.has(category?.id) ? "ChevronDown" : "ChevronRight"}
                            className="h-6 w-6 p-0"
                          />
                          <Icon name="Folder" size={16} className="text-primary" />
                          <span className="font-medium text-foreground">{category?.label}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(category?.subCategories || [])?.length} subcategories)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCategory(category?.id)}
                            iconName="Edit2"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMainCategory(category?.id)}
                            iconName="Trash2"
                            className="text-destructive hover:text-destructive"
                            disabled={isProcessing || loading}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* SubCategories - Collapsible */}
                  {category?.subCategories && category?.subCategories?.length > 0 && expandedCategories.has(category?.id) && (
                    <div className="ml-6 mt-2 space-y-2">
                      {category?.subCategories?.map((subCat) => (
                        <div key={subCat?.id} className="flex items-center justify-between bg-background/50 rounded p-2">
                          {editingSubCategory === `${category?.id}-${subCat?.id}` ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                type="text"
                                defaultValue={subCat?.label}
                                className="flex-1"
                                onKeyPress={(e) => {
                                  if (e?.key === 'Enter') {
                                    handleEditSubCategory(category?.id, subCat?.id, e?.target?.value);
                                  }
                                }}
                                onBlur={(e) => handleEditSubCategory(category?.id, subCat?.id, e?.target?.value)}
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingSubCategory(null)}
                                iconName="X"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <Icon name="FileText" size={14} className="text-muted-foreground" />
                                <span className="text-sm text-foreground">{subCat?.label}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    // Auto-expand category when editing subcategory
                                    if (!expandedCategories.has(category?.id)) {
                                      toggleCategoryExpansion(category?.id);
                                    }
                                    setEditingSubCategory(`${category?.id}-${subCat?.id}`);
                                  }}
                                  className="h-7 w-7 p-0 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="Edit subcategory"
                                  disabled={isProcessing || loading}
                                >
                                  <Icon name="Edit2" size={14} />
                                </button>
                                <button
                                  onClick={() => handleRemoveSubCategory(category?.id, subCat?.id)}
                                  className="h-7 w-7 p-0 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  title="Delete subcategory"
                                  disabled={isProcessing || loading}
                                >
                                  <Icon name="Trash2" size={14} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )) : null}
              
              {(!categories || categories.length === 0) && !loading && !error && (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon name="FolderOpen" size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No categories found in database. Add your first category above.</p>
                  <p className="text-xs mt-2">Categories will be saved to the main_categories, sub_categories, and main_category_sub_categories tables.</p>
                </div>
              )}
              
              {categories?.length === 0 && !loading && error && (
                <div className="text-center py-8 text-destructive/80">
                  <Icon name="AlertCircle" size={48} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">Error loading categories from database</p>
                  <p className="text-sm mt-2">{error.message}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={refresh}
                    className="mt-4"
                    iconName="RefreshCw"
                  >
                    Retry
                  </Button>
                </div>
              )}
            </div>
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;