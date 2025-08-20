import React from 'react';
import Icon from '../../../components/AppIcon';

const SupportStats = ({ stats }) => {
  const statCards = [
    {
      id: 'total',
      title: 'Total Tickets',
      value: stats.total,
      change: '+12%',
      changeType: 'increase',
      icon: 'Ticket',
      color: 'blue'
    },
    {
      id: 'open',
      title: 'Open Tickets',
      value: stats.open,
      change: '+5%',
      changeType: 'increase',
      icon: 'AlertCircle',
      color: 'orange'
    },
    {
      id: 'resolved',
      title: 'Resolved Today',
      value: stats.resolvedToday,
      change: '+18%',
      changeType: 'increase',
      icon: 'CheckCircle',
      color: 'green'
    },
    {
      id: 'avgResponse',
      title: 'Avg Response Time',
      value: stats.avgResponseTime,
      change: '-15%',
      changeType: 'decrease',
      icon: 'Clock',
      color: 'purple'
    },
    {
      id: 'satisfaction',
      title: 'Satisfaction Rate',
      value: `${stats.satisfactionRate}%`,
      change: '+3%',
      changeType: 'increase',
      icon: 'Star',
      color: 'yellow'
    },
    {
      id: 'unassigned',
      title: 'Unassigned',
      value: stats.unassigned,
      change: '-8%',
      changeType: 'decrease',
      icon: 'UserX',
      color: 'red'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      red: 'bg-red-50 text-red-600 border-red-200'
    };
    return colors[color] || colors.blue;
  };

  const getChangeColor = (changeType) => {
    return changeType === 'increase' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-6">
      {statCards.map((card) => (
        <div key={card.id} className="bg-card border border-border rounded-lg p-6 hover:shadow-card transition-smooth">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg border ${getColorClasses(card.color)}`}>
              <Icon name={card.icon} size={24} />
            </div>
            <span className={`text-sm font-medium ${getChangeColor(card.changeType)}`}>
              {card.change}
            </span>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-1">{card.value}</h3>
            <p className="text-sm text-muted-foreground">{card.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SupportStats;