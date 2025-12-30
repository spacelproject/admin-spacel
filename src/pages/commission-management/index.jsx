import React, { useState } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import NotificationBell from '../../components/NotificationBell';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import RevenueTrackingTable from './components/RevenueTrackingTable';
import RevenueSummaryCards from './components/RevenueSummaryCards';
import RateChangeHistory from './components/RateChangeHistory';
import RevenueChart from './components/RevenueChart';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { ToastProvider } from '../../components/ui/Toast';
import LoadingState from '../../components/ui/LoadingState';
import useCommissionData from '../../hooks/useCommissionData';
import { useSidebar } from '../../contexts/SidebarContext';

const CommissionManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);
  const { isExpanded } = useSidebar();

  // Use real commission data from database
  const { 
    summary, 
    bookings, 
    monthlyData, 
    hostEarnings, 
    loading, 
    error, 
    exportCommissionData 
  } = useCommissionData();

  // Debug logging for commission management
  console.log('🔍 CommissionManagement received data:', {
    summary,
    bookingsCount: bookings?.length,
    loading,
    error,
    totalRevenue: summary?.totalRevenue,
    totalCommission: summary?.totalCommission,
    sampleBooking: bookings?.[0]
  });

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      await exportCommissionData();
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePlatformSettings = () => {
    // Navigate to platform settings
    window.location.href = '/platform-settings';
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'BarChart3' },
    { id: 'history', label: 'Change History', icon: 'Clock' }
  ];

  // Show loading state
  if (loading) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-background">
          <AdminSidebar />
          <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
            <header className="h-header bg-header-background border-b border-header-border px-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-foreground">Commission Management</h1>
              </div>
              <div className="flex items-center space-x-4">
                <NotificationBell />
                <UserProfileDropdown />
              </div>
            </header>
            <main className="p-6">
              <LoadingState message="Fetching commission information..." />
            </main>
          </div>
        </div>
      </ToastProvider>
    );
  }

  // Show error state
  if (error) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-background">
          <AdminSidebar />
          <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
            <main className="p-6">
              <div className="text-center py-12">
                <Icon name="AlertCircle" size={48} className="text-error mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Commission Data</h3>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </main>
          </div>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <AdminSidebar />
          <div className={`transition-all duration-300 ${isExpanded ? 'lg:ml-sidebar' : 'lg:ml-sidebar-collapsed'}`}>
        {/* Header */}
        <header className="h-header bg-header-background border-b border-header-border px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-header-foreground">Commission Management</h1>
          </div>
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <UserProfileDropdown />
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 lg:p-6 w-full max-w-none">
          <BreadcrumbNavigation />

          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Commission Management</h1>
              <p className="text-muted-foreground">
                Configure commission rates, track revenue, and manage platform earnings
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                iconName={isExporting ? "Loader2" : "Download"}
                iconPosition="left"
                onClick={handleExportData}
                disabled={isExporting}
                className={isExporting ? "animate-spin" : ""}
              >
                {isExporting ? 'Exporting...' : 'Export Report'}
              </Button>
              <Button
                variant="default"
                iconName="Settings"
                iconPosition="left"
                onClick={handlePlatformSettings}
              >
                Platform Settings
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center space-x-1 mb-8 bg-muted rounded-lg p-1">
            {tabs?.map((tab) => (
              <button
                key={tab?.id}
                onClick={() => setActiveTab(tab?.id)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-smooth
                  ${activeTab === tab?.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                  }
                `}
              >
                <Icon name={tab?.icon} size={16} />
                <span>{tab?.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8 w-full">
              {/* Summary Cards */}
              <RevenueSummaryCards summary={summary} />

              {/* Revenue Chart */}
              <RevenueChart monthlyData={monthlyData} />

              {/* Revenue Tracking Table */}
              <div className="w-full">
              <RevenueTrackingTable 
                bookings={bookings}
                onExport={handleExportData}
              />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="w-full">
              <RateChangeHistory bookings={bookings} />
            </div>
          )}
        </main>
      </div>
    </div>
    </ToastProvider>
  );
};

export default CommissionManagement;