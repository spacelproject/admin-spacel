import React from 'react';

const BookingStatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return {
          label: 'Confirmed',
          className: 'bg-success/10 text-success border-success/20'
        };
      case 'pending':
        return {
          label: 'Pending',
          className: 'bg-warning/10 text-warning border-warning/20'
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          className: 'bg-destructive/10 text-destructive border-destructive/20'
        };
      case 'completed':
        return {
          label: 'Completed',
          className: 'bg-accent/10 text-accent border-accent/20'
        };
      default:
        return {
          label: 'Unknown',
          className: 'bg-muted text-muted-foreground border-border'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
};

export default BookingStatusBadge;