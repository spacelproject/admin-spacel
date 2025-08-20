import React, { useState } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import CommissionRateSettings from './components/CommissionRateSettings';
import RevenueTrackingTable from './components/RevenueTrackingTable';
import RevenueSummaryCards from './components/RevenueSummaryCards';
import RateChangeHistory from './components/RateChangeHistory';
import RevenueChart from './components/RevenueChart';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';

const CommissionManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);

  const handleRateChange = (changeData) => {
    console.log('Rate change:', changeData);
    // Handle rate change logic here
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Simulate export process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create mock CSV data
      const csvData = [
        ['Booking ID', 'Host', 'Space', 'Booking Amount', 'Commission Rate', 'Platform Fee', 'Host Payout', 'Date'],
        ['BK-2025-001', 'Sarah Johnson', 'Modern Conference Room', '$450.00', '15%', '$67.50', '$382.50', '2025-01-15'],
        ['BK-2025-002', 'Michael Chen', 'Creative Coworking Space', '$280.00', '18%', '$50.40', '$229.60', '2025-01-14']
      ];
      
      const csvContent = csvData?.map(row => row?.join(','))?.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL?.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-report-${new Date()?.toISOString()?.split('T')?.[0]}.csv`;
      document.body?.appendChild(a);
      a?.click();
      document.body?.removeChild(a);
      window.URL?.revokeObjectURL(url);
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

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <div className="lg:ml-sidebar">
        {/* Header */}
        <header className="h-header bg-header-background border-b border-header-border px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-header-foreground">Commission Management</h1>
          </div>
          <UserProfileDropdown />
        </header>

        {/* Main Content */}
        <main className="p-6">
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
            <div className="space-y-8">
              {/* Summary Cards */}
              <RevenueSummaryCards />

              {/* Revenue Chart */}
              <RevenueChart />

              {/* Desktop Layout: Two Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Commission Settings (4 columns) */}
                <div className="lg:col-span-4">
                  <CommissionRateSettings onRateChange={handleRateChange} />
                </div>

                {/* Right Panel: Revenue Table (8 columns) */}
                <div className="lg:col-span-8">
                  <RevenueTrackingTable onExport={handleExportData} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="max-w-6xl">
              <RateChangeHistory />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CommissionManagement;