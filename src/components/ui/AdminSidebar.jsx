import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';

const AdminSidebar = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard-overview',
      icon: 'LayoutDashboard'
    },
    {
      id: 'users',
      label: 'Users',
      path: '/user-management',
      icon: 'Users'
    },
    {
      id: 'spaces',
      label: 'Spaces',
      path: '/space-management',
      icon: 'Building'
    },
    {
      id: 'bookings',
      label: 'Bookings',
      path: '/booking-management',
      icon: 'Calendar'
    },
    {
      id: 'revenue',
      label: 'Revenue',
      path: '/commission-management',
      icon: 'DollarSign'
    },
    {
      id: 'content',
      label: 'Content',
      path: '/content-management',
      icon: 'FileText'
    },
    {
      id: 'support',
      label: 'Support',
      path: '/support-ticket-system',
      icon: 'MessageCircle'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      path: '/analytics-reports',
      icon: 'BarChart3'
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/platform-settings',
      icon: 'Settings'
    }
  ];

  useEffect(() => {
    const savedExpanded = localStorage.getItem('sidebar-expanded');
    if (savedExpanded !== null) {
      setIsExpanded(JSON.parse(savedExpanded));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sidebar-expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileOpen(false);
      }
      if (window.innerWidth >= 1024) {
        setIsExpanded(true);
      } else if (window.innerWidth >= 768) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigation = (path) => {
    navigate(path);
    if (window.innerWidth < 768) {
      setIsMobileOpen(false);
    }
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-sidebar lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed top-0 left-0 h-full bg-sidebar-background border-r border-sidebar-border sidebar-shadow z-sidebar
          transition-all duration-300 ease-smooth
          ${isExpanded ? 'w-sidebar' : 'w-sidebar-collapsed'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-header px-4 border-b border-sidebar-border">
          <div className={`flex items-center space-x-3 ${!isExpanded && 'lg:justify-center'}`}>
            <div className="flex-shrink-0">
              <svg width="32" height="32" viewBox="0 0 32 32" className="text-primary">
                <rect width="32" height="32" rx="6" fill="currentColor"/>
                <text x="16" y="22" textAnchor="middle" className="fill-white font-bold text-lg">S</text>
              </svg>
            </div>
            {isExpanded && (
              <h1 className="text-xl font-semibold text-sidebar-foreground">SPACIO</h1>
            )}
          </div>
          
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-sidebar-hover transition-smooth lg:hidden"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigationItems.map((item) => (
            <NavigationItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              path={item.path}
              isActive={isActive(item.path)}
              isExpanded={isExpanded}
              onClick={() => handleNavigation(item.path)}
            />
          ))}
        </nav>

        {/* Toggle Button (Desktop) */}
        <div className="hidden lg:block p-4 border-t border-sidebar-border">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-md hover:bg-sidebar-hover transition-smooth"
          >
            <Icon 
              name={isExpanded ? "ChevronLeft" : "ChevronRight"} 
              size={20} 
              className="text-sidebar-foreground"
            />
          </button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-header p-2 bg-header-background border border-header-border rounded-md shadow-card lg:hidden"
      >
        <Icon name="Menu" size={20} />
      </button>
    </>
  );
};

const NavigationItem = ({ icon, label, path, isActive, isExpanded, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-smooth
        ${isActive 
          ? 'bg-sidebar-active text-sidebar-active-foreground' 
          : 'text-sidebar-foreground hover:bg-sidebar-hover'
        }
        ${!isExpanded && 'lg:justify-center lg:space-x-0'}
      `}
    >
      <Icon 
        name={icon} 
        size={20} 
        className={isActive ? 'text-sidebar-active-foreground' : 'text-sidebar-foreground'}
      />
      {isExpanded && (
        <span className="font-medium">{label}</span>
      )}
      {!isExpanded && (
        <span className="sr-only">{label}</span>
      )}
    </button>
  );
};

export default AdminSidebar;