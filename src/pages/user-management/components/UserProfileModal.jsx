import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const UserProfileModal = ({ user, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('personal');

  if (!isOpen || !user) return null;

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: 'User' },
    { id: 'bookings', label: 'Booking History', icon: 'Calendar' },
    { id: 'spaces', label: 'Space Listings', icon: 'Building' },
    { id: 'activity', label: 'Activity Logs', icon: 'Activity' }
  ];

  const mockBookings = [
    {
      id: 'BK001',
      spaceName: 'Modern Conference Room',
      date: '2025-01-15',
      duration: '2 hours',
      amount: '$120',
      status: 'completed'
    },
    {
      id: 'BK002',
      spaceName: 'Creative Workshop Space',
      date: '2025-01-10',
      duration: '4 hours',
      amount: '$200',
      status: 'completed'
    },
    {
      id: 'BK003',
      spaceName: 'Executive Meeting Room',
      date: '2025-01-20',
      duration: '3 hours',
      amount: '$180',
      status: 'upcoming'
    }
  ];

  const mockSpaces = [
    {
      id: 'SP001',
      name: 'Downtown Office Suite',
      type: 'Office',
      status: 'active',
      bookings: 45,
      revenue: '$2,340'
    },
    {
      id: 'SP002',
      name: 'Creative Studio Space',
      type: 'Studio',
      status: 'active',
      bookings: 32,
      revenue: '$1,890'
    }
  ];

  const mockActivities = [
    {
      id: 1,
      action: 'Profile Updated',
      timestamp: '2025-01-17 14:30:00',
      details: 'Updated contact information'
    },
    {
      id: 2,
      action: 'Booking Created',
      timestamp: '2025-01-16 09:15:00',
      details: 'Booked Executive Meeting Room'
    },
    {
      id: 3,
      action: 'Payment Processed',
      timestamp: '2025-01-15 16:45:00',
      details: 'Payment of $120 processed successfully'
    },
    {
      id: 4,
      action: 'Space Listed',
      timestamp: '2025-01-14 11:20:00',
      details: 'Listed new space: Creative Studio Space'
    }
  ];

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'text-success bg-success/10', label: 'Active' },
      suspended: { color: 'text-warning bg-warning/10', label: 'Suspended' },
      pending: { color: 'text-accent bg-accent/10', label: 'Pending' },
      inactive: { color: 'text-muted-foreground bg-muted', label: 'Inactive' },
      completed: { color: 'text-success bg-success/10', label: 'Completed' },
      upcoming: { color: 'text-accent bg-accent/10', label: 'Upcoming' },
      cancelled: { color: 'text-destructive bg-destructive/10', label: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
          <p className="text-sm text-muted-foreground">{user.name}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
          <p className="text-sm text-muted-foreground">{user.phone || '+1 (555) 123-4567'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">User Type</label>
          <p className="text-sm text-muted-foreground capitalize">{user.userType}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Location</label>
          <p className="text-sm text-muted-foreground">{user.location || 'New York, NY'}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Account Status</label>
          {getStatusBadge(user.status)}
        </div>
      </div>

      {/* Account Details */}
      <div className="border-t border-border pt-6">
        <h4 className="text-sm font-medium text-foreground mb-4">Account Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Registration Date</label>
            <p className="text-sm text-muted-foreground">
              {new Date(user.registrationDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Last Activity</label>
            <p className="text-sm text-muted-foreground">
              {new Date(user.lastActivity).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Total Bookings</label>
            <p className="text-sm text-muted-foreground">{user.totalBookings || 12}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Total Spent</label>
            <p className="text-sm text-muted-foreground">${user.totalSpent || '1,240'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBookings = () => (
    <div className="space-y-4">
      {mockBookings.map((booking) => (
        <div key={booking.id} className="border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-medium text-foreground">{booking.spaceName}</h4>
              <p className="text-xs text-muted-foreground">Booking ID: {booking.id}</p>
            </div>
            {getStatusBadge(booking.status)}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Date:</span>
              <p className="text-foreground">{new Date(booking.date).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Duration:</span>
              <p className="text-foreground">{booking.duration}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Amount:</span>
              <p className="text-foreground font-medium">{booking.amount}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSpaces = () => (
    <div className="space-y-4">
      {user.userType === 'host' ? (
        mockSpaces.map((space) => (
          <div key={space.id} className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-medium text-foreground">{space.name}</h4>
                <p className="text-xs text-muted-foreground">Space ID: {space.id}</p>
              </div>
              {getStatusBadge(space.status)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Type:</span>
                <p className="text-foreground">{space.type}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Total Bookings:</span>
                <p className="text-foreground">{space.bookings}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Revenue:</span>
                <p className="text-foreground font-medium">{space.revenue}</p>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8">
          <Icon name="Building" size={48} className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">This user is a guest and has no space listings.</p>
        </div>
      )}
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-4">
      {mockActivities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
          <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-foreground">{activity.action}</h4>
              <span className="text-xs text-muted-foreground">
                {new Date(activity.timestamp).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{activity.details}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return renderPersonalInfo();
      case 'bookings':
        return renderBookings();
      case 'spaces':
        return renderSpaces();
      case 'activity':
        return renderActivity();
      default:
        return renderPersonalInfo();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-4">
            <Image
              src={user.avatar}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover"
            />
            <div>
              <h2 className="text-xl font-semibold text-foreground">{user.name}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge(user.status)}
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground capitalize">{user.userType}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={onClose}
          />
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 border-b-2 transition-smooth
                  ${activeTab === tab.id
                    ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground'
                  }
                `}
              >
                <Icon name={tab.icon} size={16} />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="default" iconName="Edit">
            Edit User
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;