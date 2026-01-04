import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';

const BreadcrumbNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Route to label mapping
  const routeLabels = {
    '/dashboard-overview': 'Dashboard',
    '/user-management': 'User Management',
    '/space-management': 'Space Management',
    '/booking-management': 'Booking Management',
    '/commission-management': 'Commission Management',
    '/content-management': 'Content Management',
    '/support-ticket-system': 'Support Tickets',
    '/account-deletion-requests': 'Account Deletion Requests',
    '/city-requests': 'City Requests',
    '/analytics-reports': 'Analytics & Reports',
    '/platform-settings': 'Platform Settings'
  };

  // Generate breadcrumb items based on current path
  const generateBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [];

    // Always include Dashboard as root
    breadcrumbs.push({
      label: 'Dashboard',
      path: '/dashboard-overview',
      isActive: location.pathname === '/dashboard-overview'
    });

    // Add current page if not dashboard
    if (location.pathname !== '/dashboard-overview') {
      const currentLabel = routeLabels[location.pathname] || 'Page';
      breadcrumbs.push({
        label: currentLabel,
        path: location.pathname,
        isActive: true
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't render breadcrumbs on login page
  if (location.pathname === '/admin-login') {
    return null;
  }

  const handleNavigation = (path, isActive) => {
    if (!isActive) {
      navigate(path);
    }
  };

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.path}>
          {index > 0 && (
            <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
          )}
          <button
            onClick={() => handleNavigation(crumb.path, crumb.isActive)}
            className={`
              transition-smooth hover:text-foreground
              ${crumb.isActive 
                ? 'text-foreground font-medium cursor-default' 
                : 'text-muted-foreground hover:text-primary cursor-pointer'
              }
            `}
            disabled={crumb.isActive}
          >
            {crumb.label}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default BreadcrumbNavigation;