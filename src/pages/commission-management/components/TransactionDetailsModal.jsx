import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import { useToast } from '../../../components/ui/Toast';
import StripeCommissionTracking from '../../../services/stripeCommissionTracking';

const TransactionDetailsModal = ({ isOpen, onClose, paymentIntentId, bookingData }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [transactionData, setTransactionData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (isOpen && paymentIntentId) {
      fetchTransactionDetails();
    } else {
      setTransactionData(null);
      setError(null);
    }
  }, [isOpen, paymentIntentId]);

  const fetchTransactionDetails = async () => {
    if (!paymentIntentId) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch comprehensive payment data from Stripe
      const paymentData = await StripeCommissionTracking.getPaymentDetails(paymentIntentId);
      
      // Get charge details if available
      let chargeDetails = null;
      if (paymentData.charge) {
        const chargeId = typeof paymentData.charge === 'string' 
          ? paymentData.charge 
          : paymentData.charge.id;
        if (chargeId) {
          try {
            chargeDetails = await StripeCommissionTracking.getChargeDetails(chargeId);
          } catch (err) {
            console.warn('Could not fetch charge details:', err);
          }
        }
      }

      // Get balance transaction details if available
      // IMPORTANT: Use the CHARGE balance transaction (not application fee balance transaction)
      // for fee details, as Stripe charges fees on the full transaction amount
      let balanceTransactionDetails = null;
      if (paymentData.balanceTransaction) {
        const btId = typeof paymentData.balanceTransaction === 'string'
          ? paymentData.balanceTransaction
          : paymentData.balanceTransaction.id;
        if (btId) {
          try {
            balanceTransactionDetails = await StripeCommissionTracking.getBalanceTransaction(btId);
          } catch (err) {
            console.warn('Could not fetch balance transaction details:', err);
          }
        }
      }

      // Also get application fee balance transaction if available
      let applicationFeeBalanceTransactionDetails = null;
      if (paymentData.applicationFeeBalanceTransaction) {
        const appFeeBtId = typeof paymentData.applicationFeeBalanceTransaction === 'string'
          ? paymentData.applicationFeeBalanceTransaction
          : paymentData.applicationFeeBalanceTransaction.id;
        if (appFeeBtId) {
          try {
            applicationFeeBalanceTransactionDetails = await StripeCommissionTracking.getBalanceTransaction(appFeeBtId);
          } catch (err) {
            console.warn('Could not fetch application fee balance transaction details:', err);
          }
        }
      }

      // Calculate commission breakdown
      const breakdown = StripeCommissionTracking.calculateCommissionBreakdown(paymentData);

      setTransactionData({
        paymentIntent: paymentData.paymentIntent,
        charge: chargeDetails || paymentData.charge,
        balanceTransaction: balanceTransactionDetails || paymentData.balanceTransaction, // Charge balance transaction (for fee details)
        applicationFeeBalanceTransaction: applicationFeeBalanceTransactionDetails || paymentData.applicationFeeBalanceTransaction, // Application fee balance transaction
        applicationFee: paymentData.applicationFee,
        metadata: paymentData.metadata,
        breakdown,
        bookingData
      });
    } catch (err) {
      console.error('Error fetching transaction details:', err);
      setError(err.message);
      showToast('Failed to fetch transaction details: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
    return date.toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card rounded-lg border border-border shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-card-foreground">Transaction Details</h2>
            <div className="text-sm text-muted-foreground mt-1 space-y-1">
              {bookingData?.booking_reference && (
                <p>
                  Reference: <span className="font-mono text-primary">{bookingData.booking_reference}</span>
                </p>
              )}
              <p>
                Payment Intent: <span className="font-mono">{paymentIntentId}</span>
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={onClose}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && <LoadingState message="Fetching transaction details from Stripe..." />}
          
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-4">
              <div className="flex items-center space-x-2">
                <Icon name="AlertCircle" className="text-error" />
                <p className="text-error">{error}</p>
              </div>
            </div>
          )}

          {transactionData && (
            <>
              {/* Tabs */}
              <div className="flex items-center space-x-1 mb-6 bg-muted rounded-lg p-1">
                {[
                  { id: 'overview', label: 'Overview', icon: 'Info' },
                  { id: 'fees', label: 'Fees Breakdown', icon: 'DollarSign' },
                  ...(bookingData?.isPartialRefund || bookingData?.is50_50Split || bookingData?.isFullRefund 
                    ? [{ id: 'refund', label: 'Refund Details', icon: 'RefreshCw' }] 
                    : []),
                  { id: 'stripe', label: 'Stripe Data', icon: 'CreditCard' },
                  { id: 'metadata', label: 'Metadata', icon: 'FileText' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-smooth
                      ${activeTab === tab.id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      }
                    `}
                  >
                    <Icon name={tab.icon} size={16} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Refund Information - Enhanced */}
                  {(bookingData?.isPartialRefund || bookingData?.is50_50Split || bookingData?.isFullRefund) && (
                    <div className={`rounded-lg p-5 border-2 ${
                      bookingData?.isFullRefund 
                        ? 'bg-error/10 border-error/30' 
                        : 'bg-warning/10 border-warning/30'
                    }`}>
                      <div className="flex items-center space-x-3 mb-4">
                        <div className={`p-2 rounded-lg ${
                          bookingData?.isFullRefund 
                            ? 'bg-error/20' 
                            : 'bg-warning/20'
                        }`}>
                          <Icon name={bookingData?.isFullRefund ? "XCircle" : "RefreshCw"} size={24} className={
                            bookingData?.isFullRefund ? "text-error" : "text-warning"
                          } />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-card-foreground">
                            {bookingData?.is50_50Split 
                              ? '50/50 Split Refund' 
                              : bookingData?.isPartialRefund 
                              ? 'Partial Refund' 
                              : 'Full Refund'}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {bookingData?.isFullRefund 
                              ? 'All funds have been refunded to the customer' 
                              : bookingData?.is50_50Split
                              ? 'Remaining amount split equally between seeker and partner'
                              : 'Partial amount refunded to the customer'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        {bookingData?.is50_50Split ? (
                          <>
                            <div className="bg-background/50 rounded-lg p-3 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Seeker Refund Amount:</span>
                                <span className="text-base font-bold text-card-foreground">
                                  {formatCurrency(bookingData?.refundAmount ?? bookingData?.raw?.refund_amount ?? 0)}
                                </span>
                              </div>
                              {(bookingData?.refundAmount === 0 || bookingData?.raw?.refund_amount === 0) && (
                                <p className="text-xs text-muted-foreground italic mt-1">
                                  Seeker's share recorded (may be $0.00 if already balanced or no refund needed)
                                </p>
                              )}
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-muted-foreground">Partner Refund Amount:</span>
                                <span className="text-base font-bold text-card-foreground">{formatCurrency(bookingData?.transferReversalAmount || 0)}</span>
                              </div>
                              <div className="border-t border-border pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-semibold text-card-foreground">Total Refunded:</span>
                                  <span className="text-lg font-bold text-card-foreground">
                                    {formatCurrency((bookingData?.refundAmount || 0) + (bookingData?.transferReversalAmount || 0))}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <p className="text-xs text-blue-800">
                                <strong>How 50/50 Split Works:</strong> Platform keeps the full application fee. The remaining amount (after platform fee) is split equally between the seeker and partner.
                              </p>
                            </div>
                          </>
                        ) : (
                          <div className="bg-background/50 rounded-lg p-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-muted-foreground">Refund Amount:</span>
                              <span className="text-lg font-bold text-card-foreground">{formatCurrency(bookingData?.refundAmount || 0)}</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Refund Details */}
                        <div className="border-t border-border pt-3 space-y-2">
                          {bookingData?.raw?.stripe_refund_id && (
                            <div className="flex justify-between items-start">
                              <span className="text-xs text-muted-foreground">Stripe Refund ID:</span>
                              <span className="text-xs font-mono text-card-foreground break-all text-right max-w-[60%]">
                                {bookingData.raw.stripe_refund_id}
                              </span>
                            </div>
                          )}
                          {bookingData?.raw?.stripe_transfer_reversal_id && (
                            <div className="flex justify-between items-start">
                              <span className="text-xs text-muted-foreground">Transfer Reversal ID:</span>
                              <span className="text-xs font-mono text-card-foreground break-all text-right max-w-[60%]">
                                {bookingData.raw.stripe_transfer_reversal_id}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Platform Earnings Note */}
                        {!bookingData?.isFullRefund && (
                          <div className="bg-success/10 border border-success/20 rounded-lg p-3 mt-3">
                            <div className="flex items-start space-x-2">
                              <Icon name="Info" size={16} className="text-success mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-success mb-1">Platform Earnings Protected</p>
                                <p className="text-xs text-muted-foreground">
                                  Platform keeps the full application fee of <strong>{formatCurrency(transactionData.breakdown?.netApplicationFee)}</strong> even after this partial refund. This amount is included in your Net Platform Earnings.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {bookingData?.isFullRefund && (
                          <div className="bg-error/10 border border-error/20 rounded-lg p-3 mt-3">
                            <div className="flex items-start space-x-2">
                              <Icon name="AlertCircle" size={16} className="text-error mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-error mb-1">Full Refund Processed</p>
                                <p className="text-xs text-muted-foreground">
                                  All funds have been refunded. Platform earnings for this transaction are $0.00.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                      <p className="text-2xl font-bold text-card-foreground">
                        {formatCurrency(transactionData.paymentIntent?.amount / 100)}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <p className="text-lg font-semibold text-card-foreground capitalize">
                        {transactionData.paymentIntent?.status || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Platform Earnings</p>
                      <p className="text-2xl font-bold text-success">
                        {formatCurrency(transactionData.breakdown?.netApplicationFee)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {bookingData?.isPartialRefund || bookingData?.is50_50Split 
                          ? 'Net Application Fee (Kept)' 
                          : 'Net Application Fee'}
                      </p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-sm text-muted-foreground mb-1">Stripe Fees</p>
                      <p className="text-lg font-semibold text-error">
                        {formatCurrency(transactionData.breakdown?.stripeFees)}
                      </p>
                    </div>
                  </div>

                  {/* Commission Breakdown */}
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-semibold text-card-foreground mb-4">Commission Breakdown</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Fee:</span>
                        <span className="font-medium">{formatCurrency(transactionData.breakdown?.serviceFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processing Fee:</span>
                        <span className="font-medium">{formatCurrency(transactionData.breakdown?.processingFee)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Partner Commission:</span>
                        <span className="font-medium">{formatCurrency(transactionData.breakdown?.partnerFee)}</span>
                      </div>
                      <div className="border-t border-border pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-semibold">Total Application Fee:</span>
                          <span className="font-bold">{formatCurrency(transactionData.breakdown?.applicationFeeGross)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Fees Breakdown Tab */}
              {activeTab === 'fees' && (
                <div className="space-y-6">
                  {/* Complete Transaction Flow */}
                  <div className="border border-border rounded-lg p-6 bg-gradient-to-br from-muted/30 to-muted/10">
                    <h3 className="font-semibold text-card-foreground mb-6 text-lg">Complete Transaction Flow</h3>
                    
                    {/* Step 1: Total Amount Paid */}
                    <div className="mb-4 pb-4 border-b border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">1</div>
                          <span className="font-medium text-card-foreground">Total Amount Paid by Customer</span>
                        </div>
                        <span className="text-xl font-bold text-card-foreground">
                          {formatCurrency(transactionData.paymentIntent?.amount / 100)}
                        </span>
                      </div>
                    </div>

                    {/* Step 2: Transfer to Partner */}
                    {transactionData.breakdown?.transferAmount && (
                      <div className="mb-4 pb-4 border-b border-border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">2</div>
                            <span className="font-medium text-card-foreground">Transferred to Partner (Stripe Connect)</span>
                          </div>
                          <span className="text-lg font-semibold text-primary">
                            {formatCurrency(transactionData.breakdown.transferAmount)}
                          </span>
                        </div>
                        {transactionData.breakdown.transferId && (
                          <p className="text-xs text-muted-foreground ml-8 font-mono">
                            Transfer ID: {transactionData.breakdown.transferId}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Step 3: Application Fee */}
                    <div className="mb-4 pb-4 border-b border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">3</div>
                          <span className="font-medium text-card-foreground">Application Fee (Platform Receives)</span>
                        </div>
                        <span className="text-lg font-semibold text-success">
                          {formatCurrency(transactionData.breakdown?.applicationFeeGross)}
                        </span>
                      </div>
                      <div className="ml-8 mt-2 space-y-1 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Service Fee:</span>
                          <span>{formatCurrency(transactionData.breakdown?.serviceFee)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Processing Fee:</span>
                          <span>{formatCurrency(transactionData.breakdown?.processingFee)}</span>
                        </div>
                        {transactionData.breakdown?.partnerFee > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Partner Commission:</span>
                            <span>{formatCurrency(transactionData.breakdown?.partnerFee)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Step 4: Stripe Fees Breakdown */}
                    {(() => {
                      // Parse fee details from CHARGE balance transaction (fees on full transaction)
                      // Stripe charges fees on the FULL transaction amount, not just the application fee
                      let processingFees = 0;
                      let taxFees = 0;
                      let otherFees = [];
                      let totalStripeFees = 0;

                      // Use charge balance transaction fee details (fees on full transaction)
                      if (transactionData.balanceTransaction?.feeDetails && transactionData.balanceTransaction.feeDetails.length > 0) {
                        transactionData.balanceTransaction.feeDetails.forEach((fee) => {
                          const feeType = (fee.description || fee.type || '').toLowerCase();
                          const isTax = feeType.includes('tax') || feeType.includes('gst') || feeType.includes('vat');
                          const isProcessing = feeType.includes('processing') || 
                                               feeType.includes('stripe fee') || 
                                               fee.type === 'stripe_fee' ||
                                               fee.type === 'application_fee';
                          
                          if (isTax) {
                            taxFees += fee.amount || 0;
                            totalStripeFees += fee.amount || 0;
                          } else if (isProcessing) {
                            processingFees += fee.amount || 0;
                            totalStripeFees += fee.amount || 0;
                          } else {
                            otherFees.push(fee);
                            totalStripeFees += fee.amount || 0;
                          }
                        });
                      } else if (transactionData.balanceTransaction?.fee) {
                        // Use total fee from charge balance transaction
                        totalStripeFees = transactionData.balanceTransaction.fee;
                        // Estimate breakdown (typically ~91% processing, ~9% tax)
                        processingFees = totalStripeFees * 0.91;
                        taxFees = totalStripeFees * 0.09;
                      } else if (transactionData.breakdown?.stripeFees) {
                        // Fallback: use breakdown stripe fees
                        totalStripeFees = transactionData.breakdown.stripeFees;
                        processingFees = totalStripeFees * 0.91;
                        taxFees = totalStripeFees * 0.09;
                      }

                      // For Stripe Connect, fees are charged on the FULL transaction
                      // Show the ACTUAL fees from the charge balance transaction
                      // The breakdown.stripeFees might be proportional, but we want to show the real fees
                      return totalStripeFees > 0 ? (
                        <div className="mb-4 pb-4 border-b border-border">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-error/20 flex items-center justify-center text-xs font-semibold text-error">4</div>
                              <span className="font-medium text-card-foreground">Stripe Fees (Deducted from Platform)</span>
                            </div>
                            <span className="text-lg font-semibold text-error">
                              -{formatCurrency(totalStripeFees)}
                            </span>
                          </div>
                          <div className="ml-8 space-y-2">
                            {processingFees > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Stripe Processing Fees:</span>
                                <span className="font-medium text-error">-{formatCurrency(processingFees)}</span>
                              </div>
                            )}
                            {taxFees > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Tax:</span>
                                <span className="font-medium text-error">-{formatCurrency(taxFees)}</span>
                              </div>
                            )}
                            {otherFees.map((fee, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{fee.description || fee.type || 'Fee'}:</span>
                                <span className="font-medium text-error">-{formatCurrency(fee.amount)}</span>
                              </div>
                            ))}
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="text-xs text-muted-foreground">
                                Note: Stripe charges fees on the full transaction amount ({formatCurrency(transactionData.paymentIntent?.amount / 100)}). 
                                These fees are deducted from the platform's balance.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Step 5: Final Platform Earnings */}
                    <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center text-xs font-semibold text-white">5</div>
                          <span className="font-semibold text-card-foreground">Platform Keeps (Net Application Fee)</span>
                        </div>
                        <span className="text-2xl font-bold text-success">
                          {formatCurrency(transactionData.breakdown?.netApplicationFee)}
                        </span>
                      </div>
                    </div>

                    {/* Refund Information in Fees Breakdown */}
                    {(bookingData?.isPartialRefund || bookingData?.is50_50Split || bookingData?.isFullRefund) && (
                      <div className={`mt-4 p-4 rounded-lg border-2 ${
                        bookingData?.isFullRefund 
                          ? 'bg-error/10 border-error/30' 
                          : 'bg-warning/10 border-warning/30'
                      }`}>
                        <h4 className="font-semibold text-card-foreground mb-3 flex items-center space-x-2">
                          <Icon name={bookingData?.isFullRefund ? "XCircle" : "RefreshCw"} size={18} className={
                            bookingData?.isFullRefund ? "text-error" : "text-warning"
                          } />
                          <span>Refund Details</span>
                        </h4>
                        <div className="space-y-2 text-sm">
                        {bookingData?.is50_50Split ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Seeker Refund:</span>
                              <span className="font-medium">
                                {formatCurrency(bookingData?.refundAmount ?? bookingData?.raw?.refund_amount ?? 0)}
                              </span>
                            </div>
                            {(bookingData?.refundAmount === 0 || bookingData?.raw?.refund_amount === 0) && (
                              <p className="text-xs text-muted-foreground italic mb-1">
                                Seeker's share recorded (may be $0.00 if already balanced)
                              </p>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Partner Refund:</span>
                              <span className="font-medium">
                                {formatCurrency(bookingData?.transferReversalAmount ?? bookingData?.raw?.transfer_reversal_amount ?? 0)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-border">
                              <span className="font-semibold">Total Refunded:</span>
                              <span className="font-bold">
                                {formatCurrency(
                                  (bookingData?.refundAmount ?? bookingData?.raw?.refund_amount ?? 0) + 
                                  (bookingData?.transferReversalAmount ?? bookingData?.raw?.transfer_reversal_amount ?? 0)
                                )}
                              </span>
                            </div>
                          </>
                        ) : (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Refund Amount:</span>
                              <span className="font-medium">{formatCurrency(bookingData?.refundAmount || 0)}</span>
                            </div>
                          )}
                          {!bookingData?.isFullRefund && (
                            <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                              Platform application fee remains: {formatCurrency(transactionData.breakdown?.applicationFeeGross)}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Summary Box */}
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground text-center">
                        <strong>Summary:</strong> Customer paid {formatCurrency(transactionData.paymentIntent?.amount / 100)}
                        {bookingData?.isFullRefund ? ' → Fully refunded' : bookingData?.isPartialRefund || bookingData?.is50_50Split ? ` → ${formatCurrency((bookingData?.refundAmount || 0) + (bookingData?.transferReversalAmount || 0))} refunded` : ''} → 
                        Partner received {formatCurrency(transactionData.breakdown?.transferAmount || 0)} → 
                        Platform application fee {formatCurrency(transactionData.breakdown?.applicationFeeGross)} → 
                        Stripe fees {formatCurrency(transactionData.breakdown?.stripeFees)} → 
                        Platform keeps {formatCurrency(transactionData.breakdown?.netApplicationFee)}
                        {!bookingData?.isFullRefund && (bookingData?.isPartialRefund || bookingData?.is50_50Split) && ' (kept after refund)'}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Stripe Fee Breakdown */}
                  {transactionData.balanceTransaction && (
                    <div className="border border-border rounded-lg p-4">
                      <h3 className="font-semibold text-card-foreground mb-4">Stripe Balance Transaction Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transaction ID:</span>
                          <span className="font-mono text-xs">{transactionData.balanceTransaction.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="capitalize">{transactionData.balanceTransaction.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gross Amount:</span>
                          <span className="font-medium">{formatCurrency(transactionData.balanceTransaction.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Fees:</span>
                          <span className="font-medium text-error">{formatCurrency(transactionData.balanceTransaction.fee)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Net Amount:</span>
                          <span className="font-medium text-success">{formatCurrency(transactionData.balanceTransaction.net)}</span>
                        </div>
                        {transactionData.balanceTransaction.feeDetails && transactionData.balanceTransaction.feeDetails.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <p className="text-sm font-medium mb-2">Detailed Fee Breakdown:</p>
                            {transactionData.balanceTransaction.feeDetails.map((fee, idx) => (
                              <div key={idx} className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">{fee.description || fee.type}:</span>
                                <span className="text-error">-{formatCurrency(fee.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Refund Details Tab */}
              {activeTab === 'refund' && (bookingData?.isPartialRefund || bookingData?.is50_50Split || bookingData?.isFullRefund) && (
                <div className="space-y-6">
                  {/* Refund Type Header */}
                  <div className={`rounded-lg p-5 border-2 ${
                    bookingData?.isFullRefund 
                      ? 'bg-error/10 border-error/30' 
                      : 'bg-warning/10 border-warning/30'
                  }`}>
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`p-2 rounded-lg ${
                        bookingData?.isFullRefund 
                          ? 'bg-error/20' 
                          : 'bg-warning/20'
                      }`}>
                        <Icon name={bookingData?.isFullRefund ? "XCircle" : "RefreshCw"} size={24} className={
                          bookingData?.isFullRefund ? "text-error" : "text-warning"
                        } />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-card-foreground">
                          {bookingData?.is50_50Split 
                            ? '50/50 Split Refund' 
                            : bookingData?.isPartialRefund 
                            ? 'Partial Refund' 
                            : 'Full Refund'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {bookingData?.isFullRefund 
                            ? 'All funds have been refunded to the customer' 
                            : bookingData?.is50_50Split
                            ? 'Remaining amount split equally between seeker and partner'
                            : 'Partial amount refunded to the customer'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Refund Amounts */}
                  <div className="border border-border rounded-lg p-5">
                    <h4 className="font-semibold text-card-foreground mb-4">Refund Breakdown</h4>
                    {bookingData?.is50_50Split ? (
                      <div className="space-y-4">
                        <div className="bg-muted rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Seeker Refund Amount:</span>
                            <span className="text-xl font-bold text-card-foreground">
                              {formatCurrency(bookingData?.refundAmount ?? bookingData?.raw?.refund_amount ?? 0)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">Refunded to the customer (seeker)</p>
                          {(bookingData?.refundAmount === 0 || bookingData?.raw?.refund_amount === 0) && (
                            <p className="text-xs text-muted-foreground italic mt-1">
                              Note: Seeker's share is $0.00 (recorded as part of 50/50 split - may indicate seeker already has balance or no refund needed)
                            </p>
                          )}
                        </div>
                        <div className="bg-muted rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Partner Refund Amount:</span>
                            <span className="text-xl font-bold text-card-foreground">{formatCurrency(bookingData?.transferReversalAmount || 0)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Reversed from partner's Stripe Connect account</p>
                        </div>
                        <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <span className="text-base font-semibold text-card-foreground">Total Refunded:</span>
                            <span className="text-2xl font-bold text-primary">
                              {formatCurrency((bookingData?.refundAmount || 0) + (bookingData?.transferReversalAmount || 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-muted-foreground">Refund Amount:</span>
                          <span className="text-2xl font-bold text-card-foreground">{formatCurrency(bookingData?.refundAmount || 0)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {bookingData?.isFullRefund 
                            ? 'Full amount refunded to the customer' 
                            : 'Partial amount refunded to the customer'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Platform Earnings Impact */}
                  <div className={`border-2 rounded-lg p-5 ${
                    bookingData?.isFullRefund 
                      ? 'bg-error/10 border-error/30' 
                      : 'bg-success/10 border-success/30'
                  }`}>
                    <h4 className="font-semibold text-card-foreground mb-4 flex items-center space-x-2">
                      <Icon name={bookingData?.isFullRefund ? "XCircle" : "CheckCircle"} size={20} className={
                        bookingData?.isFullRefund ? "text-error" : "text-success"
                      } />
                      <span>Platform Earnings Impact</span>
                    </h4>
                    {bookingData?.isFullRefund ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          This is a <strong>full refund</strong>. All funds have been returned, including the platform's application fee.
                        </p>
                        <div className="bg-background/50 rounded-lg p-3 mt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-muted-foreground">Platform Earnings:</span>
                            <span className="text-lg font-bold text-error">A$0.00</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">No earnings retained due to full refund</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          This is a <strong>{bookingData?.is50_50Split ? '50/50 split' : 'partial'} refund</strong>. The platform retains the full application fee.
                        </p>
                        <div className="bg-background/50 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Application Fee (Gross):</span>
                            <span className="text-base font-semibold text-card-foreground">{formatCurrency(transactionData.breakdown?.applicationFeeGross)}</span>
                          </div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Stripe Fees:</span>
                            <span className="text-base font-semibold text-error">-{formatCurrency(transactionData.breakdown?.stripeFees)}</span>
                          </div>
                          <div className="border-t border-border pt-2 mt-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-semibold text-card-foreground">Net Platform Earnings:</span>
                              <span className="text-xl font-bold text-success">{formatCurrency(transactionData.breakdown?.netApplicationFee)}</span>
                            </div>
                            <p className="text-xs text-success mt-1">✓ Full application fee retained</p>
                          </div>
                        </div>
                        {bookingData?.is50_50Split && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                            <p className="text-xs text-blue-800">
                              <strong>50/50 Split Explanation:</strong> Platform keeps the full application fee ({formatCurrency(transactionData.breakdown?.applicationFeeGross)}). 
                              The remaining amount after the platform fee is split equally between the seeker and partner.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stripe Transaction IDs */}
                  {(bookingData?.raw?.stripe_refund_id || bookingData?.raw?.stripe_transfer_reversal_id) && (
                    <div className="border border-border rounded-lg p-5">
                      <h4 className="font-semibold text-card-foreground mb-4">Stripe Transaction IDs</h4>
                      <div className="space-y-3">
                        {bookingData?.raw?.stripe_refund_id && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Stripe Refund ID:</p>
                            <p className="text-sm font-mono text-card-foreground bg-muted p-2 rounded break-all">
                              {bookingData.raw.stripe_refund_id}
                            </p>
                          </div>
                        )}
                        {bookingData?.raw?.stripe_transfer_reversal_id && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Transfer Reversal ID:</p>
                            <p className="text-sm font-mono text-card-foreground bg-muted p-2 rounded break-all">
                              {bookingData.raw.stripe_transfer_reversal_id}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stripe Data Tab */}
              {activeTab === 'stripe' && (
                <div className="space-y-6">
                  {/* Payment Intent */}
                  <div className="border border-border rounded-lg p-4">
                    <h3 className="font-semibold text-card-foreground mb-4">Payment Intent</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID:</span>
                        <span className="font-mono">{transactionData.paymentIntent?.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Amount:</span>
                        <span>{formatCurrency(transactionData.paymentIntent?.amount / 100)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Currency:</span>
                        <span>{transactionData.paymentIntent?.currency?.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="capitalize">{transactionData.paymentIntent?.status}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Created:</span>
                        <span>{formatDate(transactionData.paymentIntent?.created)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Charge */}
                  {transactionData.charge && (
                    <div className="border border-border rounded-lg p-4">
                      <h3 className="font-semibold text-card-foreground mb-4">Charge</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID:</span>
                          <span className="font-mono">{transactionData.charge.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Amount:</span>
                          <span>{formatCurrency(transactionData.charge.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="capitalize">{transactionData.charge.status}</span>
                        </div>
                        {transactionData.charge.refunded && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Refunded:</span>
                              <span className="text-error font-semibold">{formatCurrency(transactionData.charge.amountRefunded)}</span>
                            </div>
                            {bookingData?.raw?.stripe_refund_id && (
                              <div className="flex justify-between items-start mt-2 pt-2 border-t border-border">
                                <span className="text-muted-foreground text-xs">Refund ID:</span>
                                <span className="text-xs font-mono text-card-foreground break-all text-right max-w-[60%]">
                                  {bookingData.raw.stripe_refund_id}
                                </span>
                              </div>
                            )}
                            {bookingData?.raw?.stripe_transfer_reversal_id && (
                              <div className="flex justify-between items-start mt-1">
                                <span className="text-muted-foreground text-xs">Transfer Reversal ID:</span>
                                <span className="text-xs font-mono text-card-foreground break-all text-right max-w-[60%]">
                                  {bookingData.raw.stripe_transfer_reversal_id}
                                </span>
                              </div>
                            )}
                            {(bookingData?.isPartialRefund || bookingData?.is50_50Split || bookingData?.isFullRefund) && (
                              <div className="mt-2 pt-2 border-t border-border">
                                <p className="text-xs text-muted-foreground">
                                  <strong>Refund Type:</strong> {
                                    bookingData?.is50_50Split 
                                      ? '50/50 Split' 
                                      : bookingData?.isPartialRefund 
                                      ? 'Partial Refund' 
                                      : 'Full Refund'
                                  }
                                </p>
                                {bookingData?.is50_50Split && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Seeker: {formatCurrency(bookingData?.refundAmount ?? bookingData?.raw?.refund_amount ?? 0)} | Partner: {formatCurrency(bookingData?.transferReversalAmount ?? bookingData?.raw?.transfer_reversal_amount ?? 0)}
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        {transactionData.charge.disputed && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Disputed:</span>
                            <span className="text-warning">Yes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Balance Transaction */}
                  {transactionData.balanceTransaction && (
                    <div className="border border-border rounded-lg p-4">
                      <h3 className="font-semibold text-card-foreground mb-4">Balance Transaction</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ID:</span>
                          <span className="font-mono">{transactionData.balanceTransaction.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="capitalize">{transactionData.balanceTransaction.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="capitalize">{transactionData.balanceTransaction.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span>{formatDate(transactionData.balanceTransaction.created)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Metadata Tab */}
              {activeTab === 'metadata' && (
                <div className="border border-border rounded-lg p-4">
                  <h3 className="font-semibold text-card-foreground mb-4">Payment Metadata</h3>
                  <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm">
                    {JSON.stringify(transactionData.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {transactionData?.paymentIntent?.id && (
            <Button
              variant="default"
              iconName="ExternalLink"
              iconPosition="right"
              onClick={() => {
                window.open(`https://dashboard.stripe.com/payments/${transactionData.paymentIntent.id}`, '_blank');
              }}
            >
              View in Stripe
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransactionDetailsModal;

