import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import { useToast } from '../../../components/ui/Toast';
import StripeCommissionTracking from '../../../services/stripeCommissionTracking';

const StripeFeeBreakdown = ({ paymentIntentId }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState(null);
  const [error, setError] = useState(null);

  const fetchFeeBreakdown = async () => {
    if (!paymentIntentId) return;

    setLoading(true);
    setError(null);

    try {
      // Get payment details
      const paymentData = await StripeCommissionTracking.getPaymentDetails(paymentIntentId);
      
      // Calculate breakdown with fee details
      const feeBreakdown = StripeCommissionTracking.calculateCommissionBreakdown(paymentData);
      
      setBreakdown(feeBreakdown);
    } catch (err) {
      console.error('Error fetching fee breakdown:', err);
      setError(err.message);
      showToast('Failed to fetch fee breakdown: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (paymentIntentId) {
      fetchFeeBreakdown();
    }
  }, [paymentIntentId]);

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  if (loading) {
    return <LoadingState message="Loading fee breakdown..." />;
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Icon name="AlertCircle" size={16} className="text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      </div>
    );
  }

  if (!breakdown) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No fee breakdown available</p>
        {paymentIntentId && (
          <Button variant="outline" onClick={fetchFeeBreakdown} className="mt-4">
            Load Fee Breakdown
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">
          Stripe Fee Breakdown
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-muted rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Gross Amount</div>
            <div className="text-xl font-bold text-card-foreground">
              {formatCurrency(breakdown.applicationFeeGross)}
            </div>
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Stripe Fees</div>
            <div className="text-xl font-bold text-destructive">
              -{formatCurrency(breakdown.stripeFees)}
            </div>
            {breakdown.effectiveFeeRate && (
              <div className="text-xs text-muted-foreground mt-1">
                {breakdown.effectiveFeeRate}% effective rate
              </div>
            )}
          </div>
          <div className="bg-muted rounded-lg p-4">
            <div className="text-sm text-muted-foreground mb-1">Net Amount</div>
            <div className="text-xl font-bold text-success">
              {formatCurrency(breakdown.netApplicationFee)}
            </div>
          </div>
        </div>

        {/* Detailed Fee Breakdown */}
        {breakdown.feeBreakdown && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-card-foreground mb-3">
              Fee Components
            </h4>

            {breakdown.feeBreakdown.stripeFee > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="CreditCard" size={16} className="text-muted-foreground" />
                  <span className="text-sm text-card-foreground">Base Processing Fee</span>
                </div>
                <span className="text-sm font-medium text-card-foreground">
                  {formatCurrency(breakdown.feeBreakdown.stripeFee)}
                </span>
              </div>
            )}

            {breakdown.feeBreakdown.fixedFee > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="DollarSign" size={16} className="text-muted-foreground" />
                  <span className="text-sm text-card-foreground">Fixed Fee Component</span>
                  <span className="text-xs text-muted-foreground">(typically 5¢)</span>
                </div>
                <span className="text-sm font-medium text-card-foreground">
                  {formatCurrency(breakdown.feeBreakdown.fixedFee)}
                </span>
              </div>
            )}

            {breakdown.feeBreakdown.percentageFee > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="Percent" size={16} className="text-muted-foreground" />
                  <span className="text-sm text-card-foreground">Percentage Fee</span>
                  <span className="text-xs text-muted-foreground">(typically 2.7%)</span>
                </div>
                <span className="text-sm font-medium text-card-foreground">
                  {formatCurrency(breakdown.feeBreakdown.percentageFee)}
                </span>
              </div>
            )}

            {breakdown.feeBreakdown.internationalFee > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="Globe" size={16} className="text-muted-foreground" />
                  <span className="text-sm text-card-foreground">International Card Fee</span>
                  <span className="text-xs text-muted-foreground">(+1.5%)</span>
                </div>
                <span className="text-sm font-medium text-card-foreground">
                  {formatCurrency(breakdown.feeBreakdown.internationalFee)}
                </span>
              </div>
            )}

            {breakdown.feeBreakdown.stripeConnectFee > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-2">
                  <Icon name="Link" size={16} className="text-muted-foreground" />
                  <span className="text-sm text-card-foreground">Stripe Connect Fee</span>
                </div>
                <span className="text-sm font-medium text-card-foreground">
                  {formatCurrency(breakdown.feeBreakdown.stripeConnectFee)}
                </span>
              </div>
            )}

            {breakdown.feeBreakdown.otherFees && breakdown.feeBreakdown.otherFees.length > 0 && (
              <div className="space-y-2">
                {breakdown.feeBreakdown.otherFees.map((fee, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Icon name="Info" size={16} className="text-muted-foreground" />
                      <div>
                        <span className="text-sm text-card-foreground">{fee.description}</span>
                        <span className="text-xs text-muted-foreground ml-2">({fee.type})</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-card-foreground">
                      {formatCurrency(fee.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Commission Breakdown */}
        <div className="mt-6 pt-6 border-t border-border">
          <h4 className="text-sm font-medium text-card-foreground mb-3">
            Commission Breakdown
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Commission (Gross)</div>
              <div className="text-sm font-medium text-card-foreground">
                {formatCurrency(breakdown.partnerFee)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Commission (Net)</div>
              <div className="text-sm font-medium text-success">
                {formatCurrency(breakdown.netCommission)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripeFeeBreakdown;

