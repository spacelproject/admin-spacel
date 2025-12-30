import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';

const AdminSidebar = () => {
  const { user, signOut } = useAuth();
  const { isExpanded, setIsExpanded } = useSidebar();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Don't render sidebar for support agents
  if (user?.role === 'support') {
    return null;
  }


  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard-overview',
      icon: 'LayoutDashboard',
      badge: null
    },
    {
      id: 'users',
      label: 'Users',
      path: '/user-management',
      icon: 'Users',
      badge: null
    },
    {
      id: 'spaces',
      label: 'Spaces',
      path: '/space-management',
      icon: 'Building',
      badge: null
    },
    {
      id: 'bookings',
      label: 'Bookings',
      path: '/booking-management',
      icon: 'Calendar',
      badge: null
    },
    {
      id: 'revenue',
      label: 'Revenue',
      path: '/commission-management',
      icon: 'DollarSign',
      badge: null
    },
    {
      id: 'content',
      label: 'Content',
      path: '/content-management',
      icon: 'FileText',
      badge: null
    },
    {
      id: 'support',
      label: 'Support',
      path: '/support-ticket-system',
      icon: 'MessageCircle',
      badge: null
    },
    {
      id: 'analytics',
      label: 'Analytics',
      path: '/analytics-reports',
      icon: 'BarChart3',
      badge: null
    },
    {
      id: 'settings',
      label: 'Settings',
      path: '/platform-settings',
      icon: 'Settings',
      badge: null
    }
  ];

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
  }, [setIsExpanded]);

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

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/admin-login');
    } catch (error) {
      console.error('Error during logout:', error);
      navigate('/admin-login');
    }
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
          fixed top-0 left-0 h-full bg-white border-r border-gray-200 shadow-sm z-sidebar
          transition-all duration-300 ease-smooth flex flex-col
          ${isExpanded ? 'w-sidebar' : 'w-sidebar-collapsed'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className={`flex items-center space-x-3 ${!isExpanded && 'lg:justify-center lg:w-full'}`}>
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
            </div>
            {isExpanded && (
              <div>
                <h1 className="text-base font-semibold text-gray-900">SPACEL</h1>
                <p className="text-xs text-gray-500">Admin Panel</p>
              </div>
            )}
          </div>
          
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-gray-100 transition-smooth text-gray-500 lg:hidden"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => (
            <NavigationItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              path={item.path}
              isActive={isActive(item.path)}
              isExpanded={isExpanded}
              badge={item.badge}
              onClick={() => handleNavigation(item.path)}
            />
          ))}
        </nav>

        {/* Toggle Button (Desktop) - Middle */}
        <div className="hidden lg:flex justify-center p-2 border-t border-gray-200">
          <button
            onClick={toggleSidebar}
            className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 transition-smooth text-gray-500 hover:text-gray-700"
          >
            <Icon 
              name={isExpanded ? "ChevronLeft" : "ChevronRight"} 
              size={18} 
            />
          </button>
        </div>

        {/* Logout Button - Bottom */}
        <div className="px-3 py-2 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center ${isExpanded ? 'justify-start' : 'justify-center'} 
              px-3 py-2 rounded-lg transition-smooth relative
              text-red-600 hover:bg-red-50 hover:text-red-700
            `}
          >
            <Icon 
              name="LogOut" 
              size={18} 
              className="text-red-600"
            />
            {isExpanded && (
              <span className="text-sm font-medium text-red-600 ml-3">Logout</span>
            )}
            {!isExpanded && (
              <span className="sr-only">Logout</span>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-header p-2 bg-white border border-gray-200 rounded-lg shadow-sm lg:hidden"
      >
        <Icon name="Menu" size={20} />
      </button>
    </>
  );
};

const NavigationItem = ({ icon, label, path, isActive, isExpanded, onClick, badge }) => {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center ${isExpanded ? 'justify-between' : 'justify-center'} 
        px-3 py-2 rounded-lg transition-smooth relative
        ${isActive 
          ? 'bg-blue-600 text-white' 
          : 'text-gray-700 hover:bg-gray-100'
        }
      `}
    >
      <div className="flex items-center space-x-3">
        <Icon 
          name={icon} 
          size={18} 
          className={isActive ? 'text-white' : 'text-gray-600'}
        />
        {isExpanded && (
          <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-700'}`}>
            {label}
          </span>
        )}
      </div>
      {isExpanded && badge !== null && badge !== undefined && badge > 0 && (
        <span className={`text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium min-w-[20px] ${
          isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
        }`}>
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      {!isExpanded && badge !== null && badge !== undefined && badge > 0 && (
        <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-xs rounded-full h-2 w-2" />
      )}
    </button>
  );
};

export default AdminSidebar;