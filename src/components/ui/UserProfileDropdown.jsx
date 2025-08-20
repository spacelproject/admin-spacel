import React, { useState, useRef, useEffect } from 'react';
import Icon from '../AppIcon';
import Image from '../AppImage';

const UserProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Mock user data - replace with actual user context
  const user = {
    name: 'Admin User',
    email: 'admin@spacio.com',
    role: 'Super Administrator',
    avatar: '/assets/images/admin-avatar.jpg'
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    // Implement logout logic
    console.log('Logging out...');
    setIsOpen(false);
  };

  const handleProfile = () => {
    // Navigate to profile page
    console.log('Navigate to profile...');
    setIsOpen(false);
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
      onClick: () => setIsOpen(false)
    },
    {
      id: 'help',
      label: 'Help & Support',
      icon: 'HelpCircle',
      onClick: () => setIsOpen(false)
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted transition-smooth"
      >
        <div className="flex-shrink-0">
          <Image
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-foreground">{user.name}</p>
          <p className="text-xs text-muted-foreground">{user.role}</p>
        </div>
        <Icon 
          name={isOpen ? "ChevronUp" : "ChevronDown"} 
          size={16} 
          className="text-muted-foreground hidden md:block"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-md shadow-modal z-dropdown">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center space-x-3">
              <Image
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-popover-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
                <p className="text-xs text-accent font-medium">
                  {user.role}
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
                    ${item.variant === 'danger' ?'text-destructive hover:bg-destructive/10' :'text-popover-foreground hover:bg-muted'
                    }
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
    </div>
  );
};

export default UserProfileDropdown;