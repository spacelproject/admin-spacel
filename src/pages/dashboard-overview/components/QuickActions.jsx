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
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-amber-600 bg-amber-50';
      case 'secondary':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-blue-600 bg-blue-50';
    }
  };

  const handleMoreActions = () => {
    setShowMoreActions(!showMoreActions);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 card-shadow h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900 tracking-tight">Quick Actions</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Jump straight into the most common admin tasks without digging through menus.
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 flex-1 content-start">
        {actions?.map((action) => (
          <button
            key={action?.id}
            onClick={action?.onClick}
            className="group flex flex-col items-start justify-start p-3.5 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left active:scale-[0.98] h-full"
          >
            <div className={`p-2.5 rounded-lg mb-2.5 ${getColorClasses(action?.color)} group-hover:scale-110 transition-transform duration-200`}>
              <Icon name={action?.icon} size={18} />
            </div>
            <div className="flex-1 w-full flex flex-col justify-start">
              <h4 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors leading-tight">
                {action?.title}
              </h4>
              <p className="text-xs font-normal text-gray-500 line-clamp-2 leading-relaxed flex-1">
                {action?.description}
              </p>
            </div>
          </button>
        ))}
        </div>
        {/* More Actions Expandable Section */}
        {showMoreActions && (
          <div className="mt-2.5 pt-2.5 border-t border-gray-200 flex-1 flex flex-col">
            <h4 className="text-sm font-semibold text-gray-900 mb-2.5">More Actions</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1 content-start">
              {moreActions?.map((action) => (
                <button
                  key={action?.id}
                  onClick={action?.onClick}
                  className="group flex flex-col items-start justify-start p-3 bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left active:scale-[0.98] h-full"
                >
                  <div className={`p-2 rounded-lg mb-2 ${getColorClasses(action?.color)} group-hover:scale-110 transition-transform duration-200`}>
                    <Icon name={action?.icon} size={18} />
                  </div>
                  <div className="flex-1 w-full flex flex-col justify-start">
                    <h5 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors leading-tight">
                      {action?.title}
                    </h5>
                    <p className="text-xs font-normal text-gray-500 line-clamp-2 leading-relaxed flex-1">
                      {action?.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="mt-auto pt-2.5 border-t border-gray-200 flex-shrink-0">
        <Button 
          variant="outline" 
          fullWidth 
          size="xs"
          iconName={showMoreActions ? "ChevronUp" : "ChevronDown"}
          onClick={handleMoreActions}
          className="text-xs font-medium"
        >
          {showMoreActions ? 'Show Less' : 'Show More Actions'}
        </Button>
      </div>
    </div>
  );
};

export default QuickActions;