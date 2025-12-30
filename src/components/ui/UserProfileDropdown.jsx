import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Image from '../AppImage';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ProfileSettingsModal from './ProfileSettingsModal';
import PreferencesModal from './PreferencesModal';

const UserProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const dropdownRef = useRef(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.warn('Error fetching profile:', error);
          setUserProfile(null);
          return;
        }

        setUserProfile(profile);
      } catch (error) {
        console.warn('Error fetching profile:', error);
        setUserProfile(null);
      }
    };

    if (user?.id) {
      fetchUserProfile();
    }
  }, [user?.id]);

  // Listen for profile updates
  useEffect(() => {
    const handleProfileUpdate = async () => {
      if (!user?.id) return;

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name, last_name, email, avatar_url')
          .eq('id', user.id)
          .single();

        if (!error && profile) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.warn('Error refreshing profile:', error);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [user?.id]);

  // Get user display info from profile or auth context
  const userDisplayName = userProfile?.first_name && userProfile?.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`.trim()
    : userProfile?.first_name || user?.email?.split('@')[0] || 'User';
  const userEmail = userProfile?.email || user?.email || '';
  const userRole = user?.role === 'super_admin' ? 'Super Administrator' :
                   user?.role === 'admin' ? 'Administrator' :
                   user?.role === 'support' ? 'Support Agent' :
                   'User';
  const userAvatar = userProfile?.avatar_url || user?.avatar_url || '/assets/images/no_image.png';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...');
      setIsOpen(false);
      const result = await signOut();
      
      if (result.success) {
        console.log('✅ Logged out successfully');
        // Navigate to login page
        navigate('/admin-login');
      } else {
        console.error('❌ Logout failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Even if there's an error, try to navigate to login
      navigate('/admin-login');
    }
  };

  const handleProfile = () => {
    setIsOpen(false);
    setShowProfileModal(true);
  };

  const handlePreferences = () => {
    setIsOpen(false);
    setShowPreferencesModal(true);
  };

  const dropdownItems = [
    {
      id: 'profile',
      label: 'Profile Settings',
      icon: 'User',
      onClick: handleProfile
    },
    {
      id: 'preferences',
      label: 'Preferences',
      icon: 'Settings',
      onClick: handlePreferences
    },
    {
      id: 'divider',
      type: 'divider'
    },
    {
      id: 'logout',
      label: 'Sign Out',
      icon: 'LogOut',
      onClick: handleLogout,
      variant: 'danger'
    }
  ];

  // Don't render if no user
  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-0 rounded-full hover:ring-2 hover:ring-gray-300 transition-smooth focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Image
          src={userAvatar}
          alt={userDisplayName}
          className="w-10 h-10 rounded-full object-cover"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-md shadow-modal z-dropdown">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center space-x-3">
              <Image
                src={userAvatar}
                alt={userDisplayName}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-popover-foreground truncate">
                  {userDisplayName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </p>
                <p className="text-xs text-accent font-medium">
                  {userRole}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            {dropdownItems.map((item) => {
              if (item.type === 'divider') {
                return (
                  <div key={item.id} className="my-1 border-t border-border" />
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-2 text-left transition-smooth
                    ${item.variant === 'danger' ? 'text-destructive hover:bg-destructive/10' : 'text-popover-foreground hover:bg-muted'}
                  `}
                >
                  <Icon 
                    name={item.icon} 
                    size={16} 
                    className={item.variant === 'danger' ? 'text-destructive' : 'text-muted-foreground'}
                  />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modals */}
      <ProfileSettingsModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
      <PreferencesModal
        isOpen={showPreferencesModal}
        onClose={() => setShowPreferencesModal(false)}
      />
    </div>
  );
};

export default UserProfileDropdown;