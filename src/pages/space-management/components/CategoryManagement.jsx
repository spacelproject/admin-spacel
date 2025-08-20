import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const CategoryManagement = ({ categories, onCategoriesUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMainCategory, setNewMainCategory] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [selectedMainCategory, setSelectedMainCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingSubCategory, setEditingSubCategory] = useState(null);

  const handleAddMainCategory = () => {
    if (!newMainCategory?.trim()) return;
    
    const categoryId = newMainCategory?.toLowerCase()?.replace(/\s+/g, '_');
    const newCategory = {
      id: categoryId,
      name: newMainCategory?.trim(),
      label: newMainCategory?.trim(),
      subCategories: []
    };
    
    const updatedCategories = [...categories, newCategory];
    onCategoriesUpdate(updatedCategories);
    setNewMainCategory('');
  };

  const handleRemoveMainCategory = (categoryId) => {
    const updatedCategories = categories?.filter(cat => cat?.id !== categoryId);
    onCategoriesUpdate(updatedCategories);
  };

  const handleAddSubCategory = () => {
    if (!newSubCategory?.trim() || !selectedMainCategory) return;
    
    const subCategoryId = newSubCategory?.toLowerCase()?.replace(/\s+/g, '_');
    const newSub = {
      id: subCategoryId,
      name: newSubCategory?.trim(),
      label: newSubCategory?.trim()
    };
    
    const updatedCategories = categories?.map(cat => {
      if (cat?.id === selectedMainCategory) {
        return {
          ...cat,
          subCategories: [...(cat?.subCategories || []), newSub]
        };
      }
      return cat;
    });
    
    onCategoriesUpdate(updatedCategories);
    setNewSubCategory('');
    setSelectedMainCategory('');
  };

  const handleRemoveSubCategory = (categoryId, subCategoryId) => {
    const updatedCategories = categories?.map(cat => {
      if (cat?.id === categoryId) {
        return {
          ...cat,
          subCategories: cat?.subCategories?.filter(sub => sub?.id !== subCategoryId) || []
        };
      }
      return cat;
    });
    
    onCategoriesUpdate(updatedCategories);
  };

  const handleEditMainCategory = (categoryId, newName) => {
    if (!newName?.trim()) return;
    
    const updatedCategories = categories?.map(cat => {
      if (cat?.id === categoryId) {
        return {
          ...cat,
          name: newName?.trim(),
          label: newName?.trim()
        };
      }
      return cat;
    });
    
    onCategoriesUpdate(updatedCategories);
    setEditingCategory(null);
  };

  const handleEditSubCategory = (categoryId, subCategoryId, newName) => {
    if (!newName?.trim()) return;
    
    const updatedCategories = categories?.map(cat => {
      if (cat?.id === categoryId) {
        return {
          ...cat,
          subCategories: cat?.subCategories?.map(sub => {
            if (sub?.id === subCategoryId) {
              return {
                ...sub,
                name: newName?.trim(),
                label: newName?.trim()
              };
            }
            return sub;
          }) || []
        };
      }
      return cat;
    });
    
    onCategoriesUpdate(updatedCategories);
    setEditingSubCategory(null);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-foreground">Category Management</h3>
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
          iconPosition="right"
        >
          {isExpanded ? 'Hide' : 'Manage Categories'}
        </Button>
      </div>
      {isExpanded && (
        <div className="space-y-6">
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
                disabled={!newMainCategory?.trim()}
                iconName="Plus"
                iconPosition="left"
              >
                Add Category
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
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Enter subcategory name..."
                value={newSubCategory}
                onChange={(e) => setNewSubCategory(e?.target?.value)}
                className="flex-1"
                disabled={!selectedMainCategory}
                onKeyPress={(e) => e?.key === 'Enter' && handleAddSubCategory()}
              />
              <Button
                onClick={handleAddSubCategory}
                disabled={!newSubCategory?.trim() || !selectedMainCategory}
                iconName="Plus"
                iconPosition="left"
              >
                Add SubCategory
              </Button>
            </div>
          </div>

          {/* Categories List */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-3">Current Categories</h4>
            <div className="space-y-4">
              {categories?.map((category) => (
                <div key={category?.id} className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    {editingCategory === category?.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="text"
                          defaultValue={category?.name}
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
                        <div className="flex items-center gap-2">
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
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* SubCategories */}
                  {category?.subCategories && category?.subCategories?.length > 0 && (
                    <div className="ml-6 space-y-2">
                      {category?.subCategories?.map((subCat) => (
                        <div key={subCat?.id} className="flex items-center justify-between bg-background/50 rounded p-2">
                          {editingSubCategory === `${category?.id}-${subCat?.id}` ? (
                            <div className="flex items-center gap-2 flex-1">
                              <Input
                                type="text"
                                defaultValue={subCat?.name}
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingSubCategory(`${category?.id}-${subCat?.id}`)}
                                  iconName="Edit2"
                                  className="h-6 w-6"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveSubCategory(category?.id, subCat?.id)}
                                  iconName="Trash2"
                                  className="h-6 w-6 text-destructive hover:text-destructive"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {categories?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Icon name="FolderOpen" size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No categories created yet. Add your first category above.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;