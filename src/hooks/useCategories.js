import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { logError, logDebug } from '../utils/logger';

/**
 * Hook to manage space categories from the database
 * Uses the same tables as the user app: main_categories, sub_categories, and main_category_sub_categories
 * Handles fetching, creating, updating, and deleting categories
 */
export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transform database categories to UI format
  const transformCategories = useCallback((mainCats, subCats, relationships) => {
    if (!mainCats || mainCats.length === 0) return [];

    // Build the hierarchical structure
    return mainCats
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map(mainCat => {
        // Find all subcategories linked to this main category
        const linkedSubIds = relationships
          .filter(rel => rel.main_category_id === mainCat.id)
          .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
          .map(rel => rel.sub_category_id);

        const subs = subCats
          .filter(sub => linkedSubIds.includes(sub.id))
          .sort((a, b) => {
            const aOrder = relationships.find(r => r.sub_category_id === a.id && r.main_category_id === mainCat.id)?.display_order || 0;
            const bOrder = relationships.find(r => r.sub_category_id === b.id && r.main_category_id === mainCat.id)?.display_order || 0;
            return aOrder - bOrder;
          })
          .map(sub => ({
            id: sub.name, // Use name as id for compatibility
            name: sub.name,
            label: sub.name, // sub_categories only has name, no label
            dbId: sub.id,
            isActive: sub.is_active,
            sortOrder: relationships.find(r => r.sub_category_id === sub.id && r.main_category_id === mainCat.id)?.display_order || 0
          }));

        return {
          id: mainCat.name, // Use name as id for compatibility
          name: mainCat.name,
          label: mainCat.name, // main_categories only has name, no label
          dbId: mainCat.id,
          subCategories: subs,
          isActive: mainCat.is_active,
          sortOrder: mainCat.display_order,
          icon: mainCat.icon,
          color: mainCat.color
        };
      });
  }, []);

  // Fetch all categories from database
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      logDebug('Fetching categories from main_categories, sub_categories, and main_category_sub_categories tables...');

      // Fetch main categories
      const { data: mainCategories, error: mainError } = await supabase
        .from('main_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (mainError) {
        throw mainError;
      }

      // Fetch sub categories
      const { data: subCategories, error: subError } = await supabase
        .from('sub_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (subError) {
        throw subError;
      }

      // Fetch relationships
      const { data: relationships, error: relError } = await supabase
        .from('main_category_sub_categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (relError) {
        throw relError;
      }

      logDebug('Fetched categories:', {
        main: mainCategories?.length || 0,
        sub: subCategories?.length || 0,
        relationships: relationships?.length || 0
      });
      
      const transformed = transformCategories(mainCategories || [], subCategories || [], relationships || []);
      logDebug('Transformed categories:', transformed);
      logDebug('Transformed categories count:', transformed?.length || 0);
      
      setCategories(transformed);
      setError(null);
    } catch (err) {
      logError('Error fetching categories:', err);
      setError(err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [transformCategories]);

  // Create a new main category
  const createMainCategory = useCallback(async (categoryName) => {
    try {
      if (!categoryName?.trim()) {
        throw new Error('Category name is required');
      }

      const categoryNameLower = categoryName.trim();
      
      logDebug('Creating main category:', categoryNameLower);

      // Get the max display_order to append at the end
      const { data: existingCategories } = await supabase
        .from('main_categories')
        .select('display_order')
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = existingCategories && existingCategories.length > 0
        ? (existingCategories[0].display_order || 0) + 1
        : 0;

      const { data, error: createError } = await supabase
        .from('main_categories')
        .insert({
          name: categoryNameLower,
          display_order: nextOrder,
          is_active: true
        })
        .select()
        .single();

      if (createError) {
        // Handle unique constraint violation
        if (createError.code === '23505' || createError.code === 'PGRST116' || createError.status === 409) {
          throw new Error(`Category "${categoryName}" already exists`);
        }
        throw createError;
      }

      logDebug('Created main category:', data);
      
      // Refresh categories
      await fetchCategories();
      return { success: true, data };
    } catch (err) {
      logError('Error creating main category:', err);
      throw err;
    }
  }, [fetchCategories]);

  // Create a new subcategory
  const createSubCategory = useCallback(async (parentCategoryId, subCategoryName) => {
    try {
      if (!subCategoryName?.trim() || !parentCategoryId) {
        throw new Error('Subcategory name and parent category are required');
      }

      // Find parent category by name (id in UI format)
      const parentCategory = categories.find(cat => cat.id === parentCategoryId);
      if (!parentCategory) {
        throw new Error('Parent category not found');
      }

      const subCategoryNameLower = subCategoryName.trim();
      
      logDebug('Creating subcategory:', subCategoryNameLower, 'for parent:', parentCategoryId);

      // Check if subcategory already exists
      const { data: existingSub } = await supabase
        .from('sub_categories')
        .select('id')
        .eq('name', subCategoryNameLower)
        .eq('is_active', true)
        .single();

      let subCategoryId;

      if (existingSub) {
        // Subcategory exists, use its ID
        subCategoryId = existingSub.id;
        logDebug('Subcategory already exists, using existing ID:', subCategoryId);
      } else {
        // Create new subcategory
        // Get the max display_order for subcategories
        const { data: existingSubs } = await supabase
          .from('sub_categories')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1);

        const nextOrder = existingSubs && existingSubs.length > 0
          ? (existingSubs[0].display_order || 0) + 1
          : 0;

        const { data: newSub, error: subError } = await supabase
          .from('sub_categories')
          .insert({
            name: subCategoryNameLower,
            display_order: nextOrder,
            is_active: true
          })
          .select()
          .single();

        if (subError) {
          if (subError.code === '23505' || subError.code === 'PGRST116' || subError.status === 409) {
            throw new Error(`Subcategory "${subCategoryName}" already exists`);
          }
          throw subError;
        }

        subCategoryId = newSub.id;
        logDebug('Created new subcategory:', newSub);
      }

      // Check if relationship already exists
      const { data: existingRel } = await supabase
        .from('main_category_sub_categories')
        .select('id')
        .eq('main_category_id', parentCategory.dbId)
        .eq('sub_category_id', subCategoryId)
        .single();

      if (existingRel) {
        logDebug('Relationship already exists');
        await fetchCategories();
        return { success: true, data: existingRel };
      }

      // Get the max display_order for relationships for this main category
      const { data: existingRels } = await supabase
        .from('main_category_sub_categories')
        .select('display_order')
        .eq('main_category_id', parentCategory.dbId)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = existingRels && existingRels.length > 0
        ? (existingRels[0].display_order || 0) + 1
        : 0;

      // Create relationship
      const { data: relationship, error: relError } = await supabase
        .from('main_category_sub_categories')
        .insert({
          main_category_id: parentCategory.dbId,
          sub_category_id: subCategoryId,
          display_order: nextOrder
        })
        .select()
        .single();

      if (relError) {
        throw relError;
      }

      logDebug('Created relationship:', relationship);
      
      // Refresh categories
      await fetchCategories();
      return { success: true, data: relationship };
    } catch (err) {
      logError('Error creating subcategory:', err);
      throw err;
    }
  }, [categories, fetchCategories]);

  // Update a category
  const updateCategory = useCallback(async (categoryId, updates) => {
    try {
      const category = categories.find(cat => cat.id === categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      logDebug('Updating category:', categoryId, updates);

      const updateData = {};
      if (updates.label !== undefined) {
        updateData.name = updates.label.trim();
      }
      if (updates.icon !== undefined) {
        updateData.icon = updates.icon;
      }
      if (updates.color !== undefined) {
        updateData.color = updates.color;
      }
      if (updates.sortOrder !== undefined) {
        updateData.display_order = updates.sortOrder;
      }
      updateData.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('main_categories')
        .update(updateData)
        .eq('id', category.dbId);

      if (updateError) throw updateError;

      logDebug('Updated category');
      
      // Refresh categories
      await fetchCategories();
      return { success: true };
    } catch (err) {
      logError('Error updating category:', err);
      throw err;
    }
  }, [categories, fetchCategories]);

  // Delete a category (soft delete by setting is_active to false)
  const deleteCategory = useCallback(async (categoryId) => {
    try {
      const category = categories.find(cat => cat.id === categoryId);
      if (!category) {
        throw new Error('Category not found');
      }

      logDebug('Deleting category:', categoryId, 'dbId:', category.dbId);

      // Soft delete main category by setting is_active to false
      const { error: deleteError } = await supabase
        .from('main_categories')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', category.dbId);

      if (deleteError) {
        logError('Error deleting main category:', deleteError);
        throw deleteError;
      }

      logDebug('Soft deleted main category');

      // Also soft delete all related subcategories
      // First, get all subcategory IDs linked to this main category
      const { data: relationships, error: relError } = await supabase
        .from('main_category_sub_categories')
        .select('sub_category_id')
        .eq('main_category_id', category.dbId);

      if (relError) {
        logError('Error fetching relationships:', relError);
        // Continue anyway - main category is already deleted
      } else if (relationships && relationships.length > 0) {
        const subCategoryIds = relationships.map(rel => rel.sub_category_id);
        
        // Check which subcategories are only linked to this main category
        for (const subId of subCategoryIds) {
          const { data: otherRels } = await supabase
            .from('main_category_sub_categories')
            .select('id')
            .eq('sub_category_id', subId)
            .neq('main_category_id', category.dbId)
            .limit(1);

          // If subcategory is only linked to this main category, soft delete it
          if (!otherRels || otherRels.length === 0) {
            const { error: subError } = await supabase
              .from('sub_categories')
              .update({ 
                is_active: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', subId);

            if (subError) {
              logError('Error soft deleting subcategory:', subError);
              // Continue - not critical
            } else {
              logDebug('Soft deleted subcategory:', subId);
            }
          }
        }
      }

      logDebug('Deleted category and related subcategories');
      
      // Small delay to ensure database update is committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh categories
      await fetchCategories();
      return { success: true };
    } catch (err) {
      logError('Error deleting category:', err);
      throw err;
    }
  }, [categories, fetchCategories]);

  // Delete a subcategory (remove relationship and optionally soft delete subcategory)
  const deleteSubCategory = useCallback(async (categoryId, subCategoryId) => {
    try {
      const category = categories.find(cat => cat.id === categoryId);
      const subCategory = category?.subCategories.find(sub => sub.id === subCategoryId);
      
      if (!category || !subCategory) {
        throw new Error('Subcategory not found');
      }

      logDebug('Deleting subcategory:', subCategoryId, 'from category:', categoryId, 'dbIds:', {
        mainCategoryId: category.dbId,
        subCategoryId: subCategory.dbId
      });

      // Remove the relationship
      const { error: relError } = await supabase
        .from('main_category_sub_categories')
        .delete()
        .eq('main_category_id', category.dbId)
        .eq('sub_category_id', subCategory.dbId);

      if (relError) {
        logError('Error deleting relationship:', relError);
        throw relError;
      }

      logDebug('Deleted relationship');

      // Check if this subcategory is used by other main categories
      const { data: otherRels, error: checkError } = await supabase
        .from('main_category_sub_categories')
        .select('id')
        .eq('sub_category_id', subCategory.dbId)
        .limit(1);

      if (checkError) {
        logError('Error checking other relationships:', checkError);
        // Continue anyway - relationship is already deleted
      }

      // If not used by any other main category, soft delete the subcategory
      if (!otherRels || otherRels.length === 0) {
        logDebug('Subcategory not used elsewhere, soft deleting subcategory');
        const { error: subError } = await supabase
          .from('sub_categories')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', subCategory.dbId);

        if (subError) {
          logError('Error soft deleting subcategory:', subError);
          // Don't throw - relationship is already deleted
        } else {
          logDebug('Soft deleted subcategory');
        }
      } else {
        logDebug('Subcategory still used by other categories, keeping it active');
      }

      logDebug('Deleted subcategory relationship');
      
      // Small delay to ensure database update is committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Refresh categories
      await fetchCategories();
      return { success: true };
    } catch (err) {
      logError('Error deleting subcategory:', err);
      throw err;
    }
  }, [categories, fetchCategories]);

  // Fetch categories on mount and add cache-busting
  useEffect(() => {
    fetchCategories();
    // Force a refresh after a short delay to ensure fresh data
    const refreshTimer = setTimeout(() => {
      fetchCategories();
    }, 100);
    return () => clearTimeout(refreshTimer);
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refresh: fetchCategories,
    createMainCategory,
    createSubCategory,
    updateCategory,
    deleteCategory,
    deleteSubCategory
  };
};
