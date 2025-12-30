import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';

const useLegalPages = () => {
  const [legalPages, setLegalPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAdmin, authInitialized } = useAuth();
  const { showToast } = useToast();

  const safeToast = useCallback((message, type) => {
    if (showToast) {
      showToast(message, type);
    } else {
      console.warn(`Toast not available: ${message} (${type})`);
    }
  }, [showToast]);

  const fetchLegalPages = useCallback(async () => {
    try {
      console.log('🔍 Fetching legal pages from database...');
      setLoading(true);
      setError(null);

      // Don't fetch if auth is not initialized yet
      if (!authInitialized) {
        console.log('⏳ Auth not initialized, waiting...');
        return;
      }

      // Don't fetch if user is not authenticated or not admin
      if (!user || !isAdmin) {
        console.log('⚠️ User not authenticated or not admin, clearing legal pages');
        setLegalPages([]);
        setLoading(false);
        return;
      }

      console.log('✅ User authenticated as admin, fetching legal pages...');

      const { data: legalPagesData, error: legalPagesError } = await supabase
        .from('legal_pages')
        .select(`
          *,
          author:author_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (legalPagesError) {
        console.error('❌ Error fetching legal pages:', legalPagesError);
        throw legalPagesError;
      }

      console.log('✅ Fetched legal pages:', legalPagesData?.length);

      // Transform the data
      const transformedLegalPages = (legalPagesData || []).map(page => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content,
        status: page.status,
        version: page.version,
        effectiveDate: new Date(page.effective_date),
        author: page.author ? 
          `${page.author.first_name || ''} ${page.author.last_name || ''}`.trim() || 'Legal Team' :
          'Legal Team',
        lastUpdated: new Date(page.last_updated),
        publishedAt: page.published_at ? new Date(page.published_at) : null,
        pageType: page.page_type || 'legal',
        requiredConsent: page.required_consent || false,
        consentType: page.consent_type,
        metaDescription: page.meta_description,
        metaKeywords: page.meta_keywords || [],
        viewCount: page.view_count || 0,
        metadata: page.metadata || {},
        createdAt: new Date(page.created_at),
        updatedAt: new Date(page.updated_at),
        raw: page
      }));

      setLegalPages(transformedLegalPages);
    } catch (err) {
      console.error('❌ Error fetching legal pages:', err);
      setError(err.message || 'Failed to fetch legal pages');
      safeToast('Failed to fetch legal pages', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, authInitialized, safeToast]);

  useEffect(() => {
    fetchLegalPages();
  }, [fetchLegalPages]);

  const createLegalPage = useCallback(async (pageData) => {
    try {
      console.log('🔍 Creating legal page:', pageData.title);
      
      const { data, error } = await supabase
        .from('legal_pages')
        .insert([{
          title: pageData.title,
          slug: pageData.slug,
          content: pageData.content,
          status: pageData.status || 'draft',
          version: pageData.version || '1.0',
          effective_date: pageData.effectiveDate || new Date().toISOString(),
          author_id: user?.id,
          author_name: pageData.author || 'Legal Team',
          page_type: pageData.pageType || 'legal',
          required_consent: pageData.requiredConsent || false,
          consent_type: pageData.consentType,
          meta_description: pageData.metaDescription,
          meta_keywords: pageData.metaKeywords || [],
          metadata: pageData.metadata || {}
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('Legal page created successfully', 'success');
      fetchLegalPages(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error creating legal page:', err);
      safeToast('Failed to create legal page', 'error');
      throw err;
    }
  }, [user, safeToast, fetchLegalPages]);

  const updateLegalPage = useCallback(async (id, updates) => {
    try {
      console.log('🔍 Updating legal page:', id);
      
      const { data, error } = await supabase
        .from('legal_pages')
        .update({
          title: updates.title,
          slug: updates.slug,
          content: updates.content,
          status: updates.status,
          version: updates.version,
          effective_date: updates.effectiveDate,
          page_type: updates.pageType,
          required_consent: updates.requiredConsent,
          consent_type: updates.consentType,
          meta_description: updates.metaDescription,
          meta_keywords: updates.metaKeywords,
          metadata: updates.metadata,
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('Legal page updated successfully', 'success');
      fetchLegalPages(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error updating legal page:', err);
      safeToast('Failed to update legal page', 'error');
      throw err;
    }
  }, [safeToast, fetchLegalPages]);

  const deleteLegalPage = useCallback(async (id) => {
    try {
      console.log('🔍 Deleting legal page:', id);
      
      const { error } = await supabase
        .from('legal_pages')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      safeToast('Legal page deleted successfully', 'success');
      fetchLegalPages(); // Refresh the list
    } catch (err) {
      console.error('❌ Error deleting legal page:', err);
      safeToast('Failed to delete legal page', 'error');
      throw err;
    }
  }, [safeToast, fetchLegalPages]);

  const publishLegalPage = useCallback(async (id) => {
    try {
      console.log('🔍 Publishing legal page:', id);
      
      const { data, error } = await supabase
        .from('legal_pages')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('Legal page published successfully', 'success');
      fetchLegalPages(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error publishing legal page:', err);
      safeToast('Failed to publish legal page', 'error');
      throw err;
    }
  }, [safeToast, fetchLegalPages]);

  const createNewVersion = useCallback(async (id, newVersionData) => {
    try {
      console.log('🔍 Creating new version of legal page:', id);
      
      // Get the current page
      const { data: currentPage, error: fetchError } = await supabase
        .from('legal_pages')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Create new version
      const { data, error } = await supabase
        .from('legal_pages')
        .insert([{
          title: newVersionData.title || currentPage.title,
          slug: currentPage.slug, // Keep same slug
          content: newVersionData.content || currentPage.content,
          status: newVersionData.status || 'draft',
          version: newVersionData.version,
          effective_date: newVersionData.effectiveDate || new Date().toISOString(),
          author_id: user?.id,
          author_name: newVersionData.author || 'Legal Team',
          page_type: currentPage.page_type,
          required_consent: newVersionData.requiredConsent !== undefined ? newVersionData.requiredConsent : currentPage.required_consent,
          consent_type: newVersionData.consentType || currentPage.consent_type,
          meta_description: newVersionData.metaDescription || currentPage.meta_description,
          meta_keywords: newVersionData.metaKeywords || currentPage.meta_keywords,
          metadata: newVersionData.metadata || currentPage.metadata
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('New version created successfully', 'success');
      fetchLegalPages(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error creating new version:', err);
      safeToast('Failed to create new version', 'error');
      throw err;
    }
  }, [user, safeToast, fetchLegalPages]);

  return {
    legalPages,
    loading,
    error,
    createLegalPage,
    updateLegalPage,
    deleteLegalPage,
    publishLegalPage,
    createNewVersion,
    refetch: fetchLegalPages
  };
};

export default useLegalPages;
