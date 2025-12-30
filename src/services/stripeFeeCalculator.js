/**
 * Stripe Fee Calculator
 * Calculates exact Stripe fees based on Stripe's pricing structure
 * Uses actual Stripe balance transaction data when available
 */

class StripeFeeCalculator {
  /**
   * Calculate Stripe fees based on transaction amount
   * Based on Stripe's standard pricing: 2.7% + 5¢ for domestic cards
   * 
   * @param {number} amount - Transaction amount in dollars
   * @param {boolean} isInternational - Whether card is international
   * @returns {Object} Fee breakdown
   */
  static calculateEstimatedFees(amount, isInternational = false) {
    if (!amount || amount <= 0) {
      return {
        fixedFee: 0,
        percentageFee: 0,
        internationalFee: 0,
        totalFee: 0,
        netAmount: 0
      };
    }

    // Standard pricing: 2.7% + 5¢ for domestic cards
    const DOMESTIC_PERCENTAGE = 0.027; // 2.7%
    const FIXED_FEE = 0.05; // 5¢
    const INTERNATIONAL_ADDITIONAL = 0.015; // +1.5% for international

    const percentageFee = amount * DOMESTIC_PERCENTAGE;
    const fixedFee = FIXED_FEE;
    const internationalFee = isInternational ? (amount * INTERNATIONAL_ADDITIONAL) : 0;
    
    const totalFee = percentageFee + fixedFee + internationalFee;
    const netAmount = amount - totalFee;

    return {
      fixedFee,
      percentageFee,
      internationalFee,
      totalFee,
      netAmount,
      effectiveRate: ((totalFee / amount) * 100).toFixed(2)
    };
  }

  /**
   * Parse actual Stripe fee breakdown from balance transaction
   * Stripe provides fee_details array with exact breakdown
   * 
   * @param {Object} balanceTransaction - Stripe balance transaction object
   * @returns {Object} Parsed fee breakdown
   */
  static parseStripeFeeBreakdown(balanceTransaction) {
    if (!balanceTransaction || !balanceTransaction.fee_details) {
      return null;
    }

    const breakdown = {
      fixedFee: 0,
      percentageFee: 0,
      internationalFee: 0,
      connectFee: 0,
      otherFees: [],
      totalFee: balanceTransaction.fee / 100,
      grossAmount: balanceTransaction.amount / 100,
      netAmount: balanceTransaction.net / 100
    };

    balanceTransaction.fee_details.forEach(fee => {
      const feeAmount = fee.amount / 100;
      const description = (fee.description || '').toLowerCase();

      // Fixed fee component (typically 5¢)
      if (feeAmount <= 0.06 || 
          description.includes('fixed') || 
          description.includes('$0.05') ||
          description.includes('5 cent')) {
        breakdown.fixedFee += feeAmount;
      }
      // International fee
      else if (fee.type === 'international' || 
               description.includes('international') ||
               description.includes('cross-border')) {
        breakdown.internationalFee += feeAmount;
      }
      // Connect fee
      else if (fee.type === 'connect_collection_transfer' ||
               description.includes('connect')) {
        breakdown.connectFee += feeAmount;
      }
      // Percentage-based fee (the 2.7% part)
      else if (fee.type === 'stripe_fee' || fee.type === 'application_fee') {
        breakdown.percentageFee += feeAmount;
      }
      // Other fees
      else {
        breakdown.otherFees.push({
          type: fee.type,
          amount: feeAmount,
          description: fee.description || fee.type
        });
      }
    });

    // Calculate effective rates
    if (breakdown.grossAmount > 0) {
      breakdown.effectiveRate = ((breakdown.totalFee / breakdown.grossAmount) * 100).toFixed(2);
      
      // Calculate percentage rate (excluding fixed fee)
      const amountAfterFixed = breakdown.grossAmount - breakdown.fixedFee;
      if (amountAfterFixed > 0) {
        breakdown.percentageRate = ((breakdown.percentageFee / amountAfterFixed) * 100).toFixed(2);
      }
    }

    return breakdown;
  }

  /**
   * Compare estimated vs actual Stripe fees
   * Useful for identifying discrepancies
   * 
   * @param {number} amount - Transaction amount
   * @param {Object} actualBreakdown - Actual fee breakdown from Stripe
   * @returns {Object} Comparison
   */
  static compareFees(amount, actualBreakdown) {
    const estimated = this.calculateEstimatedFees(amount, actualBreakdown?.internationalFee > 0);
    
    return {
      estimated,
      actual: actualBreakdown,
      difference: actualBreakdown ? {
        fixedFee: actualBreakdown.fixedFee - estimated.fixedFee,
        percentageFee: actualBreakdown.percentageFee - estimated.percentageFee,
        totalFee: actualBreakdown.totalFee - estimated.totalFee,
        percentageDiff: actualBreakdown.totalFee > 0 
          ? (((actualBreakdown.totalFee - estimated.totalFee) / actualBreakdown.totalFee) * 100).toFixed(2)
          : '0.00'
      } : null
    };
  }
}

export default StripeFeeCalculator;

