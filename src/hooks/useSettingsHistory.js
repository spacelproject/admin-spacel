import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logError, logDebug } from '../utils/logger';
import { handleDatabaseError, formatErrorForUser } from '../utils/errorHandler';

/**
 * Hook for fetching platform settings change history
 */
const useSettingsHistory = (filters = {}) => {
  const { isAdmin } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logDebug('Fetching settings history', { filters });

      let query = supabase
        .from('platform_settings_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      if (filters.settingKey) {
        query = query.eq('setting_key', filters.settingKey);
      }

      if (filters.impactLevel) {
        query = query.eq('impact_level', filters.impactLevel);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        logError('Error fetching settings history:', fetchError);
        throw fetchError;
      }

      // Fetch user profiles for changed_by IDs
      const userIds = [...new Set((data || []).map(entry => entry.changed_by).filter(Boolean))];
      let userProfilesMap = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        
        if (profilesData) {
          profilesData.forEach(profile => {
            userProfilesMap[profile.id] = profile;
          });
        }
      }

      // Transform data to include user info
      const transformedData = (data || []).map((entry) => {
        const user = userProfilesMap[entry.changed_by];
        return {
          id: entry.id,
          setting: entry.setting_key,
          category: entry.category,
          oldValue: entry.old_value,
          newValue: entry.new_value,
          settingType: entry.setting_type,
          changedBy: user ? {
            id: user.id,
            name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown',
            email: user.email || 'N/A'
          } : {
            id: entry.changed_by,
            name: 'Unknown User',
            email: 'N/A'
          },
          timestamp: new Date(entry.created_at),
          impact: entry.impact_level || 'low',
          reason: entry.change_reason || null
        };
      });

      setHistory(transformedData);
      logDebug('Settings history fetched', { count: transformedData.length });
    } catch (err) {
      const appError = handleDatabaseError(err, 'Fetch settings history');
      logError('Error fetching settings history:', appError);
      setError(formatErrorForUser(appError));
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filters]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory
  };
};

export default useSettingsHistory;

