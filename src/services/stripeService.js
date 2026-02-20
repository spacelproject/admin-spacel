/**
 * Stripe Service
 * Handles all Stripe-related operations including refunds and fee calculations
 */
import { fetchFeeSettings } from '../utils/feeCalculator';

class StripeService {
  /**
   * Process a refund through Stripe
   * @param {string} paymentIntentId - Stripe Payment Intent ID
   * @param {number} amount - Refund amount in cents (optional, if null refunds full amount)
   * @param {string} reason - Refund reason (duplicate, fraudulent, requested_by_customer)
   * @param {string} bookingId - Booking ID (optional, for logging)
   * @param {string} refundType - Refund type ('full', 'partial', 'split_50_50')
   * @param {number} partnerRefundAmount - Partner refund amount in cents (for 50/50 split)
   * @returns {Promise<Object>} Stripe refund object
   */
  static async processRefund(paymentIntentId, amount = null, reason = 'requested_by_customer', bookingId = null, refundType = 'full', partnerRefundAmount = null) {
    try {
      if (!paymentIntentId) {
        throw new Error('Payment intent ID is required');
      }

      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User must be authenticated to process refunds');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('Supabase URL not configured');
      }

      // Call Edge Function to process refund
      const functionUrl = `${supabaseUrl}/functions/v1/stripe-refund`;
      
      const requestBody = {
        payment_intent: paymentIntentId,
        amount: amount,
        reason: reason
      };

      // Add optional parameters for 50/50 split
      if (bookingId) {
        requestBody.booking_id = bookingId;
      }
      if (refundType) {
        requestBody.refund_type = refundType;
      }
      if (partnerRefundAmount !== null) {
        requestBody.partner_refund_amount = partnerRefundAmount;
      }
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || session.access_token
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process refund');
      }

      const refundData = await response.json();
      return refundData;
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Calculate Stripe fees on a given amount
   * Stripe fees: 2.9% + $0.30 per transaction (for Australian cards)
   * @param {number} amount - Amount in dollars
   * @returns {number} Stripe fees in dollars
   */
  /**
   * Calculate Stripe fees on a given amount
   * Uses Stripe's actual fee structure for Australian cards: 2.7% + $0.05
   * For international cards: 2.9% + $0.30
   * 
   * @param {number} amount - Amount in dollars
   * @param {boolean} isInternational - Whether card is international (default: false for AU)
   * @returns {number} Stripe fees in dollars
   */
  static calculateStripeFees(amount, isInternational = false) {
    if (!amount || amount <= 0) return 0;
    
    // Stripe's actual fee structure:
    // Australian cards: 2.7% + $0.05
    // International cards: 2.9% + $0.30
    const PERCENTAGE_RATE = isInternational ? 0.029 : 0.027; // 2.9% or 2.7%
    const FIXED_FEE = isInternational ? 0.30 : 0.05; // $0.30 or $0.05
    
    const percentageFee = amount * PERCENTAGE_RATE;
    const totalFee = percentageFee + FIXED_FEE;
    
    return Math.round(totalFee * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate platform earnings (commission net after Stripe fees)
   * Note: This calculates the commission portion of net application fee.
   * For Stripe Connect, fees are charged on the FULL transaction, not just commission.
   * So we need to calculate the commission's proportional share of net application fee.
   * 
   * @param {number} commissionAmount - Commission amount in dollars (gross)
   * @param {number} applicationFeeGross - Total application fee gross (service + processing + commission)
   * @param {number} netApplicationFee - Net application fee after Stripe fees (optional, will calculate if not provided)
   * @param {number} totalTransaction - Total transaction amount (optional, needed if netApplicationFee not provided)
   * @returns {number} Net platform earnings (commission portion after Stripe fees)
   */
  static calculatePlatformEarnings(commissionAmount, applicationFeeGross = null, netApplicationFee = null, totalTransaction = null) {
    if (!commissionAmount || commissionAmount <= 0) return 0;
    
    // If we have the net application fee, calculate commission's proportional share
    if (netApplicationFee !== null && netApplicationFee !== undefined && applicationFeeGross && applicationFeeGross > 0) {
      const commissionRatio = commissionAmount / applicationFeeGross;
      return Math.max(0, netApplicationFee * commissionRatio);
    }
    
    // Fallback: If we have total transaction, calculate net application fee first
    if (totalTransaction !== null && totalTransaction !== undefined && applicationFeeGross && applicationFeeGross > 0) {
      const stripeFees = this.calculateStripeFees(totalTransaction, false);
      const calculatedNetApplicationFee = Math.max(0, applicationFeeGross - stripeFees);
      const commissionRatio = commissionAmount / applicationFeeGross;
      return Math.max(0, calculatedNetApplicationFee * commissionRatio);
    }
    
    // Last resort: Simple calculation (less accurate, but better than nothing)
    // This assumes fees are only on commission, which is not accurate for Stripe Connect
    const stripeFees = this.calculateStripeFees(commissionAmount, false);
    return Math.max(0, commissionAmount - stripeFees);
  }

  /**
   * Calculate estimated net application fee when Stripe data unavailable
   * Based on: Application Fee Gross - Estimated Stripe Fees
   * @param {number} baseAmount - Base booking amount
   * @param {number} serviceFee - Service fee amount (optional)
   * @param {number} processingFee - Processing fee amount (optional)
   * @param {number} commissionAmount - Commission amount
   * @returns {number} Estimated net application fee
   */
  /**
   * Calculate estimated net application fee
   * Formula: Application Fee Gross - Stripe Fees = Net Application Fee
   * 
   * Flow:
   * 1. Base booking: $100
   * 2. Seeker pays: $114.26 (base + service fee + processing fee)
   * 3. Partner receives: $96 (base - commission)
   * 4. Platform receives: $18.26 gross (service fee + processing fee + commission)
   * 5. Stripe fees deducted: ~$4.52 (on total transaction - actual rate: ~3.96%)
   * 6. Platform net: ~$13.74
   * 
   * Based on actual Stripe payment data analysis:
   * - Actual Stripe fees: ~3.96% of total transaction (higher than standard 2.9% + $0.30)
   * - This accounts for Stripe Connect fees and additional processing costs
   * - For a $114.26 transaction, actual fees are $4.52 vs. estimated $3.61
   * 
   * @param {number} baseAmount - Base booking amount
   * @param {number} serviceFee - Service fee amount (optional, will estimate if null)
   * @param {number} processingFee - Processing fee amount (optional, will estimate if null)
   * @param {number} commissionAmount - Commission amount
   * @returns {number} Estimated net application fee (platform revenue after Stripe fees)
   */
  static async calculateEstimatedNetApplicationFee(baseAmount, serviceFee = null, processingFee = null, commissionAmount = 0) {
    if (!baseAmount || baseAmount <= 0) return 0;
    
    // Fetch current fee settings from database
    const feeSettings = await fetchFeeSettings();
    
    // Step 1: Calculate or use provided fees
    let estimatedServiceFee = serviceFee;
    let estimatedProcessingFee = processingFee;
    
    if (estimatedServiceFee === null || estimatedServiceFee === undefined) {
      estimatedServiceFee = baseAmount * feeSettings.seeker_service_rate;
    }
    
    if (estimatedProcessingFee === null || estimatedProcessingFee === undefined) {
      const totalForProcessingFee = baseAmount + (estimatedServiceFee || 0);
      // Only use percentage-based processing fee (no fixed fee)
      estimatedProcessingFee = totalForProcessingFee * feeSettings.processing_percent;
    }
    
    // Step 2: Calculate application fee gross (platform revenue before Stripe fees)
    // Application Fee Gross = Service Fee + Processing Fee + Commission
    const applicationFeeGross = (estimatedServiceFee || 0) + (estimatedProcessingFee || 0) + (commissionAmount || 0);
    
    // Step 3: Calculate total transaction amount (what seeker pays)
    // Total Transaction = Base Amount + Service Fee + Processing Fee
    const totalTransaction = baseAmount + (estimatedServiceFee || 0) + (estimatedProcessingFee || 0);
    
    // Step 4: Calculate Stripe fees on total transaction
    // For Stripe Connect destination charges, Stripe charges fees on the FULL transaction amount
    // The platform receives the application fee gross, but Stripe deducts fees from platform balance
    // Use actual Stripe fee structure: 2.7% + $0.05 for Australian cards
    const estimatedStripeFees = this.calculateStripeFees(totalTransaction, false); // false = Australian card
    
    // Step 5: Calculate net application fee
    // Net = Application Fee Gross - Stripe Fees
    // Note: In Stripe Connect, the platform receives the application fee gross,
    // but Stripe deducts fees from the platform's balance, so net is gross minus fees
    const netApplicationFee = applicationFeeGross - estimatedStripeFees;
    
    return Math.max(0, netApplicationFee);
  }

  /**
   * Fetch payment intent from Stripe to calculate platform earnings
   * Uses actual Stripe balance transaction data when available for accurate calculation
   * @param {string} paymentIntentId - Stripe Payment Intent ID
   * @param {number} commissionAmount - Commission amount in dollars (to calculate fees on)
   * @returns {Promise<number|null>} Platform earnings in dollars, or null if not found
   */
  static async getPlatformEarningsFromStripe(paymentIntentId, commissionAmount = null) {
    try {
      if (!paymentIntentId) {
        return null;
      }

      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('No session found, cannot fetch Stripe data');
        // Fallback to calculation if we have commission amount
        if (commissionAmount !== null && commissionAmount > 0) {
          return this.calculatePlatformEarnings(commissionAmount);
        }
        return null;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        console.warn('Supabase URL not configured');
        // Fallback to calculation if we have commission amount
        if (commissionAmount !== null && commissionAmount > 0) {
          return this.calculatePlatformEarnings(commissionAmount);
        }
        return null;
      }

      // Call Edge Function to fetch payment intent with balance transaction
      const functionUrl = `${supabaseUrl}/functions/v1/stripe-get-payment-intent`;
      
      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || session.access_token
          },
          body: JSON.stringify({
            payment_intent_id: paymentIntentId
          })
        });

        if (!response.ok) {
          console.warn('Failed to fetch payment intent from Edge Function');
          // Fallback to calculation if we have commission amount
          if (commissionAmount !== null && commissionAmount > 0) {
            return this.calculatePlatformEarnings(commissionAmount);
          }
          return null;
        }

        const data = await response.json();
        
        // Get commission from metadata
        let partnerFee = null;
        if (data?.metadata?.partnerFee) {
          const partnerFeeStr = data.metadata.partnerFee.toString();
          partnerFee = partnerFeeStr.includes('.') 
            ? parseFloat(partnerFeeStr)
            : parseFloat(partnerFeeStr) / 100; // Convert from cents if needed
        } else if (commissionAmount !== null && commissionAmount > 0) {
          partnerFee = commissionAmount;
        }

        // If we have balance transaction data, use it for accurate calculation
        if (data?.balance_transaction && partnerFee) {
          const bt = data.balance_transaction;
          const applicationFeeGross = (data.application_fee_amount || 0) / 100; // Application fee in dollars
          const stripeFeesTotal = (bt.fee || 0) / 100; // Total Stripe fees in dollars
          const netApplicationFee = (bt.net || 0) / 100; // Net platform receives in dollars
          
          // Calculate commission portion of application fee
          // Commission portion = (commission / application fee gross) × net application fee
          if (applicationFeeGross > 0) {
            const commissionRatio = partnerFee / applicationFeeGross;
            const netCommission = netApplicationFee * commissionRatio;
            
            console.log(`💰 Stripe Balance Transaction Analysis:`);
            console.log(`   Application Fee (Gross): $${applicationFeeGross.toFixed(2)}`);
            console.log(`   Stripe Fees (Total): $${stripeFeesTotal.toFixed(2)}`);
            console.log(`   Net Application Fee: $${netApplicationFee.toFixed(2)}`);
            console.log(`   Commission (Gross): $${partnerFee.toFixed(2)}`);
            console.log(`   Commission Ratio: ${(commissionRatio * 100).toFixed(1)}%`);
            console.log(`   Net Commission (from balance tx): $${netCommission.toFixed(2)}`);
            
            return netCommission;
          }
        }
        
        // Fallback: Calculate using estimated Stripe fees
        if (partnerFee) {
          return this.calculatePlatformEarnings(partnerFee);
        }
        
        return null;
      } catch (fetchError) {
        console.warn('Error fetching payment intent metadata:', fetchError);
        // Fallback to calculation if we have commission amount
        if (commissionAmount !== null && commissionAmount > 0) {
          return this.calculatePlatformEarnings(commissionAmount);
        }
        return null;
      }
    } catch (error) {
      console.error('Error getting platform earnings from Stripe:', error);
      // Fallback to calculation if we have commission amount
      if (commissionAmount !== null && commissionAmount > 0) {
        return this.calculatePlatformEarnings(commissionAmount);
      }
      return null;
    }
  }

  /**
   * Get net application fee from Stripe (application fee after Stripe fees)
   * @param {string} paymentIntentId - Stripe Payment Intent ID
   * @returns {Promise<number|null>} Net application fee in dollars, or null if not found
   */
  static async getNetApplicationFeeFromStripe(paymentIntentId) {
    try {
      if (!paymentIntentId) {
        return null;
      }

      const { supabase } = await import('../lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return null;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        return null;
      }

      const functionUrl = `${supabaseUrl}/functions/v1/stripe-get-payment-intent`;
      
      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || session.access_token
          },
          body: JSON.stringify({
            payment_intent_id: paymentIntentId
          })
        });

        if (!response.ok) {
          return null;
        }

        const data = await response.json();
        
        // Get net application fee from balance transaction
        if (data?.balance_transaction?.net) {
          const netApplicationFee = data.balance_transaction.net / 100; // Convert from cents to dollars
          return netApplicationFee;
        }
        
        return null;
      } catch (fetchError) {
        console.warn('Error fetching net application fee from Stripe:', fetchError);
        return null;
      }
    } catch (error) {
      console.error('Error getting net application fee from Stripe:', error);
      return null;
    }
  }

  /**
   * Sync platform earnings and net application fee to database
   * Uses actual Stripe balance transaction data when available for accurate calculation
   * Falls back to estimated calculation if Stripe data unavailable
   * @param {string} bookingId - Booking Reference
   * @param {string} paymentIntentId - Stripe Payment Intent ID (optional, for Stripe verification)
   * @param {number} commissionAmount - Commission amount in dollars (required)
   * @returns {Promise<{platformEarnings: number|null, netApplicationFee: number|null}>} Object with synced values
   */
  static async syncPlatformEarningsFromStripe(bookingId, paymentIntentId = null, commissionAmount = null) {
    try {
      if (!bookingId) {
        return { platformEarnings: null, netApplicationFee: null };
      }

      let platformEarnings = null;
      let netApplicationFee = null;

      // Try to fetch from Stripe with balance transaction data (most accurate)
      if (paymentIntentId) {
        if (commissionAmount !== null && commissionAmount > 0) {
          platformEarnings = await this.getPlatformEarningsFromStripe(paymentIntentId, commissionAmount);
        } else {
          platformEarnings = await this.getPlatformEarningsFromStripe(paymentIntentId);
        }
        
        // Also fetch net application fee
        netApplicationFee = await this.getNetApplicationFeeFromStripe(paymentIntentId);
      }
      
      // Fallback: Calculate using estimated Stripe fees if Stripe data unavailable
      if (platformEarnings === null && commissionAmount !== null && commissionAmount > 0) {
        platformEarnings = this.calculatePlatformEarnings(commissionAmount);
        console.log(`⚠️ Using estimated calculation for booking ${bookingId} (Stripe data unavailable)`);
      }

      // Update the database with both platform earnings and net application fee
      const { supabase } = await import('../lib/supabase');
      const updateData = {
        updated_at: new Date().toISOString()
      };
      
      if (platformEarnings !== null && platformEarnings >= 0) {
        updateData.platform_earnings = platformEarnings;
      }
      
      if (netApplicationFee !== null && netApplicationFee >= 0) {
        updateData.net_application_fee = netApplicationFee;
      }
      
      // Only update if we have at least one value to update
      if (Object.keys(updateData).length > 1) {
        const { error } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', bookingId);

        if (error) {
          console.error('Error updating booking with Stripe data:', error);
          return { platformEarnings: null, netApplicationFee: null };
        }

        if (platformEarnings !== null) {
          console.log(`✅ Synced platform earnings for booking ${bookingId}: $${platformEarnings.toFixed(2)}`);
        }
        if (netApplicationFee !== null) {
          console.log(`✅ Synced net application fee for booking ${bookingId}: $${netApplicationFee.toFixed(2)}`);
        }
      }

      return { platformEarnings, netApplicationFee };
    } catch (error) {
      console.error('Error syncing platform earnings:', error);
      return { platformEarnings: null, netApplicationFee: null };
    }
  }
}

export default StripeService;
