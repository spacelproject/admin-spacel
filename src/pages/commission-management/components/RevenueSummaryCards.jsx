import React from 'react';
import Icon from '../../../components/AppIcon';

const RevenueSummaryCards = () => {
  const summaryData = [
    {
      id: 'total-revenue',
      title: 'Total Revenue',
      value: '$45,280',
      change: '+12.5%',
      changeType: 'positive',
      icon: 'DollarSign',
      description: 'Platform commission earned this month'
    },
    {
      id: 'avg-commission',
      title: 'Average Commission Rate',
      value: '15.2%',
      change: '+0.3%',
      changeType: 'positive',
      icon: 'Percent',
      description: 'Weighted average across all categories'
    },
    {
      id: 'total-transactions',
      title: 'Total Transactions',
      value: '1,247',
      change: '+8.7%',
      changeType: 'positive',
      icon: 'CreditCard',
      description: 'Completed bookings this month'
    },
    {
      id: 'host-payouts',
      title: 'Host Payouts',
      value: '$298,720',
      change: '+15.2%',
      changeType: 'positive',
      icon: 'Users',
      description: 'Total paid to hosts this month'
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