import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';

const useContentReports = () => {
  const [reports, setReports] = useState([]);
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

  const fetchReports = useCallback(async () => {
    try {
      console.log('🔍 Fetching content reports from database...');
      setLoading(true);
      setError(null);

      // Don't fetch if auth is not initialized yet
      if (!authInitialized) {
        console.log('⏳ Auth not initialized, waiting...');
        return;
      }

      // Don't fetch if user is not authenticated or not admin
      if (!user || !isAdmin) {
        console.log('⚠️ User not authenticated or not admin, clearing reports');
        setReports([]);
        setLoading(false);
        return;
      }

      console.log('✅ User authenticated as admin, fetching content reports...');

      const { data: reportsData, error: reportsError } = await supabase
        .from('content_reports')
        .select(`
          *,
          reporter:reporter_id (
            id,
            first_name,
            last_name,
            email
          ),
          assigned_to_user:assigned_to (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.error('❌ Error fetching content reports:', reportsError);
        throw reportsError;
      }

      console.log('✅ Fetched content reports:', reportsData?.length);

      // Transform the data
      const transformedReports = (reportsData || []).map(report => ({
        id: report.id,
        reportType: report.report_type,
        reportedItemId: report.reported_item_id,
        reportedItemType: report.reported_item_type,
        reporter: report.reporter ? 
          `${report.reporter.first_name || ''} ${report.reporter.last_name || ''}`.trim() || report.reporter_email :
          report.reporter_email || 'Anonymous',
        reporterEmail: report.reporter_email,
        reportReason: report.report_reason,
        reportDescription: report.report_description,
        status: report.status,
        priority: report.priority || 'medium',
        assignedTo: report.assigned_to_user ? 
          `${report.assigned_to_user.first_name || ''} ${report.assigned_to_user.last_name || ''}`.trim() :
          null,
        assignedAt: report.assigned_at ? new Date(report.assigned_at) : null,
        reviewedAt: report.reviewed_at ? new Date(report.reviewed_at) : null,
        resolvedAt: report.resolved_at ? new Date(report.resolved_at) : null,
        resolutionNotes: report.resolution_notes,
        resolutionAction: report.resolution_action,
        evidenceUrls: report.evidence_urls || [],
        metadata: report.metadata || {},
        createdAt: new Date(report.created_at),
        updatedAt: new Date(report.updated_at),
        raw: report
      }));

      setReports(transformedReports);
    } catch (err) {
      console.error('❌ Error fetching content reports:', err);
      setError(err.message || 'Failed to fetch content reports');
      safeToast('Failed to fetch content reports', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, authInitialized, safeToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const createReport = useCallback(async (reportData) => {
    try {
      console.log('🔍 Creating content report:', reportData.reportType);
      
      const { data, error } = await supabase
        .from('content_reports')
        .insert([{
          report_type: reportData.reportType,
          reported_item_id: reportData.reportedItemId,
          reported_item_type: reportData.reportedItemType,
          reporter_id: user?.id,
          reporter_email: reportData.reporterEmail,
          report_reason: reportData.reportReason,
          report_description: reportData.reportDescription,
          priority: reportData.priority || 'medium',
          evidence_urls: reportData.evidenceUrls || [],
          metadata: reportData.metadata || {}
        }])
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('Report submitted successfully', 'success');
      fetchReports(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error creating report:', err);
      safeToast('Failed to submit report', 'error');
      throw err;
    }
  }, [user, safeToast, fetchReports]);

  const updateReport = useCallback(async (id, updates) => {
    try {
      console.log('🔍 Updating content report:', id);
      
      const { data, error } = await supabase
        .from('content_reports')
        .update({
          status: updates.status,
          priority: updates.priority,
          assigned_to: updates.assignedTo,
          assigned_at: updates.assignedAt ? updates.assignedAt.toISOString() : null,
          reviewed_at: updates.reviewedAt ? updates.reviewedAt.toISOString() : null,
          resolved_at: updates.resolvedAt ? updates.resolvedAt.toISOString() : null,
          resolution_notes: updates.resolutionNotes,
          resolution_action: updates.resolutionAction,
          evidence_urls: updates.evidenceUrls,
          metadata: updates.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('Report updated successfully', 'success');
      fetchReports(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error updating report:', err);
      safeToast('Failed to update report', 'error');
      throw err;
    }
  }, [safeToast, fetchReports]);

  const assignReport = useCallback(async (id, assignedToUserId) => {
    try {
      console.log('🔍 Assigning report:', id, 'to user:', assignedToUserId);
      
      const { data, error } = await supabase
        .from('content_reports')
        .update({
          assigned_to: assignedToUserId,
          assigned_at: new Date().toISOString(),
          status: 'under_review',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('Report assigned successfully', 'success');
      fetchReports(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error assigning report:', err);
      safeToast('Failed to assign report', 'error');
      throw err;
    }
  }, [safeToast, fetchReports]);

  const resolveReport = useCallback(async (id, resolutionData) => {
    try {
      console.log('🔍 Resolving report:', id);
      
      const { data, error } = await supabase
        .from('content_reports')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionData.notes,
          resolution_action: resolutionData.action,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('Report resolved successfully', 'success');
      fetchReports(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error resolving report:', err);
      safeToast('Failed to resolve report', 'error');
      throw err;
    }
  }, [safeToast, fetchReports]);

  const dismissReport = useCallback(async (id, reason) => {
    try {
      console.log('🔍 Dismissing report:', id);
      
      const { data, error } = await supabase
        .from('content_reports')
        .update({
          status: 'dismissed',
          resolved_at: new Date().toISOString(),
          resolution_notes: reason,
          resolution_action: 'no_action',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      safeToast('Report dismissed successfully', 'success');
      fetchReports(); // Refresh the list
      return data;
    } catch (err) {
      console.error('❌ Error dismissing report:', err);
      safeToast('Failed to dismiss report', 'error');
      throw err;
    }
  }, [safeToast, fetchReports]);

  // Helper functions for filtering and statistics
  const getReportsByStatus = useCallback((status) => {
    return reports.filter(report => report.status === status);
  }, [reports]);

  const getReportsByPriority = useCallback((priority) => {
    return reports.filter(report => report.priority === priority);
  }, [reports]);

  const getReportsByType = useCallback((type) => {
    return reports.filter(report => report.reportType === type);
  }, [reports]);

  const getReportStats = useCallback(() => {
    const stats = {
      total: reports.length,
      pending: reports.filter(r => r.status === 'pending').length,
      underReview: reports.filter(r => r.status === 'under_review').length,
      resolved: reports.filter(r => r.status === 'resolved').length,
      dismissed: reports.filter(r => r.status === 'dismissed').length,
      escalated: reports.filter(r => r.status === 'escalated').length,
      highPriority: reports.filter(r => r.priority === 'high').length,
      urgentPriority: reports.filter(r => r.priority === 'urgent').length
    };
    return stats;
  }, [reports]);

  return {
    reports,
    loading,
    error,
    createReport,
    updateReport,
    assignReport,
    resolveReport,
    dismissReport,
    getReportsByStatus,
    getReportsByPriority,
    getReportsByType,
    getReportStats,
    refetch: fetchReports
  };
};

export default useContentReports;
