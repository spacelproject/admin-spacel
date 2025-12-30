import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';

const useDocumentation = () => {
  const [documentation, setDocumentation] = useState([]);
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

  const fetchDocumentation = useCallback(async () => {
    try {
      console.log('🔍 Fetching documentation from database...');
      setLoading(true);
      setError(null);

      // Don't fetch if auth is not initialized yet
      if (!authInitialized) {
        console.log('⏳ Auth not initialized, waiting...');
        return;
      }

      // Don't fetch if user is not authenticated or not admin
      if (!user || !isAdmin) {
        console.log('⚠️ User not authenticated or not admin, clearing documentation');
        setDocumentation([]);
        setLoading(false);
        return;
      }

      console.log('✅ User authenticated as admin, fetching documentation...');

      const { data: documentationData, error: documentationError } = await supabase
        .from('documentation')
        .select(`
          *,
          author:author_id (
            id,
            first_name,
            last_name,
            email
          ),
          parent:parent_id (
            id,
            title,
            slug
          )
        `)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });

      if (documentationError) {
        console.error('❌ Error fetching documentation:', documentationError);
        throw documentationError;
      }

      console.log('✅ Fetched documentation:', documentationData?.length);

      // Transform the data
      const transformedDocumentation = (documentationData || []).map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        slug: doc.slug,
        category: doc.category,
        section: doc.section,
        parentId: doc.parent_id,
        parent: doc.parent,
        status: doc.status,
        author: doc.author ? 
          `${doc.author.first_name || ''} ${doc.author.last_name || ''}`.trim() || 'Support Team' :
          'Support Team',
        lastUpdated: new Date(doc.last_updated),
        publishedAt: doc.published_at ? new Date(doc.published_at) : null,
        orderIndex: doc.order_index || 0,
        tags: doc.tags || [],
        metaDescription: doc.meta_description,
        metaKeywords: doc.meta_keywords || [],
        viewCount: doc.view_count || 0,
        helpfulCount: doc.helpful_count || 0,
        notHelpfulCount: doc.not_helpful_count || 0,
        metadata: doc.metadata || {},
        createdAt: new Date(doc.created_at),
        updatedAt: new Date(doc.updated_at),
        raw: doc
      }));

      setDocumentation(transformedDocumentation);
    } catch (err) {
      console.error('❌ Error fetching documentation:', err);
      setError(err.message || 'Failed to fetch documentation');
      safeToast('Failed to fetch documentation', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, authInitialized, safeToast]);

  useEffect(() => {
    fetchDocumentation();
  }, [fetchDocumentation]);

  // Set up real-time subscription for documentation (including views updates)
  useEffect(() => {
    if (!user || !isAdmin) return;

    console.log('🔔 Setting up real-time subscription for documentation...');

    const channel = supabase
      .channel(`documentation-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentation'
        },
        (payload) => {
          console.log('📚 Documentation change received:', payload.eventType);
          
          if (payload.eventType === 'UPDATE') {
            // Update the specific documentation item in the list
            setDocumentation(prev => prev.map(doc => {
              if (doc.id === payload.new.id) {
                // Fetch author info if needed (for transformed data)
                const updatedDoc = {
                  ...doc,
                  title: payload.new.title,
                  content: payload.new.content,
                  slug: payload.new.slug,
                  category: payload.new.category,
                  section: payload.new.section,
                  parentId: payload.new.parent_id,
                  status: payload.new.status,
                  viewCount: payload.new.view_count || 0,
                  helpfulCount: payload.new.helpful_count || 0,
                  notHelpfulCount: payload.new.not_helpful_count || 0,
                  orderIndex: payload.new.order_index || 0,
                  tags: payload.new.tags || [],
                  metaDescription: payload.new.meta_description,
                  metaKeywords: payload.new.meta_keywords || [],
                  metadata: payload.new.metadata || {},
                  updatedAt: new Date(payload.new.updated_at),
                  lastUpdated: payload.new.last_updated ? new Date(payload.new.last_updated) : new Date(payload.new.updated_at),
                  raw: payload.new
                };
                return updatedDoc;
              }
              return doc;
            }));
          } else if (payload.eventType === 'INSERT') {
            // New documentation added - refresh the list
            fetchDocumentation();
          } else if (payload.eventType === 'DELETE') {
            // Documentation deleted - remove from list
            setDocumentation(prev => prev.filter(doc => doc.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Unsubscribing from documentation real-time updates');
      channel.unsubscribe();
    };
  }, [user, isAdmin, fetchDocumentation]);

  const createDocumentation = useCallback(async (docData) => {
    try {
      console.log('🔍 Creating documentation:', docData.title);
      
      const { data, error } = await supabase
        .from('documentation')
        .insert([{
          title: docData.title,
          content: docData.content,
          slug: docData.slug,
          category: docData.category || 'user_guide',
          section: docData.section,
          parent_id: docData.parentId,
          status: docData.status || 'draft',
          author_id: user?.id,
          author_name: docData.author || 'Support Team',
          order_index: docData.orderIndex || 0,
          tags: docData.tags || [],
          meta_description: docData.metaDescription,
          meta_keywords: docData.metaKeywords || [],
          metadata: docData.metadata || {}
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('Documentation created successfully', 'success');
      fetchDocumentation(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error creating documentation:', err);
      safeToast('Failed to create documentation', 'error');
      throw err;
    }
  }, [user, safeToast, fetchDocumentation]);

  const updateDocumentation = useCallback(async (id, updates) => {
    try {
      console.log('🔍 Updating documentation:', id);
      
      const { data, error } = await supabase
        .from('documentation')
        .update({
          title: updates.title,
          content: updates.content,
          slug: updates.slug,
          category: updates.category,
          section: updates.section,
          parent_id: updates.parentId,
          status: updates.status,
          order_index: updates.orderIndex,
          tags: updates.tags,
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

      safeToast('Documentation updated successfully', 'success');
      fetchDocumentation(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error updating documentation:', err);
      safeToast('Failed to update documentation', 'error');
      throw err;
    }
  }, [safeToast, fetchDocumentation]);

  const deleteDocumentation = useCallback(async (id) => {
    try {
      console.log('🔍 Deleting documentation:', id);
      
      const { error } = await supabase
        .from('documentation')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      safeToast('Documentation deleted successfully', 'success');
      fetchDocumentation(); // Refresh the list
    } catch (err) {
      console.error('❌ Error deleting documentation:', err);
      safeToast('Failed to delete documentation', 'error');
      throw err;
    }
  }, [safeToast, fetchDocumentation]);

  const publishDocumentation = useCallback(async (id) => {
    try {
      console.log('🔍 Publishing documentation:', id);
      
      const { data, error } = await supabase
        .from('documentation')
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

      safeToast('Documentation published successfully', 'success');
      fetchDocumentation(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error publishing documentation:', err);
      safeToast('Failed to publish documentation', 'error');
      throw err;
    }
  }, [safeToast, fetchDocumentation]);

  // Helper function to organize documentation into hierarchical structure
  const getHierarchicalDocumentation = useCallback(() => {
    const sections = {};
    const articles = [];

    documentation.forEach(doc => {
      if (doc.section && !doc.parentId) {
        // This is a section
        if (!sections[doc.section]) {
          sections[doc.section] = {
            id: doc.section,
            title: doc.section,
            type: 'section',
            children: []
          };
        }
      } else {
        // This is an article
        articles.push(doc);
      }
    });

    // Add articles to their respective sections
    articles.forEach(article => {
      if (article.parentId) {
        const parent = documentation.find(doc => doc.id === article.parentId);
        if (parent && sections[parent.section]) {
          sections[parent.section].children.push(article);
        }
      } else if (article.section && sections[article.section]) {
        sections[article.section].children.push(article);
      }
    });

    return Object.values(sections);
  }, [documentation]);

  return {
    documentation,
    loading,
    error,
    createDocumentation,
    updateDocumentation,
    deleteDocumentation,
    publishDocumentation,
    getHierarchicalDocumentation,
    refetch: fetchDocumentation
  };
};

export default useDocumentation;
