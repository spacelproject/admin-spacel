import React from 'react';
import Icon from '../../../components/AppIcon';

const SpaceStats = ({ stats }) => {
  const statItems = [
    {
      id: 'total',
      label: 'Total Spaces',
      value: stats.total,
      icon: 'Building',
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      id: 'pending',
      label: 'Pending Approval',
      value: stats.pending,
      icon: 'Clock',
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      id: 'active',
      label: 'Active Spaces',
      value: stats.active,
      icon: 'CheckCircle',
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      id: 'suspended',
      label: 'Suspended',
      value: stats.suspended,
      icon: 'PauseCircle',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statItems.map((item) => (
        <div key={item.id} className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{item.value.toLocaleString()}</p>
            </div>
            <div className={`p-3 rounded-full ${item.bgColor}`}>
              <Icon name={item.icon} size={24} className={item.color} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SpaceStats;