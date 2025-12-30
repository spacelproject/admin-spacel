import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import NotificationBell from '../../components/NotificationBell';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import MetricsOverview from './components/MetricsOverview';
import DateRangeSelector from './components/DateRangeSelector';
import FilterControls from './components/FilterControls';
import ChartWidget from './components/ChartWidget';
import ReportGenerator from './components/ReportGenerator';
import PerformanceIndicators from './components/PerformanceIndicators';
import DataExportPanel from './components/DataExportPanel';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';
import { useAnalyticsData } from '../../hooks/useAnalyticsData';
import { useDataExport } from '../../hooks/useDataExport';


const AnalyticsReports = () => {
  const [selectedRange, setSelectedRange] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState({
    from: '2025-06-17',
    to: '2025-07-17'
  });
  const [filters, setFilters] = useState({
    userType: 'all',
    spaceCategory: 'all',
    location: 'all',
    bookingStatus: 'all'
  });
  const [widgets, setWidgets] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Use real-time analytics data
  const { data: analyticsData, refetch } = useAnalyticsData(selectedRange, filters, customDateRange);
  const { exportData: exportDataHook } = useDataExport();

  // Real-time updates are handled by Supabase subscriptions
  // Removed auto-refresh interval to prevent unwanted reloads

  useEffect(() => {
    document.title = 'Analytics & Reports - SPACEL Admin';
  }, []);

  useEffect(() => {
    // Initialize default widgets with real-time data
    if (analyticsData.chartData && Object.keys(analyticsData.chartData).length > 0) {
      setWidgets([
        {
          id: 1,
          title: 'User Growth Trends',
          type: 'line',
          data: analyticsData.chartData.userGrowth || []
        },
        {
          id: 2,
          title: 'Weekly Booking Trends',
          type: 'bar',
          data: analyticsData.chartData.bookingTrends || []
        },
        {
          id: 3,
          title: 'Revenue by Category',
          type: 'pie',
          data: analyticsData.chartData.revenueByCategory || []
        },
        {
          id: 4,
          title: 'Space Performance',
          type: 'line',
          data: analyticsData.chartData.spacePerformance || []
        }
      ]);
    }
  }, [analyticsData.chartData]);

  const handleCustomDateChange = (field, value) => {
    setCustomDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      userType: 'all',
      spaceCategory: 'all',
      location: 'all',
      bookingStatus: 'all'
    });
  };



  const handleGenerateReport = async (reportConfig) => {
    try {
      // Map template to columns based on template type
      const templateColumnMap = {
        'financial': ['revenue-data', 'analytics-data', 'performance-metrics'],
        'user-activity': ['user-data', 'analytics-data'],
        'space-performance': ['space-data', 'booking-data', 'performance-metrics'],
        'booking-trends': ['booking-data', 'analytics-data', 'performance-metrics'],
        'custom': reportConfig.metrics?.length > 0 
          ? reportConfig.metrics.map(metric => {
              // Map metric IDs to column names
              const metricMap = {
                'user-growth': 'user-data',
                'booking-volume': 'booking-data',
                'revenue-trends': 'revenue-data',
                'space-utilization': 'space-data',
                'conversion-rates': 'performance-metrics',
                'customer-satisfaction': 'performance-metrics'
              };
              return metricMap[metric] || 'analytics-data';
            })
          : ['analytics-data', 'performance-metrics']
      };

      const columns = templateColumnMap[reportConfig.template] || ['analytics-data', 'performance-metrics'];
      
      // Prepare export config based on report template
      const exportConfig = {
        format: reportConfig.format || 'pdf',
        columns: [...new Set(columns)], // Remove duplicates
        dateRange: selectedRange,
        customDateRange: selectedRange === 'custom' ? customDateRange : null
      };
      
      const result = await exportDataHook(exportConfig);
      
      if (result?.success) {
        console.log('✅ Report generated successfully:', result.message);
        // Could add toast notification here
      } else {
        console.warn('⚠️ Report generation completed with warnings');
      }
    } catch (error) {
      console.error('❌ Error generating report:', error);
      // Could add error toast notification here
    }
  };

  const handleExportData = async (exportConfig) => {
    try {
      await exportDataHook(exportConfig);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="transition-all duration-300 ease-smooth lg:ml-sidebar-collapsed xl:ml-sidebar">
        {/* Header */}
        <header className="h-header bg-header-background border-b border-header-border px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-header-foreground">
              Analytics & Reports
            </h1>
            {!analyticsData.loading && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Icon name="RefreshCw" size={14} />
                <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {!analyticsData.loading && (
              <div className="flex items-center space-x-2 text-xs text-success">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span>Live data</span>
              </div>
            )}
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <UserProfileDropdown />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6">
          <BreadcrumbNavigation />

          {/* Date Range Selector */}
          <DateRangeSelector
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
            customDateRange={customDateRange}
            onCustomDateChange={handleCustomDateChange}
          />

          {/* Loading State */}
          {analyticsData.loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-card border border-border rounded-lg p-6 card-shadow">
                    <div className="animate-pulse">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-muted rounded-lg" />
                        <div className="w-16 h-4 bg-muted rounded" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-8 bg-muted rounded w-20" />
                        <div className="h-4 bg-muted rounded w-24" />
                        <div className="h-3 bg-muted rounded w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="animate-pulse">
                  <div className="h-6 bg-muted rounded w-48 mb-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="border border-border rounded-lg p-4">
                        <div className="space-y-3">
                          <div className="h-4 bg-muted rounded w-24" />
                          <div className="h-6 bg-muted rounded w-16" />
                          <div className="h-2 bg-muted rounded w-full" />
                          <div className="h-3 bg-muted rounded w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : analyticsData.error ? (
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <Icon name="AlertCircle" size={24} className="text-error mx-auto mb-2" />
              <p className="text-error mb-2">Failed to load analytics data</p>
              <p className="text-sm text-muted-foreground mb-4">{analyticsData.error}</p>
              <Button onClick={refetch} variant="outline">
                Retry
              </Button>
            </div>
          ) : (
            <>
              {/* Metrics Overview */}
              <MetricsOverview metrics={analyticsData.metrics} />

              {/* Filter Controls */}
              <FilterControls
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />

              {/* Performance Indicators */}
              <PerformanceIndicators indicators={analyticsData.performanceIndicators} />
            </>
          )}

          {/* Chart Widgets - Only show when data is loaded */}
          {!analyticsData.loading && !analyticsData.error && (
            <div className="mb-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">Dashboard Widgets</h2>
              </div>
              
              <div className="space-y-6">
                {/* First Row: User Growth Trends and Space Performance */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {widgets
                    .filter(widget => widget.id === 1 || widget.id === 4)
                    .sort((a, b) => a.id - b.id) // Sort to ensure User Growth (1) comes before Space Performance (4)
                    .map((widget) => (
                      <ChartWidget
                        key={widget.id}
                        title={widget.title}
                        type={widget.type}
                        data={widget.data}
                      />
                    ))}
                </div>
                
                {/* Second Row: Weekly Booking Trends and Revenue by Category */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {widgets
                    .filter(widget => widget.id === 2 || widget.id === 3)
                    .sort((a, b) => a.id - b.id) // Sort to ensure Weekly Booking (2) comes before Revenue (3)
                    .map((widget) => (
                      <ChartWidget
                        key={widget.id}
                        title={widget.title}
                        type={widget.type}
                        data={widget.data}
                      />
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Report Generator */}
          <ReportGenerator 
            onGenerateReport={handleGenerateReport}
            selectedDateRange={selectedRange}
            customDateRange={customDateRange}
          />

          {/* Data Export Panel */}
          <DataExportPanel 
            onExport={handleExportData} 
            selectedDateRange={selectedRange}
            customDateRange={customDateRange}
          />
        </main>
      </div>
    </div>
  );
};

export default AnalyticsReports;