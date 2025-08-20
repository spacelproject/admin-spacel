import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const ActivityFeed = () => {
  const navigate = useNavigate();

  const activities = [
    {
      id: 1,
      type: 'user_registration',
      title: 'New User Registration',
      description: 'Sarah Johnson registered as a new user',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e0d5d4?w=150',
      timestamp: '2 minutes ago',
      priority: 'normal'
    },
    {
      id: 2,
      type: 'space_submission',
      title: 'Space Listing Submitted',
      description: 'Modern Conference Room in Downtown submitted for approval',
      avatar: 'https://images.pexels.com/photos/416405/pexels-photo-416405.jpeg?w=150',
      timestamp: '15 minutes ago',
      priority: 'high'
    },
    {
      id: 3,
      type: 'support_ticket',
      title: 'Support Ticket Created',
      description: 'Payment issue reported by Michael Chen',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      timestamp: '32 minutes ago',
      priority: 'urgent'
    },
    {
      id: 4,
      type: 'booking_completed',
      title: 'Booking Completed',
      description: 'Executive Meeting Room booked for tomorrow',
      avatar: 'https://images.pixabay.com/photo/2016/11/21/12/42/beard-1845166_150.jpg',
      timestamp: '1 hour ago',
      priority: 'normal'
    },
    {
      id: 5,
      type: 'user_registration',
      title: 'New User Registration',
      description: 'David Wilson registered as a new user',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      timestamp: '2 hours ago',
      priority: 'normal'
    }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'user_registration':
        return 'UserPlus';
      case 'space_submission':
        return 'Building';
      case 'support_ticket':
        return 'MessageCircle';
      case 'booking_completed':
        return 'Calendar';
      default:
        return 'Bell';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-error';
      case 'high':
        return 'border-l-warning';
      default:
        return 'border-l-primary';
    }
  };

  const handleViewAllActivities = () => {
    // Navigate to a comprehensive activity log/audit trail
    // For now, navigate to analytics reports with activity filter
    navigate('/analytics-reports?tab=activity&filter=all');
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-card-foreground">Recent Activity</h3>
        <button 
          onClick={handleViewAllActivities}
          className="text-sm text-primary hover:text-primary/80 transition-smooth"
        >
          View All
        </button>
      </div>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {activities?.map((activity) => (
          <div 
            key={activity?.id} 
            className={`flex items-start space-x-3 p-3 border-l-2 ${getPriorityColor(activity?.priority)} bg-muted/30 rounded-r-md`}
          >
            <div className="flex-shrink-0">
              <Image
                src={activity?.avatar}
                alt="Activity avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Icon 
                  name={getActivityIcon(activity?.type)} 
                  size={14} 
                  className="text-muted-foreground"
                />
                <p className="text-sm font-medium text-card-foreground">
                  {activity?.title}
                </p>
              </div>
              <p className="text-sm text-muted-foreground mb-1">
                {activity?.description}
              </p>
              <p className="text-xs text-muted-foreground">
                {activity?.timestamp}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;