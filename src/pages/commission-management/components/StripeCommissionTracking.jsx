import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import LoadingState from '../../../components/ui/LoadingState';
import { useToast } from '../../../components/ui/Toast';
import useStripeCommissionTracking from '../../../hooks/useStripeCommissionTracking';

const StripeCommissionTracking = () => {
  const { showToast } = useToast();
  const {
    loading,
    error,
    stripeData,
    fetchCommissionSummary,
    fetchBalanceTransactions,
    fetchPayouts,
    fetchDisputes,
    reconcileBookings,
    getCommissionBreakdown
  } = useStripeCommissionTracking();

  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    loadStripeData();
  }, [dateRange, startDate, endDate]);

  const loadStripeData = async () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    await Promise.all([
      fetchCommissionSummary(start, end),
      fetchBalanceTransactions(start, end),
      fetchPayouts(start, end),
      fetchDisputes(start, end)
    ]);
  };

  const handleReconcile = async () => {
    setReconciling(true);
    try {
      const results = await reconcileBookings();
      if (results) {
        showToast(
          `Reconciliation complete: ${results.synced} synced, ${results.errors} errors, ${results.discrepancies.length} discrepancies`,
          results.errors > 0 ? 'warning' : 'success'
        );
      }
    } catch (err) {
      showToast('Reconciliation failed: ' + err.message, 'error');
    } finally {
      setReconciling(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !stripeData.summary) {
    return <LoadingState message="Loading Stripe commission data..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-card-foreground mb-2">
              Stripe Commission Tracking
            </h2>
            <p className="text-sm text-muted-foreground">
              Real-time commission data from Stripe API with balance transactions and reconciliation
            </p>
          </div>
          <Button
            variant="outline"
            iconName="RefreshCw"
            onClick={loadStripeData}
            disabled={loading}
          >
            Refresh Data
          </Button>
        </div>

        {/* Date Range Selector */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Select
            label="Quick Range"
            options={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Last 7 Days' },
              { value: 'month', label: 'Last 30 Days' },
              { value: 'quarter', label: 'Last 90 Days' },
              { value: 'custom', label: 'Custom Range' }
            ]}
            value={dateRange}
            onChange={(value) => {
              setDateRange(value);
              if (value !== 'custom') {
                const end = new Date();
                const start = new Date();
                switch (value) {
                  case 'today':
                    break;
                  case 'week':
                    start.setDate(start.getDate() - 7);
                    break;
                  case 'month':
                    start.setMonth(start.getMonth() - 1);
                    break;
                  case 'quarter':
                    start.setMonth(start.getMonth() - 3);
                    break;
                }
                setStartDate(start.toISOString().split('T')[0]);
                setEndDate(end.toISOString().split('T')[0]);
              }
            }}
          />
          {dateRange === 'custom' && (
            <>
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </>
          )}
        </div>

        {/* Reconciliation Button */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <h3 className="text-sm font-medium text-card-foreground mb-1">
              Database Reconciliation
            </h3>
            <p className="text-xs text-muted-foreground">
              Sync all bookings with Stripe to ensure accuracy
            </p>
          </div>
          <Button
            variant="default"
            iconName="CheckCircle2"
            onClick={handleReconcile}
            disabled={reconciling || loading}
          >
            {reconciling ? 'Reconciling...' : 'Reconcile Now'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {stripeData.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Gross Revenue</span>
              <Icon name="DollarSign" size={16} className="text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-card-foreground">
              {formatCurrency(stripeData.summary.totalGross)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stripeData.summary.transactionCount} transactions
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Stripe Fees</span>
              <Icon name="Minus" size={16} className="text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-destructive">
              -{formatCurrency(stripeData.summary.totalFees)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {(stripeData.summary.totalGross > 0
                ? (stripeData.summary.totalFees / stripeData.summary.totalGross * 100)
                : 0
              ).toFixed(2)}% of gross
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Net Revenue</span>
              <Icon name="TrendingUp" size={16} className="text-success" />
            </div>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(stripeData.summary.totalNet)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              After Stripe fees
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Transactions</span>
              <Icon name="CreditCard" size={16} className="text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-card-foreground">
              {stripeData.summary.transactionCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              In selected period
            </div>
          </div>
        </div>
      )}

      {/* Balance Transactions */}
      {stripeData.balanceTransactions.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Balance Transactions
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Fees</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Net</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {stripeData.balanceTransactions.slice(0, 20).map((tx) => (
                  <tr key={tx.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm">{formatDate(tx.created)}</td>
                    <td className="py-3 px-4 text-sm">{tx.type}</td>
                    <td className="py-3 px-4 text-sm text-right">{formatCurrency(tx.amount)}</td>
                    <td className="py-3 px-4 text-sm text-right text-destructive">
                      -{formatCurrency(tx.fee)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-success">
                      {formatCurrency(tx.net)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tx.status === 'available' ? 'bg-success/10 text-success' :
                        tx.status === 'pending' ? 'bg-warning/10 text-warning' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payouts */}
      {stripeData.payouts.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Platform Payouts
          </h3>
          <div className="space-y-3">
            {stripeData.payouts.slice(0, 10).map((payout) => (
              <div key={payout.id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <div className="font-medium text-card-foreground">
                    {formatCurrency(payout.amount)} • {payout.method}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Arrives: {formatDate(payout.arrivalDate)} • Status: {payout.status}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  payout.status === 'paid' ? 'bg-success/10 text-success' :
                  payout.status === 'pending' ? 'bg-warning/10 text-warning' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {payout.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disputes */}
      {stripeData.disputes.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Disputes & Chargebacks
          </h3>
          <div className="space-y-3">
            {stripeData.disputes.map((dispute) => (
              <div key={dispute.id} className="flex items-center justify-between p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <div>
                  <div className="font-medium text-card-foreground">
                    {formatCurrency(dispute.amount)} • {dispute.reason}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDate(dispute.created)} • Status: {dispute.status}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  dispute.status === 'won' ? 'bg-success/10 text-success' :
                  dispute.status === 'lost' ? 'bg-destructive/10 text-destructive' :
                  'bg-warning/10 text-warning'
                }`}>
                  {dispute.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Icon name="AlertCircle" size={16} className="text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StripeCommissionTracking;

