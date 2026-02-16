import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { logError, logDebug, logWarn } from '../utils/logger';
import { handleDatabaseError, formatErrorForUser } from '../utils/errorHandler';
import { useToast } from '../components/ui/Toast';
import { clearFeeSettingsCache } from '../utils/feeCalculator';

/**
 * Hook for managing fee settings
 * Fetches settings from commission_config table, provides save functionality, and real-time updates
 */
const useFeeSettings = () => {
  const { user, isAdmin } = useAuth();
  const { showToast } = useToast();
  const [feeSettings, setFeeSettings] = useState({
    seekerServiceRate: 12.0, // 12% (stored as 12.00 in DB)
    partnerFeeRate: 4.0, // 4% (stored as 4.00 in DB)
    taxRate: 20.0 // 20% (stored as 20.00 in DB)
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const channelRef = useRef(null);

  /**
   * Fetch fee settings from database
   */
  const fetchFeeSettings = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      logDebug('Fetching fee settings from commission_config');

      // Get the active commission config
      const { data, error: fetchError } = await supabase
        .from('commission_config')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        // If no active settings exist, use defaults
        if (fetchError.code === 'PGRST116') {
          logDebug('No active commission config found, using defaults');
          setFeeSettings({
            seekerServiceRate: 12.0,
            partnerFeeRate: 4.0,
            taxRate: 20.0
          });
          setLoading(false);
          return;
        }
        logError('Error fetching fee settings:', fetchError);
        throw fetchError;
      }

      if (data) {
        // Values are stored as percentages in commission_config (e.g., 12.00 for 12%)
        const settings = {
          seekerServiceRate: parseFloat(
            data.seeker_commission_rate ?? 12.0
          ),
          partnerFeeRate: parseFloat(
            data.partner_commission_rate ?? 4.0
          ),
          taxRate: parseFloat(
            data.tax_rate ?? 20.0
          )
        };

        setFeeSettings(settings);
        setLastUpdated(data.updated_at ? new Date(data.updated_at) : new Date(data.created_at));
        
        logDebug('Fee settings fetched from commission_config', { settings, lastUpdated: data.updated_at });
      }
    } catch (err) {
      const appError = handleDatabaseError(err, 'Fetch fee settings');
      logError('Error fetching fee settings:', appError);
      setError(formatErrorForUser(appError));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  /**
   * Save fee settings to database
   */
  const saveFeeSettings = useCallback(async (settingsToSave) => {
    if (!isAdmin || !user?.id) {
      showToast('You must be an admin to save fee settings', 'error');
      return false;
    }

    try {
      setSaving(true);
      setError(null);

      logDebug('Saving fee settings to commission_config', { settingsToSave });

      // First, deactivate all existing active records
      const { error: deactivateError } = await supabase
        .from('commission_config')
        .update({ is_active: false })
        .eq('is_active', true);

      if (deactivateError) {
        logError('Error deactivating old commission config:', deactivateError);
        // Continue anyway, as this is not critical
      }

      // Values are stored as percentages in commission_config (e.g., 12.00 for 12%)
      const commissionConfigData = {
        seeker_commission_rate: settingsToSave.seekerServiceRate ?? 12.0,
        partner_commission_rate: settingsToSave.partnerFeeRate ?? 4.0,
        tax_rate: settingsToSave.taxRate ?? 20.0,
        is_active: true,
        updated_by: user.id
      };

      // Insert new active commission config record
      const { data: newConfig, error: saveError } = await supabase
        .from('commission_config')
        .insert(commissionConfigData)
        .select()
        .single();

      if (saveError) {
        logError('Error saving commission config:', saveError);
        throw saveError;
      }

      // Update local state
      setFeeSettings(settingsToSave);
      setLastUpdated(new Date());

      // Clear fee calculator cache to ensure fresh calculations use new settings
      clearFeeSettingsCache();

      logDebug('Commission config saved successfully', { newConfig });

      showToast('Fee settings saved successfully', 'success');
      return true;
    } catch (err) {
      const appError = handleDatabaseError(err, 'Save fee settings');
      logError('Error saving fee settings:', appError);
      const errorMessage = formatErrorForUser(appError);
      setError(errorMessage);
      showToast(errorMessage || 'Failed to save fee settings', 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }, [isAdmin, user?.id, showToast]);

  // Fetch settings on mount
  useEffect(() => {
    fetchFeeSettings();
  }, [fetchFeeSettings]);

  // Set up real-time subscription for fee settings changes
  useEffect(() => {
    if (!isAdmin) return;

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    logDebug('Setting up real-time subscription for fee settings');

    const channel = supabase
      .channel('commission_config_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commission_config',
          filter: 'is_active=eq.true'
        },
        (payload) => {
          logDebug('Commission config change received', {
            eventType: payload.eventType
          });

          // Refetch settings when changes occur
          fetchFeeSettings();
          // Clear fee calculator cache when settings change
          clearFeeSettingsCache();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [isAdmin, fetchFeeSettings]);

  return {
    feeSettings,
    loading,
    saving,
    error,
    lastUpdated,
    saveFeeSettings,
    refetch: fetchFeeSettings
  };
};

export default useFeeSettings;

