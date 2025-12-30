import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import NotificationBell from '../../components/NotificationBell';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import Icon from '../../components/AppIcon';
import KPICard from './components/KPICard';
import ActivityFeed from './components/ActivityFeed';
import BookingTrendsChart from './components/BookingTrendsChart';
import PendingApprovals from './components/PendingApprovals';
import QuickActions from './components/QuickActions';
import SystemStatus from './components/SystemStatus';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useAuth } from '../../contexts/AuthContext';
import { useSidebar } from '../../contexts/SidebarContext';
import LoadingState from '../../components/ui/LoadingState';

const DashboardOverview = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: dashboardData, refetch } = useDashboardData();
  const { user } = useAuth();
  const { isExpanded } = useSidebar();

  // Real-time updates are handled by Supabase subscriptions
  // Removed auto-refresh interval to prevent unwanted reloads

  // useEffect must be called before any conditional returns
  useEffect(() => {
    document.title = 'Dashboard Overview - SPACEL Admin';
  }, []);

  // Show loading state while data is being fetched
  if (dashboardData.loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSidebar />
        <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
          <header className="h-header bg-header-background border-b border-header-border px-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <UserProfileDropdown />
            </div>
          </header>
          <main className="p-6">
            <LoadingState message="Fetching dashboard information..." />
          </main>
        </div>
      </div>
    );
  }

  // Real KPI data from Supabase
  const kpiData = [
    {
      title: 'Total Users',
      value: dashboardData.users.total.toLocaleString(),
      change: `+${dashboardData.users.new} new`,
      changeType: 'positive',
      icon: 'Users',
      color: 'primary'
    },
    {
      title: 'Active Listings',
      value: dashboardData.listings.active.toLocaleString(),
      change: `${dashboardData.listings.pending} pending`,
      changeType: 'warning',
      icon: 'Building',
      color: 'success'
    },
    {
      title: 'Total Bookings',
      value: dashboardData.bookings.total.toLocaleString(),
      change: `${dashboardData.bookings.pending} pending`,
      changeType: 'warning',
      icon: 'Calendar',
      color: 'warning'
    },
    {
      title: 'Total Revenue',
      value: `$${dashboardData.revenue.total.toLocaleString()}`,
      change: `$${dashboardData.revenue.monthly.toLocaleString()} this month`,
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


  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      
      {/* Main Content */}
      <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
        {/* Header */}
        <header className={`sticky top-0 z-header bg-gray-50 border-b border-gray-200 transition-opacity duration-200 ${isModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            <div className="flex items-center space-x-4">
              {/* Global Search */}
              <form onSubmit={handleSearch} className="w-64 lg:w-80">
                <div className="relative">
                  <Icon 
                    name="Search" 
                    size={18} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-700 placeholder-gray-400"
                  />
                </div>
              </form>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <NotificationBell />

              {/* User Profile */}
              <UserProfileDropdown />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-5">
            {/* Welcome Section */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1.5 tracking-tight">
                Welcome {user?.email?.split('@')[0] || 'Admin'}!
              </h1>
              <p className="text-sm font-normal text-gray-500 leading-relaxed">
                Stay up to date with your platform's current status.
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              {/* Pending Approvals */}
              <div className="lg:col-span-1 h-full">
                <PendingApprovals onModalStateChange={setIsModalOpen} />
              </div>

              {/* Quick Actions */}
              <div className="lg:col-span-1 h-full">
                <QuickActions />
              </div>

              {/* System Status */}
              <div className="lg:col-span-1 h-full">
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