import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const QuickActions = () => {
  const navigate = useNavigate();
  const [showMoreActions, setShowMoreActions] = useState(false);

  const actions = [
    {
      id: 'add-user',
      title: 'Add New User',
      description: 'Create a new user account',
      icon: 'UserPlus',
      color: 'primary',
      onClick: () => navigate('/user-management?action=add')
    },
    {
      id: 'approve-space',
      title: 'Approve Spaces',
      description: 'Review pending space listings',
      icon: 'Building',
      color: 'success',
      onClick: () => navigate('/space-management?filter=pending')
    },
    {
      id: 'view-tickets',
      title: 'Support Tickets',
      description: 'Handle customer inquiries',
      icon: 'MessageCircle',
      color: 'warning',
      onClick: () => navigate('/support-ticket-system')
    },
    {
      id: 'generate-report',
      title: 'Generate Report',
      description: 'Create analytics report',
      icon: 'FileText',
      color: 'secondary',
      onClick: () => navigate('/analytics-reports?action=generate')
    }
  ];

  const moreActions = [
    {
      id: 'manage-bookings',
      title: 'Manage Bookings',
      description: 'View and manage all bookings',
      icon: 'Calendar',
      color: 'primary',
      onClick: () => navigate('/booking-management')
    },
    {
      id: 'content-management',
      title: 'Content Management',
      description: 'Update platform content',
      icon: 'Edit',
      color: 'secondary',
      onClick: () => navigate('/content-management')
    },
    {
      id: 'platform-settings',
      title: 'Platform Settings',
      description: 'Configure system settings',
      icon: 'Settings',
      color: 'secondary',
      onClick: () => navigate('/platform-settings')
    },
    {
      id: 'commission-management',
      title: 'Commission Management',
      description: 'Manage revenue and rates',
      icon: 'DollarSign',
      color: 'success',
      onClick: () => navigate('/commission-management')
    }
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'success':
        return 'text-success bg-success/10 hover:bg-success/20';
      case 'warning':
        return 'text-warning bg-warning/10 hover:bg-warning/20';
      case 'secondary':
        return 'text-secondary bg-secondary/10 hover:bg-secondary/20';
      default:
        return 'text-primary bg-primary/10 hover:bg-primary/20';
    }
  };

  const handleMoreActions = () => {
    setShowMoreActions(!showMoreActions);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-shadow">
      <h3 className="text-lg font-semibold text-card-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {actions?.map((action) => (
          <button
            key={action?.id}
            onClick={action?.onClick}
            className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-muted/30 transition-smooth text-left hover:shadow-sm active:scale-95"
          >
            <div className={`p-2 rounded-lg ${getColorClasses(action?.color)}`}>
              <Icon name={action?.icon} size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-card-foreground">
                {action?.title}
              </h4>
              <p className="text-xs text-muted-foreground">
                {action?.description}
              </p>
            </div>
          </button>
        ))}
      </div>
      {/* More Actions Expandable Section */}
      {showMoreActions && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-sm font-medium text-card-foreground mb-3">More Actions</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {moreActions?.map((action) => (
              <button
                key={action?.id}
                onClick={action?.onClick}
                className="flex items-center space-x-2 p-3 border border-border rounded-lg hover:bg-muted/30 transition-smooth text-left text-sm hover:shadow-sm active:scale-95"
              >
                <div className={`p-1.5 rounded ${getColorClasses(action?.color)}`}>
                  <Icon name={action?.icon} size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-medium text-card-foreground">
                    {action?.title}
                  </h5>
                  <p className="text-xs text-muted-foreground">
                    {action?.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-6 pt-4 border-t border-border">
        <Button 
          variant="outline" 
          fullWidth 
          iconName={showMoreActions ? "ChevronUp" : "Plus"}
          onClick={handleMoreActions}
        >
          {showMoreActions ? 'Hide More Actions' : 'More Actions'}
        </Button>
      </div>
    </div>
  );
};

export default QuickActions;