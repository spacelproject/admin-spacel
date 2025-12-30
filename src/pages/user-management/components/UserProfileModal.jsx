import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { formatCurrencyDisplay } from '../../../utils/currency';
import UserNotesSection from './UserNotesSection';
import UserTagsSection from './UserTagsSection';

const UserProfileModal = ({ user, isOpen, onClose, onTogglePayout }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const { userProfile, userBookings, userSpaces, userActivity, loading, error } = useUserProfile(user?.id);

  if (!isOpen || !user) return null;

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: 'User' },
    { id: 'bookings', label: 'Booking History', icon: 'Calendar' },
    { id: 'spaces', label: 'Space Listings', icon: 'Building' },
    { id: 'activity', label: 'Activity Logs', icon: 'Activity' },
    { id: 'notes', label: 'Admin Notes', icon: 'FileText' }
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

  const renderPersonalInfo = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Icon name="Loader2" className="animate-spin text-primary" size={24} />
          <span className="ml-2 text-muted-foreground">Loading profile...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8 text-red-500">
          Error loading profile: {error}
        </div>
      );
    }

    if (!userProfile) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Icon name="User" size={48} className="mx-auto mb-4 opacity-50" />
          <p>Profile not found</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
            <p className="text-sm text-muted-foreground">
              {userProfile.first_name} {userProfile.last_name}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Email Address</label>
            <p className="text-sm text-muted-foreground">{userProfile.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
            <p className="text-sm text-muted-foreground">
              {userProfile.phone || 'Not provided'}
              {userProfile.is_phone_verified && (
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  <Icon name="Check" size={12} className="mr-1" />
                  Verified
                </span>
              )}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">User Type</label>
            <p className="text-sm text-muted-foreground capitalize">{userProfile.role}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Company</label>
            <p className="text-sm text-muted-foreground">
              {userProfile.company_name || 'Not specified'}
              {userProfile.company_type && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({userProfile.company_type})
                </span>
              )}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Account Status</label>
            {getStatusBadge(user.status)}
          </div>
          {userProfile.role === 'partner' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Payout Status</label>
              {userProfile.payout_disabled ? (
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-100 flex items-center space-x-1">
                    <Icon name="Ban" size={12} />
                    <span>Disabled</span>
                  </span>
                  {userProfile.payout_disabled_reason && (
                    <span className="text-xs text-muted-foreground">
                      ({userProfile.payout_disabled_reason})
                    </span>
                  )}
                </div>
              ) : (
                <span className="px-2 py-1 rounded-full text-xs font-medium text-green-600 bg-green-100 flex items-center space-x-1 w-fit">
                  <Icon name="CheckCircle" size={12} />
                  <span>Enabled</span>
                </span>
              )}
              {userProfile.payout_disabled_at && (
                <p className="text-xs text-muted-foreground mt-1">
                  Disabled on: {new Date(userProfile.payout_disabled_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Account Details */}
        <div className="border-t border-border pt-6">
          <h4 className="text-sm font-medium text-foreground mb-4">Account Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Registration Date</label>
              <p className="text-sm text-muted-foreground">
                {userProfile.created_at 
                  ? new Date(userProfile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Not available'
                }
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Last Activity</label>
              <p className="text-sm text-muted-foreground">
                {userProfile.updated_at 
                  ? new Date(userProfile.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })
                  : 'Not available'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        {userProfile.bio && (
          <div className="border-t border-border pt-6">
            <h4 className="text-sm font-medium text-foreground mb-4">Bio</h4>
            <p className="text-sm text-muted-foreground">{userProfile.bio}</p>
          </div>
        )}

        {/* User Tags Section */}
        <div className="border-t border-border pt-6">
          <UserTagsSection userId={user?.id} />
        </div>
      </div>
    );
  };

  // Render booking history tab
  const renderBookings = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size={24} className="mr-2" />
          <span className="text-muted-foreground">Loading booking history...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8 text-error">
          <Icon name="AlertCircle" size={48} className="mx-auto mb-4" />
          <p>Error loading booking history: {error}</p>
        </div>
      );
    }

    if (!userBookings || userBookings.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Icon name="Calendar" size={48} className="mx-auto mb-4 opacity-50" />
          <p>No booking history found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {userBookings.map((booking) => (
          <div key={booking.id} className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-medium text-foreground">
                  {booking.listings?.name || 'Unknown Space'}
                </h4>
                <p className="text-xs text-muted-foreground">Reference: {booking.booking_reference}</p>
              </div>
              {getStatusBadge(booking.status)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Start Date & Time:</span>
                <p className="text-foreground">
                  {new Date(booking.start_time).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">End Date & Time:</span>
                <p className="text-foreground">
                  {new Date(booking.end_time).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Duration:</span>
                <p className="text-foreground">
                  {(() => {
                    const start = new Date(booking.start_time);
                    const end = new Date(booking.end_time);
                    const diffMs = end - start;
                    const diffHours = Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;
                    return diffHours > 24 
                      ? `${Math.round(diffHours / 24)} days` 
                      : `${diffHours} hours`;
                  })()}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Guests:</span>
                <p className="text-foreground">{booking.guest_count || 1}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="text-foreground font-medium text-lg">
                    {formatCurrencyDisplay(parseFloat(booking.total_paid) || parseFloat(booking.price) || 0)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment Status:</span>
                  <p className="text-foreground">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      booking.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-800'
                        : booking.payment_status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {booking.payment_status || 'pending'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            {booking.special_requests && (
              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-muted-foreground text-sm">Special Requests:</span>
                <p className="text-foreground text-sm">{booking.special_requests}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Render space listings tab
  const renderSpaces = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size={24} className="mr-2" />
          <span className="text-muted-foreground">Loading space listings...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8 text-error">
          <Icon name="AlertCircle" size={48} className="mx-auto mb-4" />
          <p>Error loading space listings: {error}</p>
        </div>
      );
    }

    if (!userSpaces || userSpaces.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Icon name="Building" size={48} className="mx-auto mb-4 opacity-50" />
          <p>No space listings found</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {userSpaces.map((space) => (
          <div key={space.id} className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-medium text-foreground">{space.name}</h4>
                <p className="text-xs text-muted-foreground">Space ID: {space.id.slice(0, 8)}...</p>
              </div>
              {getStatusBadge(space.status)}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Category:</span>
                <p className="text-foreground">{space.category}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Price:</span>
                <p className="text-foreground">
                  {formatCurrencyDisplay(space.hourly_price)}/hour, {formatCurrencyDisplay(space.daily_price)}/day
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Capacity:</span>
                <p className="text-foreground">{space.capacity} people</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border">
              <span className="text-muted-foreground text-sm">Address:</span>
              <p className="text-foreground text-sm">{space.address}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render activity logs tab
  const renderActivity = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size={24} className="mr-2" />
          <span className="text-muted-foreground">Loading activity logs...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8 text-error">
          <Icon name="AlertCircle" size={48} className="mx-auto mb-4" />
          <p>Error loading activity logs: {error}</p>
        </div>
      );
    }

    if (!userActivity || userActivity.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Icon name="Activity" size={48} className="mx-auto mb-4 opacity-50" />
          <p>No activity logs found</p>
        </div>
      );
    }

    const getActivityIcon = (type) => {
      switch (type) {
        case 'status_change':
          return 'ShieldAlert';
        case 'notification':
          return 'Bell';
        case 'message':
          return 'MessageCircle';
        case 'booking_modification':
          return 'Edit';
        default:
          return 'Activity';
      }
    };

    const getActivityColor = (type) => {
      switch (type) {
        case 'status_change':
          return 'bg-red-500';
        case 'notification':
          return 'bg-blue-500';
        case 'message':
          return 'bg-green-500';
        case 'booking_modification':
          return 'bg-orange-500';
        default:
          return 'bg-primary';
      }
    };

    return (
      <div className="space-y-4">
        {userActivity.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
            <div className={`flex-shrink-0 w-2 h-2 ${getActivityColor(activity.type)} rounded-full mt-2`}></div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <Icon name={getActivityIcon(activity.type)} size={14} className="text-muted-foreground" />
                  <h4 className="text-sm font-medium text-foreground">{activity.title}</h4>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{activity.message}</p>
              {activity.reason && (
                <p className="text-xs text-muted-foreground mt-1">Reason: {activity.reason}</p>
              )}
              {activity.read !== undefined && (
                <span className={`inline-block px-2 py-1 rounded-full text-xs mt-2 ${
                  activity.read ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {activity.read ? 'Read' : 'Unread'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderNotes = () => {
    return (
      <div className="space-y-4">
        <UserNotesSection userId={user?.id} />
      </div>
    );
  };

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
      case 'notes':
        return renderNotes();
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
          {userProfile?.role === 'partner' && onTogglePayout && (
            <Button
              variant={userProfile?.payout_disabled ? 'default' : 'destructive'}
              iconName={userProfile?.payout_disabled ? 'CheckCircle' : 'Ban'}
              onClick={() => onTogglePayout(user)}
            >
              {userProfile?.payout_disabled ? 'Enable Payout' : 'Disable Payout'}
            </Button>
          )}
          <Button variant="default" iconName="Edit">
            Edit User
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;