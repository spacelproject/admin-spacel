import React from 'react';
import Icon from '../../../components/AppIcon';

const PaymentStatusBadge = ({ status }) => {
  const getPaymentConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return {
          label: 'Paid',
          icon: 'CheckCircle',
          className: 'bg-success/10 text-success border-success/20'
        };
      case 'pending':
        return {
          label: 'Pending',
          icon: 'Clock',
          className: 'bg-warning/10 text-warning border-warning/20'
        };
      case 'refunded':
        return {
          label: 'Refunded',
          icon: 'RotateCcw',
          className: 'bg-accent/10 text-accent border-accent/20'
        };
      case 'failed':
        return {
          label: 'Failed',
          icon: 'XCircle',
          className: 'bg-destructive/10 text-destructive border-destructive/20'
        };
      default:
        return {
          label: 'Unknown',
          icon: 'HelpCircle',
          className: 'bg-muted text-muted-foreground border-border'
        };
    }
  };

  const config = getPaymentConfig(status);

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      <Icon name={config.icon} size={12} />
      {config.label}
    </span>
  );
};

export default PaymentStatusBadge;