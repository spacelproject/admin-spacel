import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import Icon from '../../components/AppIcon';
import KPICard from './components/KPICard';
import ActivityFeed from './components/ActivityFeed';
import BookingTrendsChart from './components/BookingTrendsChart';
import PendingApprovals from './components/PendingApprovals';
import QuickActions from './components/QuickActions';
import SystemStatus from './components/SystemStatus';

const DashboardOverview = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications] = useState(3);

  // Mock KPI data
  const kpiData = [
    {
      title: 'Total Users',
      value: '12,847',
      change: '+12.5%',
      changeType: 'positive',
      icon: 'Users',
      color: 'primary'
    },
    {
      title: 'Active Spaces',
      value: '2,341',
      change: '+8.2%',
      changeType: 'positive',
      icon: 'Building',
      color: 'success'
    },
    {
      title: 'Monthly Bookings',
      value: '8,924',
      change: '+15.3%',
      changeType: 'positive',
      icon: 'Calendar',
      color: 'warning'
    },
    {
      title: 'Revenue',
      value: '$284,592',
      change: '+23.1%',
      changeType: 'positive',
      icon: 'DollarSign',
      color: 'primary'
    }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      // Implement global search functionality
    }
  };

  const handleNotificationClick = () => {
    console.log('Opening notifications');
    // Implement notification panel
  };

  useEffect(() => {
    document.title = 'Dashboard Overview - SPACIO Admin';
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      {/* Main Content */}
      <div className="lg:ml-sidebar">
        {/* Header */}
        <header className="sticky top-0 z-header bg-header-background border-b border-header-border">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-header-foreground lg:hidden">
                SPACIO
              </h1>
              
              {/* Global Search */}
              <form onSubmit={handleSearch} className="hidden md:block">
                <div className="relative">
                  <Icon 
                    name="Search" 
                    size={20} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Search users, spaces, bookings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-72 xl:w-80 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  />
                </div>
              </form>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button
                onClick={handleNotificationClick}
                className="relative p-2 text-muted-foreground hover:text-foreground transition-smooth"
              >
                <Icon name="Bell" size={20} />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-error text-error-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>

              {/* User Profile */}
              <UserProfileDropdown />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6 space-y-6">
          <div className="max-w-7xl mx-auto">
            <BreadcrumbNavigation />
            
            {/* Welcome Section */}
            <div className="bg-card rounded-lg border border-border p-6 card-shadow">
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Welcome back, Admin!
              </h1>
              <p className="text-muted-foreground">
                Here's what's happening with your platform today.
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {kpiData.map((kpi, index) => (
                <KPICard
                  key={index}
                  title={kpi.title}
                  value={kpi.value}
                  change={kpi.change}
                  changeType={kpi.changeType}
                  icon={kpi.icon}
                  color={kpi.color}
                />
              ))}
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 lg:gap-6">
              {/* Activity Feed */}
              <div className="xl:col-span-1">
                <ActivityFeed />
              </div>

              {/* Booking Trends Chart */}
              <div className="xl:col-span-2">
                <BookingTrendsChart />
              </div>
            </div>

            {/* Secondary Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Pending Approvals */}
              <div className="lg:col-span-1">
                <PendingApprovals />
              </div>

              {/* Quick Actions */}
              <div className="lg:col-span-1">
                <QuickActions />
              </div>

              {/* System Status */}
              <div className="lg:col-span-1">
                <SystemStatus />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardOverview;