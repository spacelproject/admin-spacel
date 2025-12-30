import React from 'react';
import Icon from '../../../components/AppIcon';

const RevenueSummaryCards = ({ summary }) => {
  // Use only real data from props
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const summaryData = [
    {
      id: 'total-revenue',
      title: 'Total Booking Revenue',
      value: formatCurrency(summary?.totalRevenue || 0),
      change: '+0%', // Change calculation to be implemented when historical data is available
      changeType: 'neutral',
      icon: 'DollarSign',
      description: 'Total booking amounts (base amounts)'
    },
    {
      id: 'net-platform-earnings',
      title: 'Net Platform Earnings',
      value: formatCurrency(summary?.totalNetApplicationFee || 0),
      change: '+0%',
      changeType: 'neutral',
      icon: 'Wallet',
      description: 'Total platform revenue after Stripe fees'
    },
    {
      id: 'total-transactions',
      title: 'Total Transactions',
      value: summary?.totalTransactions?.toLocaleString() || '0',
      change: '+0%', // Change calculation to be implemented when historical data is available
      changeType: 'neutral',
      icon: 'CreditCard',
      description: 'Completed bookings this month'
    },
    {
      id: 'host-payouts',
      title: 'Host Payouts',
      value: formatCurrency(summary?.totalHostPayouts || 0),
      change: '+0%', // Change calculation to be implemented when historical data is available
      changeType: 'neutral',
      icon: 'Users',
      description: 'Total withdrawn to hosts\' bank accounts'
    }
  ];

  const formatChangeColor = (changeType) => {
    switch (changeType) {
      case 'positive':
        return 'text-success';
      case 'negative':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatChangeIcon = (changeType) => {
    switch (changeType) {
      case 'positive':
        return 'TrendingUp';
      case 'negative':
        return 'TrendingDown';
      default:
        return 'Minus';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {summaryData.map((item) => (
        <div key={item.id} className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon 
                name={item.icon} 
                size={24} 
                className="text-primary"
              />
            </div>
            <div className={`flex items-center space-x-1 ${formatChangeColor(item.changeType)}`}>
              <Icon 
                name={formatChangeIcon(item.changeType)} 
                size={16}
              />
              <span className="text-sm font-medium">{item.change}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">{item.title}</h3>
            <p className="text-2xl font-bold text-card-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RevenueSummaryCards;