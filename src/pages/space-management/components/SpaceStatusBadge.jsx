import React from 'react';

const SpaceStatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending Approval',
          className: 'bg-warning/10 text-warning border-warning/20'
        };
      case 'active':
        return {
          label: 'Active',
          className: 'bg-success/10 text-success border-success/20'
        };
      case 'suspended':
        return {
          label: 'Suspended',
          className: 'bg-destructive/10 text-destructive border-destructive/20'
        };
      case 'rejected':
        return {
          label: 'Rejected',
          className: 'bg-muted text-muted-foreground border-border'
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
};

export default SpaceStatusBadge;