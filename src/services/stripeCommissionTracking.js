/**
 * Stripe Commission Tracking Service
 * Enhanced commission tracking using Stripe API for accurate financial data
 */
import { supabase } from '../lib/supabase';

class StripeCommissionTracking {
  /**
   * Get Stripe API endpoint URL
   */
  static getStripeApiUrl(endpoint) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }
    return `${supabaseUrl}/functions/v1/${endpoint}`;
  }

  /**
   * Get authenticated session
   */
  static async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User must be authenticated');
    }
    return session;
  }

  /**
   * Call unified Stripe API proxy Edge Function
   * This single function handles all Stripe API calls securely
   */
  static async callStripeAPI(action, params = {}) {
    const session = await this.getSession();
    const functionUrl = this.getStripeApiUrl('stripe-api-proxy');
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || session.access_token
      },
      body: JSON.stringify({
        action, // e.g., 'get_payment_intent', 'list_balance_transactions', etc.
        ...params
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Stripe API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch comprehensive payment data from Stripe
   * Includes: Payment Intent, Charge, Balance Transaction, Application Fee
   */
  /**
   * Fetch comprehensive payment data from Stripe
   * Includes: Payment Intent, Charge, Balance Transaction, Application Fee, Refunds, Disputes
   */
  static async getPaymentDetails(paymentIntentId) {
    try {
      // The Edge Function will automatically expand all related objects
      const data = await this.callStripeAPI('get_payment_intent', {
        payment_intent_id: paymentIntentId
      });

      // Extract nested data from expanded objects
      const paymentIntent = data;
      const charge = typeof paymentIntent.latest_charge === 'string' 
        ? null 
        : paymentIntent.latest_charge;
      const balanceTransaction = charge?.balance_transaction 
        ? (typeof charge.balance_transaction === 'string' ? null : charge.balance_transaction)
        : null;
      
      // Get transfer information (for Stripe Connect - shows amount sent to partner)
      const transfer = charge?.transfer 
        ? (typeof charge.transfer === 'string' ? null : charge.transfer)
        : null;
      
      // Application fee cannot be expanded directly on PaymentIntent
      // Extract application fee info from metadata or payment intent fields
      let applicationFee = null;
      let applicationFeeBalanceTransaction = null;
      const metadata = paymentIntent.metadata || {};
      
      // Try to get application fee from metadata (stored during payment creation)
      if (metadata.applicationFee || metadata.serviceFee || paymentIntent.application_fee_amount) {
        const feeAmount = metadata.applicationFee 
          ? (parseFloat(metadata.applicationFee) / (metadata.applicationFee.includes('.') ? 1 : 100))
          : (paymentIntent.application_fee_amount ? paymentIntent.application_fee_amount / 100 : null);
        
        if (feeAmount) {
          applicationFee = {
            amount: feeAmount,
            currency: paymentIntent.currency || 'aud',
            id: metadata.applicationFeeId || null
          };
          
          // Try to fetch application fee balance transaction if we have the ID
          if (metadata.applicationFeeBalanceTransactionId) {
            try {
              const appFeeBt = await this.getBalanceTransaction(metadata.applicationFeeBalanceTransactionId);
              applicationFeeBalanceTransaction = appFeeBt;
            } catch (err) {
              console.warn('Could not fetch application fee balance transaction:', err);
            }
          }
        }
      }
      
      const refunds = charge?.refunds?.data || [];
      const dispute = charge?.dispute || null;

      return {
        paymentIntent,
        charge,
        balanceTransaction, // Charge balance transaction (full amount)
        applicationFeeBalanceTransaction, // Application fee balance transaction (what platform receives)
        applicationFee,
        transfer, // Transfer to partner's Connect account
        refunds,
        dispute,
        metadata: paymentIntent.metadata || {}
      };
    } catch (error) {
      console.error('Error fetching payment details:', error);
      throw error;
    }
  }

  /**
   * Get balance transaction details with fee breakdown
   */
  static async getBalanceTransaction(balanceTransactionId) {
    try {
      const data = await this.callStripeAPI('get_balance_transaction', {
        balance_transaction_id: balanceTransactionId
      });

      return {
        id: data.id,
        amount: data.amount / 100, // Convert from cents
        fee: data.fee / 100,
        net: data.net / 100,
        currency: data.currency,
        type: data.type,
        status: data.status,
        created: new Date(data.created * 1000),
        feeDetails: data.fee_details?.map(fee => ({
          type: fee.type,
          amount: fee.amount / 100,
          description: fee.description,
          currency: fee.currency
        })) || [],
        reportingCategory: data.reporting_category
      };
    } catch (error) {
      console.error('Error fetching balance transaction:', error);
      throw error;
    }
  }

  /**
   * Get all balance transactions for a date range
   * Useful for reconciliation
   */
  static async getBalanceTransactions(startDate, endDate, limit = 100) {
    try {
      const data = await this.callStripeAPI('list_balance_transactions', {
        created: {
          gte: Math.floor(new Date(startDate).getTime() / 1000),
          lte: Math.floor(new Date(endDate).getTime() / 1000)
        },
        limit
      });

      return (data.data || []).map(tx => ({
        id: tx.id,
        amount: tx.amount / 100,
        fee: tx.fee / 100,
        net: tx.net / 100,
        currency: tx.currency,
        type: tx.type,
        status: tx.status,
        created: new Date(tx.created * 1000),
        description: tx.description,
        reportingCategory: tx.reporting_category
      }));
    } catch (error) {
      console.error('Error fetching balance transactions:', error);
      throw error;
    }
  }

  /**
   * Get charge details including disputes and refunds
   */
  static async getChargeDetails(chargeId) {
    try {
      const data = await this.callStripeAPI('get_charge', {
        charge_id: chargeId,
        expand: ['balance_transaction', 'refunds', 'dispute']
      });

      return {
        id: data.id,
        amount: data.amount / 100,
        amountRefunded: data.amount_refunded / 100,
        currency: data.currency,
        status: data.status,
        paid: data.paid,
        refunded: data.refunded,
        disputed: !!data.dispute,
        created: new Date(data.created * 1000),
        balanceTransaction: data.balance_transaction,
        refunds: (data.refunds?.data || []).map(refund => ({
          id: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
          reason: refund.reason,
          created: new Date(refund.created * 1000)
        })),
        dispute: data.dispute ? {
          id: data.dispute.id,
          amount: data.dispute.amount / 100,
          status: data.dispute.status,
          reason: data.dispute.reason,
          created: new Date(data.dispute.created * 1000)
        } : null
      };
    } catch (error) {
      console.error('Error fetching charge details:', error);
      throw error;
    }
  }

  /**
   * Get transfer details (for Stripe Connect payouts to partners)
   */
  static async getTransferDetails(transferId) {
    try {
      const data = await this.callStripeAPI('get_transfer', {
        transfer_id: transferId
      });

      return {
        id: data.id,
        amount: data.amount / 100,
        currency: data.currency,
        destination: data.destination,
        status: data.status,
        created: new Date(data.created * 1000),
        reversals: (data.reversals?.data || []).map(reversal => ({
          id: reversal.id,
          amount: reversal.amount / 100,
          status: reversal.status,
          created: new Date(reversal.created * 1000)
        }))
      };
    } catch (error) {
      console.error('Error fetching transfer details:', error);
      throw error;
    }
  }

  /**
   * Get payout details (platform payouts from Stripe)
   */
  static async getPayoutDetails(payoutId) {
    try {
      const data = await this.callStripeAPI('get_payout', {
        payout_id: payoutId
      });

      return {
        id: data.id,
        amount: data.amount / 100,
        currency: data.currency,
        status: data.status,
        arrivalDate: new Date(data.arrival_date * 1000),
        created: new Date(data.created * 1000),
        description: data.description,
        method: data.method,
        type: data.type
      };
    } catch (error) {
      console.error('Error fetching payout details:', error);
      throw error;
    }
  }

  /**
   * Get all payouts for a date range (platform payouts)
   */
  static async getPayouts(startDate, endDate, limit = 100) {
    try {
      const data = await this.callStripeAPI('list_payouts', {
        created: {
          gte: Math.floor(new Date(startDate).getTime() / 1000),
          lte: Math.floor(new Date(endDate).getTime() / 1000)
        },
        limit
      });

      return (data.data || []).map(payout => ({
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        status: payout.status,
        arrivalDate: new Date(payout.arrival_date * 1000),
        created: new Date(payout.created * 1000),
        description: payout.description,
        method: payout.method,
        type: payout.type
      }));
    } catch (error) {
      console.error('Error fetching payouts:', error);
      throw error;
    }
  }

  /**
   * Get payouts from a Stripe Connect account (host withdrawals to bank)
   * @param {string} connectAccountId - Stripe Connect account ID
   * @param {Date|string} startDate - Start date for payouts
   * @param {Date|string} endDate - End date for payouts
   * @param {number} limit - Maximum number of payouts to return
   * @returns {Promise<Array>} Array of payout objects
   */
  static async getConnectAccountPayouts(connectAccountId, startDate, endDate, limit = 100) {
    try {
      if (!connectAccountId) {
        return [];
      }

      const data = await this.callStripeAPI('list_connect_payouts', {
        stripe_account_id: connectAccountId,
        created: {
          gte: Math.floor(new Date(startDate).getTime() / 1000),
          lte: Math.floor(new Date(endDate).getTime() / 1000)
        },
        limit
      });

      return (data.data || []).map(payout => ({
        id: payout.id,
        amount: payout.amount / 100,
        currency: payout.currency,
        status: payout.status,
        arrivalDate: new Date(payout.arrival_date * 1000),
        created: new Date(payout.created * 1000),
        description: payout.description,
        method: payout.method,
        type: payout.type,
        connectAccountId
      }));
    } catch (error) {
      console.error(`Error fetching Connect account payouts for ${connectAccountId}:`, error);
      // Return empty array instead of throwing to allow graceful degradation
      return [];
    }
  }

  /**
   * Get disputes/chargebacks for a date range
   */
  static async getDisputes(startDate, endDate, limit = 100) {
    try {
      const data = await this.callStripeAPI('list_disputes', {
        created: {
          gte: Math.floor(new Date(startDate).getTime() / 1000),
          lte: Math.floor(new Date(endDate).getTime() / 1000)
        },
        limit
      });

      return (data.data || []).map(dispute => ({
        id: dispute.id,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        status: dispute.status,
        reason: dispute.reason,
        created: new Date(dispute.created * 1000),
        chargeId: dispute.charge,
        paymentIntentId: dispute.payment_intent
      }));
    } catch (error) {
      console.error('Error fetching disputes:', error);
      throw error;
    }
  }

  /**
   * Calculate commission breakdown from Stripe data
   * For Stripe Connect destination charges, we need to:
   * 1. Use the APPLICATION FEE balance transaction (not the charge balance transaction)
   * 2. Get the transfer amount (what was sent to partner)
   * 3. Calculate net platform earnings correctly
   */
  static calculateCommissionBreakdown(paymentData) {
    const { 
      paymentIntent, 
      charge, 
      balanceTransaction, // Charge balance transaction (full amount)
      applicationFeeBalanceTransaction, // Application fee balance transaction (what platform receives)
      transferBalanceTransaction,
      applicationFee, 
      metadata, 
      transfer 
    } = paymentData;

    // Extract commission from metadata
    const partnerFee = metadata.partnerFee 
      ? (parseFloat(metadata.partnerFee) / (metadata.partnerFee.includes('.') ? 1 : 100))
      : null;

    const serviceFee = metadata.serviceFee
      ? (parseFloat(metadata.serviceFee) / (metadata.serviceFee.includes('.') ? 1 : 100))
      : null;

    const processingFee = metadata.paymentProcessingFee
      ? (parseFloat(metadata.paymentProcessingFee) / (metadata.paymentProcessingFee.includes('.') ? 1 : 100))
      : null;

    // Calculate gross application fee
    const applicationFeeGross = (serviceFee || 0) + (processingFee || 0) + (partnerFee || 0);

    // Get transfer amount (what was sent to partner's Connect account)
    let transferAmount = null;
    if (transfer) {
      const transferObj = typeof transfer === 'string' ? null : transfer;
      if (transferObj) {
        transferAmount = transferObj.amount / 100;
      }
    } else if (charge?.transfer) {
      const transferObj = typeof charge.transfer === 'string' ? null : charge.transfer;
      if (transferObj) {
        transferAmount = transferObj.amount / 100;
      }
    }

    // CRITICAL: Use APPLICATION FEE balance transaction, not charge balance transaction
    // For destination charges:
    // - Charge balance transaction = full transaction amount (WRONG to use for app fee)
    // - Application fee balance transaction = application fee amount (CORRECT)
    let netApplicationFee = null;
    let stripeFees = null;
    let netCommission = null;

    // Priority 1: Use application fee balance transaction if available
    // BUT: For Stripe Connect, fees are charged on the FULL transaction amount
    // So we need to use the CHARGE balance transaction's fees, not proportional
    if (applicationFeeBalanceTransaction) {
      const appFeeBt = typeof applicationFeeBalanceTransaction === 'string' 
        ? null 
        : applicationFeeBalanceTransaction;
      
      if (appFeeBt) {
        // This is the correct balance transaction for application fee NET amount
        // Stripe returns amounts in cents, so convert to dollars
        netApplicationFee = (appFeeBt.net || 0) / 100;
        
        // For Stripe Connect destination charges, Stripe charges fees on the FULL transaction
        // These fees are deducted from the platform's balance
        // So we should use the FULL fees from the charge balance transaction
        if (balanceTransaction && paymentIntent?.amount) {
          const bt = typeof balanceTransaction === 'string' ? null : balanceTransaction;
          if (bt) {
            // Use the FULL fees from the charge balance transaction
            // Stripe deducts these fees from the platform's balance
            stripeFees = (bt.fee || 0) / 100;
            
            // Recalculate net application fee: Gross - Full Stripe Fees
            // This is what the platform actually keeps after Stripe deducts fees
            netApplicationFee = applicationFeeGross - stripeFees;
          } else {
            stripeFees = (appFeeBt.fee || 0) / 100;
            netApplicationFee = applicationFeeGross - stripeFees;
          }
        } else {
          stripeFees = (appFeeBt.fee || 0) / 100;
          netApplicationFee = applicationFeeGross - stripeFees;
        }
        
        // Calculate commission portion
        if (applicationFeeGross > 0 && partnerFee && netApplicationFee !== null) {
          const commissionRatio = partnerFee / applicationFeeGross;
          netCommission = netApplicationFee * commissionRatio;
        }
      }
    }
    // Priority 2: Calculate from charge balance transaction
    else if (balanceTransaction && applicationFeeGross > 0 && paymentIntent?.amount) {
      const bt = typeof balanceTransaction === 'string' ? null : balanceTransaction;
      
      if (bt) {
        // This is the charge balance transaction (full amount)
        // For Stripe Connect destination charges, Stripe charges fees on the FULL transaction
        // These fees are deducted from the platform's balance
        const totalFees = (bt.fee || 0) / 100; // Already converted in getBalanceTransaction
        
        // Use the FULL fees - Stripe deducts these from the platform's balance
        stripeFees = totalFees;
        
        // Net application fee = Gross - Full Stripe Fees
        netApplicationFee = applicationFeeGross - stripeFees;
        
        // Calculate commission portion
        if (partnerFee && netApplicationFee !== null && netApplicationFee > 0) {
          const commissionRatio = partnerFee / applicationFeeGross;
          netCommission = netApplicationFee * commissionRatio;
        }
      }
    }
    // Priority 3: Fallback calculation
    else if (applicationFeeGross > 0) {
      // Estimate Stripe fees: 2.9% + $0.30 on the application fee
      stripeFees = (applicationFeeGross * 0.029) + 0.30;
      netApplicationFee = applicationFeeGross - stripeFees;
      
      if (partnerFee) {
        const commissionRatio = partnerFee / applicationFeeGross;
        netCommission = netApplicationFee * commissionRatio;
      }
    }

    // Actual platform earnings = Net Application Fee
    // The transfer to partner is separate (their share of base amount)
    // Platform keeps the net application fee

    return {
      // Gross amounts
      partnerFee: partnerFee || 0,
      serviceFee: serviceFee || 0,
      processingFee: processingFee || 0,
      applicationFeeGross: applicationFeeGross,
      
      // Net amounts (after Stripe fees)
      netApplicationFee: netApplicationFee,
      stripeFees: stripeFees,
      netCommission: netCommission,
      
      // Transfer information
      transferAmount: transferAmount, // Amount transferred to partner's Connect account
      partnerPayout: transferAmount, // Alias for clarity
      
      // Actual platform earnings (net application fee is what platform keeps)
      actualPlatformEarnings: netApplicationFee,
      
      // Metadata
      paymentIntentId: paymentIntent?.id,
      chargeId: charge?.id || paymentIntent?.latest_charge,
      balanceTransactionId: balanceTransaction?.id,
      applicationFeeBalanceTransactionId: applicationFeeBalanceTransaction?.id,
      transferId: transfer?.id || charge?.transfer,
      currency: paymentIntent?.currency || 'aud'
    };
  }

  /**
   * Sync commission data from Stripe to database
   */
  static async syncCommissionFromStripe(bookingId, paymentIntentId) {
    try {
      // Fetch comprehensive payment data
      const paymentData = await this.getPaymentDetails(paymentIntentId);
      
      // Calculate commission breakdown
      const breakdown = this.calculateCommissionBreakdown(paymentData);
      
      // Update database
      const { error } = await supabase
        .from('bookings')
        .update({
          platform_earnings: breakdown.netCommission,
          net_application_fee: breakdown.netApplicationFee,
          stripe_fees: breakdown.stripeFees,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) {
        throw error;
      }

      return {
        success: true,
        breakdown,
        syncedAt: new Date()
      };
    } catch (error) {
      console.error('Error syncing commission from Stripe:', error);
      throw error;
    }
  }

  /**
   * Get commission summary for date range using Stripe data
   */
  static async getCommissionSummary(startDate, endDate) {
    try {
      // Get all balance transactions for the period
      const transactions = await this.getBalanceTransactions(startDate, endDate, 1000);
      
      // Filter for application fees
      const applicationFeeTransactions = transactions.filter(
        tx => tx.type === 'application_fee' || tx.reportingCategory === 'charge'
      );

      const summary = {
        totalGross: 0,
        totalFees: 0,
        totalNet: 0,
        transactionCount: applicationFeeTransactions.length,
        transactions: applicationFeeTransactions
      };

      applicationFeeTransactions.forEach(tx => {
        summary.totalGross += tx.amount;
        summary.totalFees += tx.fee;
        summary.totalNet += tx.net;
      });

      return summary;
    } catch (error) {
      console.error('Error getting commission summary:', error);
      throw error;
    }
  }

  /**
   * Reconcile database bookings with Stripe transactions
   */
  static async reconcileBookings(bookingIds = null) {
    try {
      // Get bookings that need reconciliation
      let query = supabase
        .from('bookings')
        .select('id, stripe_payment_intent_id, commission_partner, platform_earnings')
        .not('stripe_payment_intent_id', 'is', null);

      if (bookingIds) {
        query = query.in('id', bookingIds);
      }

      const { data: bookings, error } = await query;

      if (error) throw error;

      const results = {
        total: bookings.length,
        synced: 0,
        errors: 0,
        discrepancies: []
      };

      // Sync each booking
      for (const booking of bookings) {
        try {
          const syncResult = await this.syncCommissionFromStripe(
            booking.id,
            booking.stripe_payment_intent_id
          );

          // Check for discrepancies
          if (booking.platform_earnings && syncResult.breakdown.netCommission) {
            const diff = Math.abs(booking.platform_earnings - syncResult.breakdown.netCommission);
            if (diff > 0.01) { // More than 1 cent difference
              results.discrepancies.push({
                bookingId: booking.id,
                databaseValue: booking.platform_earnings,
                stripeValue: syncResult.breakdown.netCommission,
                difference: diff
              });
            }
          }

          results.synced++;
        } catch (syncError) {
          console.error(`Error syncing booking ${booking.id}:`, syncError);
          results.errors++;
        }
      }

      return results;
    } catch (error) {
      console.error('Error reconciling bookings:', error);
      throw error;
    }
  }
}

export default StripeCommissionTracking;

