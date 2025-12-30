/**
 * Fee Calculator Utility
 * Calculates booking fees based on current fee settings from the database
 * Ensures all fee calculations use real-time database values
 */

import { supabase } from '../lib/supabase';
import { logError, logDebug } from './logger';

// Cache for fee settings to avoid repeated database calls
let feeSettingsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Fetch current fee settings from database
 * Uses cache to avoid excessive database calls
 * @returns {Promise<Object>} Fee settings object with decimal rates
 */
export const fetchFeeSettings = async (forceRefresh = false) => {
  try {
    // Return cached settings if still valid and not forcing refresh
    if (!forceRefresh && feeSettingsCache && cacheTimestamp) {
      const cacheAge = Date.now() - cacheTimestamp;
      if (cacheAge < CACHE_DURATION) {
        logDebug('Using cached fee settings');
        return feeSettingsCache;
      }
    }

    logDebug('Fetching fee settings from commission_config');

    // Get the active commission config
    const { data, error } = await supabase
      .from('commission_config')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no settings exist, use defaults
      if (error.code === 'PGRST116') {
        logDebug('No active commission config found, using defaults');
        const defaults = {
          seeker_service_rate: 0.12, // 12% (stored as 12.00 in DB, converted to decimal)
          partner_fee_rate: 0.04, // 4% (stored as 4.00 in DB, converted to decimal)
          processing_percent: 0.0175 // 1.75% (stored as 1.75 in DB, converted to decimal)
        };
        feeSettingsCache = defaults;
        cacheTimestamp = Date.now();
        return defaults;
      }
      throw error;
    }

    if (data) {
      // Convert percentage values from commission_config to decimal rates
      const settings = {
        seeker_service_rate: parseFloat(
          data.seeker_commission_rate ?? 12.0
        ) / 100,
        partner_fee_rate: parseFloat(
          data.partner_commission_rate ?? 4.0
        ) / 100,
        processing_percent: parseFloat(
          data.processing_fee ?? 1.75
        ) / 100
      };

      // Update cache
      feeSettingsCache = settings;
      cacheTimestamp = Date.now();

      logDebug('Fee settings fetched from commission_config', settings);
      return settings;
    }

    // Fallback to defaults
    const defaults = {
      seeker_service_rate: 0.12,
      partner_fee_rate: 0.04,
      processing_percent: 0.0175
    };
    feeSettingsCache = defaults;
    cacheTimestamp = Date.now();
    return defaults;
  } catch (err) {
    logError('Error fetching fee settings:', err);
    // Return defaults on error
    const defaults = {
      seeker_service_rate: 0.12,
      partner_fee_rate: 0.04,
      processing_percent: 0.0175
    };
    feeSettingsCache = defaults;
    cacheTimestamp = Date.now();
    return defaults;
  }
};

/**
 * Clear the fee settings cache
 * Call this when fee settings are updated to ensure fresh data
 */
export const clearFeeSettingsCache = () => {
  feeSettingsCache = null;
  cacheTimestamp = null;
  logDebug('Fee settings cache cleared');
};

/**
 * Calculate service fee based on base amount
 * @param {number} baseAmount - Base booking amount in dollars
 * @param {Object} settings - Optional fee settings (if not provided, will fetch from DB)
 * @returns {Promise<number>} Service fee in dollars
 */
export const calculateServiceFee = async (baseAmount, settings = null) => {
  if (!baseAmount || baseAmount <= 0) return 0;

  const feeSettings = settings || await fetchFeeSettings();
  const serviceFee = baseAmount * feeSettings.seeker_service_rate;
  
  return Math.round(serviceFee * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate processing fee based on base amount and service fee
 * @param {number} baseAmount - Base booking amount in dollars
 * @param {number} serviceFee - Service fee in dollars
 * @param {Object} settings - Optional fee settings (if not provided, will fetch from DB)
 * @returns {Promise<number>} Processing fee in dollars
 */
export const calculateProcessingFee = async (baseAmount, serviceFee = null, settings = null) => {
  if (!baseAmount || baseAmount <= 0) return 0;

  const feeSettings = settings || await fetchFeeSettings();
  
  // If service fee not provided, calculate it first
  if (serviceFee === null) {
    serviceFee = await calculateServiceFee(baseAmount, feeSettings);
  }

  const subtotal = baseAmount + serviceFee;
  // Only use percentage-based processing fee (no fixed fee)
  const processingFee = subtotal * feeSettings.processing_percent;
  
  return Math.round(processingFee * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate partner fee (commission) based on base amount
 * @param {number} baseAmount - Base booking amount in dollars
 * @param {Object} settings - Optional fee settings (if not provided, will fetch from DB)
 * @returns {Promise<number>} Partner fee (commission) in dollars
 */
export const calculatePartnerFee = async (baseAmount, settings = null) => {
  if (!baseAmount || baseAmount <= 0) return 0;

  const feeSettings = settings || await fetchFeeSettings();
  const partnerFee = baseAmount * feeSettings.partner_fee_rate;
  
  return Math.round(partnerFee * 100) / 100; // Round to 2 decimal places
};

/**
 * Calculate all fees for a booking
 * @param {number} baseAmount - Base booking amount in dollars
 * @param {Object} settings - Optional fee settings (if not provided, will fetch from DB)
 * @returns {Promise<Object>} Object containing all calculated fees
 */
export const calculateAllFees = async (baseAmount, settings = null) => {
  if (!baseAmount || baseAmount <= 0) {
    return {
      baseAmount: 0,
      serviceFee: 0,
      processingFee: 0,
      partnerFee: 0,
      totalPaid: 0,
      partnerPayout: 0
    };
  }

  const feeSettings = settings || await fetchFeeSettings();
  
  const serviceFee = await calculateServiceFee(baseAmount, feeSettings);
  const processingFee = await calculateProcessingFee(baseAmount, serviceFee, feeSettings);
  const partnerFee = await calculatePartnerFee(baseAmount, feeSettings);
  
  const totalPaid = baseAmount + serviceFee + processingFee;
  const partnerPayout = baseAmount - partnerFee;

  return {
    baseAmount,
    serviceFee: Math.round(serviceFee * 100) / 100,
    processingFee: Math.round(processingFee * 100) / 100,
    partnerFee: Math.round(partnerFee * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    partnerPayout: Math.round(partnerPayout * 100) / 100
  };
};

/**
 * Synchronous version using cached settings
 * Use this when you need immediate calculation without async overhead
 * Note: May use stale cache if settings were recently updated
 * @param {number} baseAmount - Base booking amount in dollars
 * @returns {Object} Object containing all calculated fees
 */
export const calculateAllFeesSync = (baseAmount) => {
  if (!baseAmount || baseAmount <= 0) {
    return {
      baseAmount: 0,
      serviceFee: 0,
      processingFee: 0,
      partnerFee: 0,
      totalPaid: 0,
      partnerPayout: 0
    };
  }

  // Use cached settings or defaults
  const feeSettings = feeSettingsCache || {
    seeker_service_rate: 0.12,
    partner_fee_rate: 0.04,
    processing_percent: 0.0175
  };

  const serviceFee = baseAmount * feeSettings.seeker_service_rate;
  const subtotal = baseAmount + serviceFee;
  // Only use percentage-based processing fee (no fixed fee)
  const processingFee = subtotal * feeSettings.processing_percent;
  const partnerFee = baseAmount * feeSettings.partner_fee_rate;
  
  const totalPaid = baseAmount + serviceFee + processingFee;
  const partnerPayout = baseAmount - partnerFee;

  return {
    baseAmount,
    serviceFee: Math.round(serviceFee * 100) / 100,
    processingFee: Math.round(processingFee * 100) / 100,
    partnerFee: Math.round(partnerFee * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    partnerPayout: Math.round(partnerPayout * 100) / 100
  };
};

