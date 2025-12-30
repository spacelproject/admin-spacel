import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StripeCommissionTracking from '../services/stripeCommissionTracking';

/**
 * Hook for enhanced commission tracking using Stripe API
 * Provides real-time commission data, reconciliation, and detailed financial tracking
 */
const useStripeCommissionTracking = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stripeData, setStripeData] = useState({
    balanceTransactions: [],
    payouts: [],
    disputes: [],
    summary: null
  });

  /**
   * Fetch commission summary from Stripe for a date range
   */
  const fetchCommissionSummary = useCallback(async (startDate, endDate) => {
    if (!isAdmin) return null;

    try {
      setLoading(true);
      setError(null);

      const summary = await StripeCommissionTracking.getCommissionSummary(
        startDate.toISOString(),
        endDate.toISOString()
      );

      setStripeData(prev => ({ ...prev, summary }));
      return summary;
    } catch (err) {
      console.error('Error fetching commission summary:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  /**
   * Fetch balance transactions from Stripe
   */
  const fetchBalanceTransactions = useCallback(async (startDate, endDate, limit = 100) => {
    if (!isAdmin) return [];

    try {
      setLoading(true);
      setError(null);

      const transactions = await StripeCommissionTracking.getBalanceTransactions(
        startDate.toISOString(),
        endDate.toISOString(),
        limit
      );

      setStripeData(prev => ({ ...prev, balanceTransactions: transactions }));
      return transactions;
    } catch (err) {
      console.error('Error fetching balance transactions:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  /**
   * Fetch payouts from Stripe
   */
  const fetchPayouts = useCallback(async (startDate, endDate, limit = 100) => {
    if (!isAdmin) return [];

    try {
      setLoading(true);
      setError(null);

      const payouts = await StripeCommissionTracking.getPayouts(
        startDate.toISOString(),
        endDate.toISOString(),
        limit
      );

      setStripeData(prev => ({ ...prev, payouts }));
      return payouts;
    } catch (err) {
      console.error('Error fetching payouts:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  /**
   * Fetch disputes/chargebacks from Stripe
   */
  const fetchDisputes = useCallback(async (startDate, endDate, limit = 100) => {
    if (!isAdmin) return [];

    try {
      setLoading(true);
      setError(null);

      const disputes = await StripeCommissionTracking.getDisputes(
        startDate.toISOString(),
        endDate.toISOString(),
        limit
      );

      setStripeData(prev => ({ ...prev, disputes }));
      return disputes;
    } catch (err) {
      console.error('Error fetching disputes:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  /**
   * Sync commission data from Stripe for specific bookings
   */
  const syncCommissionFromStripe = useCallback(async (bookingId, paymentIntentId) => {
    if (!isAdmin) return null;

    try {
      setLoading(true);
      setError(null);

      const result = await StripeCommissionTracking.syncCommissionFromStripe(
        bookingId,
        paymentIntentId
      );

      return result;
    } catch (err) {
      console.error('Error syncing commission:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  /**
   * Reconcile database bookings with Stripe transactions
   */
  const reconcileBookings = useCallback(async (bookingIds = null) => {
    if (!isAdmin) return null;

    try {
      setLoading(true);
      setError(null);

      const results = await StripeCommissionTracking.reconcileBookings(bookingIds);

      return results;
    } catch (err) {
      console.error('Error reconciling bookings:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  /**
   * Get payment details from Stripe
   */
  const getPaymentDetails = useCallback(async (paymentIntentId) => {
    if (!isAdmin) return null;

    try {
      const details = await StripeCommissionTracking.getPaymentDetails(paymentIntentId);
      return details;
    } catch (err) {
      console.error('Error fetching payment details:', err);
      setError(err.message);
      return null;
    }
  }, [isAdmin]);

  /**
   * Get comprehensive commission breakdown from Stripe
   */
  const getCommissionBreakdown = useCallback(async (paymentIntentId) => {
    if (!isAdmin) return null;

    try {
      const paymentData = await StripeCommissionTracking.getPaymentDetails(paymentIntentId);
      const breakdown = StripeCommissionTracking.calculateCommissionBreakdown(paymentData);
      return breakdown;
    } catch (err) {
      console.error('Error getting commission breakdown:', err);
      setError(err.message);
      return null;
    }
  }, [isAdmin]);

  return {
    // State
    loading,
    error,
    stripeData,

    // Methods
    fetchCommissionSummary,
    fetchBalanceTransactions,
    fetchPayouts,
    fetchDisputes,
    syncCommissionFromStripe,
    reconcileBookings,
    getPaymentDetails,
    getCommissionBreakdown
  };
};

export default useStripeCommissionTracking;

