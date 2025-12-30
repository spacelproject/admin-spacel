import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import StripeFeeCalculator from '../../../services/stripeFeeCalculator';

const FeeCalculator = () => {
  const [amount, setAmount] = useState('224.00');
  const [isInternational, setIsInternational] = useState(false);
  const [gstIncluded, setGstIncluded] = useState(true);
  const [gstRate, setGstRate] = useState('10'); // 10% GST in Australia

  const calculate = () => {
    const paymentAmount = parseFloat(amount) || 0;
    if (paymentAmount <= 0) return null;

    // Calculate Stripe fees
    const stripeFees = StripeFeeCalculator.calculateEstimatedFees(
      paymentAmount,
      isInternational
    );

    // Calculate GST
    let gstAmount = 0;
    let amountExcludingGst = 0;
    let amountIncludingGst = 0;
    const gstPercent = parseFloat(gstRate) / 100;

    if (gstIncluded) {
      // GST is included in the payment amount
      amountIncludingGst = paymentAmount;
      amountExcludingGst = paymentAmount / (1 + gstPercent);
      gstAmount = amountIncludingGst - amountExcludingGst;
    } else {
      // GST is not included, add it
      amountExcludingGst = paymentAmount;
      gstAmount = paymentAmount * gstPercent;
      amountIncludingGst = paymentAmount + gstAmount;
    }

    // Net amount after Stripe fees
    const netAfterStripeFees = paymentAmount - stripeFees.totalFee;

    return {
      paymentAmount,
      stripeFees,
      gst: {
        rate: gstRate,
        amount: gstAmount,
        included: gstIncluded,
        amountExcludingGst,
        amountIncludingGst
      },
      netAfterStripeFees,
      breakdown: {
        grossPayment: paymentAmount,
        gstAmount,
        amountExcludingGst,
        stripeFees: stripeFees.totalFee,
        netReceived: netAfterStripeFees
      }
    };
  };

  const result = calculate();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg border border-border p-6">
        <h2 className="text-xl font-semibold text-card-foreground mb-6">
          Payment Fee & Tax Calculator
        </h2>

        {/* Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Input
            label="Payment Amount (AUD)"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="224.00"
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-card-foreground">
              GST Rate (%)
            </label>
            <Input
              type="number"
              step="0.1"
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
              placeholder="10"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="international"
              checked={isInternational}
              onChange={(e) => setIsInternational(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="international" className="text-sm text-card-foreground">
              International Card (+1.5% fee)
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="gstIncluded"
              checked={gstIncluded}
              onChange={(e) => setGstIncluded(e.target.checked)}
              className="w-4 h-4 rounded border-border"
            />
            <label htmlFor="gstIncluded" className="text-sm text-card-foreground">
              GST Included in Payment Amount
            </label>
          </div>
        </div>

        {result && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Gross Payment</div>
                <div className="text-2xl font-bold text-card-foreground">
                  {formatCurrency(result.paymentAmount)}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Total Stripe Fees</div>
                <div className="text-2xl font-bold text-destructive">
                  -{formatCurrency(result.stripeFees.totalFee)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {result.stripeFees.effectiveRate}% effective rate
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">Net Received</div>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(result.netAfterStripeFees)}
                </div>
              </div>
            </div>

            {/* Stripe Fee Breakdown */}
            <div className="bg-muted rounded-lg p-4">
              <h3 className="text-sm font-semibold text-card-foreground mb-3">
                Stripe Fee Breakdown
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon name="Percent" size={16} className="text-muted-foreground" />
                    <span className="text-sm text-card-foreground">
                      Processing Fee ({isInternational ? '4.2%' : '2.7%'})
                    </span>
                  </div>
                  <span className="text-sm font-medium text-card-foreground">
                    {formatCurrency(result.stripeFees.percentageFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Icon name="DollarSign" size={16} className="text-muted-foreground" />
                    <span className="text-sm text-card-foreground">Fixed Fee</span>
                  </div>
                  <span className="text-sm font-medium text-card-foreground">
                    {formatCurrency(result.stripeFees.fixedFee)}
                  </span>
                </div>
                {result.stripeFees.internationalFee > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Icon name="Globe" size={16} className="text-muted-foreground" />
                      <span className="text-sm text-card-foreground">International Fee (+1.5%)</span>
                    </div>
                    <span className="text-sm font-medium text-card-foreground">
                      {formatCurrency(result.stripeFees.internationalFee)}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-border mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-card-foreground">Total Stripe Fees</span>
                    <span className="text-sm font-bold text-destructive">
                      {formatCurrency(result.stripeFees.totalFee)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* GST Breakdown */}
            <div className="bg-muted rounded-lg p-4">
              <h3 className="text-sm font-semibold text-card-foreground mb-3">
                GST (Goods & Services Tax) Breakdown
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-card-foreground">
                    Amount {result.gst.included ? 'Including' : 'Excluding'} GST
                  </span>
                  <span className="text-sm font-medium text-card-foreground">
                    {formatCurrency(result.gst.included ? result.gst.amountIncludingGst : result.gst.amountExcludingGst)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-card-foreground">
                    GST ({result.gst.rate}%)
                  </span>
                  <span className="text-sm font-medium text-card-foreground">
                    {formatCurrency(result.gst.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-card-foreground">
                    Amount {result.gst.included ? 'Excluding' : 'Including'} GST
                  </span>
                  <span className="text-sm font-medium text-card-foreground">
                    {formatCurrency(result.gst.included ? result.gst.amountExcludingGst : result.gst.amountIncludingGst)}
                  </span>
                </div>
              </div>
            </div>

            {/* Complete Breakdown */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="text-sm font-semibold text-card-foreground mb-3">
                Complete Payment Breakdown
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Customer Pays (Gross)</span>
                  <span className="font-medium text-card-foreground">
                    {formatCurrency(result.paymentAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">GST Amount</span>
                  <span className="font-medium text-card-foreground">
                    {formatCurrency(result.gst.amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Amount Excluding GST</span>
                  <span className="font-medium text-card-foreground">
                    {formatCurrency(result.gst.amountExcludingGst)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-muted-foreground">Stripe Processing Fees</span>
                  <span className="font-medium text-destructive">
                    -{formatCurrency(result.stripeFees.totalFee)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="font-semibold text-card-foreground">Net Amount Received</span>
                  <span className="font-bold text-success text-lg">
                    {formatCurrency(result.netAfterStripeFees)}
                  </span>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Icon name="Info" size={16} className="text-warning mt-0.5" />
                <div className="text-sm text-card-foreground">
                  <p className="font-medium mb-1">Important Notes:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Stripe fees are separate from GST and are typically tax-deductible business expenses</li>
                    <li>GST is calculated on the payment amount (excluding Stripe fees)</li>
                    <li>Stripe fees may be subject to GST depending on your business structure</li>
                    <li>For international cards, an additional 1.5% fee applies</li>
                    <li>Actual fees may vary slightly based on card type and Stripe's pricing</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FeeCalculator;

