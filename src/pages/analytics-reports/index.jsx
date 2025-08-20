import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import MetricsOverview from './components/MetricsOverview';
import DateRangeSelector from './components/DateRangeSelector';
import FilterControls from './components/FilterControls';
import ChartWidget from './components/ChartWidget';
import ReportGenerator from './components/ReportGenerator';
import PerformanceIndicators from './components/PerformanceIndicators';
import DataExportPanel from './components/DataExportPanel';
import Button from '../../components/ui/Button';


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

  // Mock data for metrics overview
  const metricsData = [
    {
      id: 1,
      type: 'users',
      label: 'Total Users',
      value: '12,847',
      change: 8.2,
      period: 'vs last month'
    },
    {
      id: 2,
      type: 'bookings',
      label: 'Total Bookings',
      value: '3,429',
      change: 12.5,
      period: 'vs last month'
    },
    {
      id: 3,
      type: 'revenue',
      label: 'Total Revenue',
      value: '$284,592',
      change: -2.1,
      period: 'vs last month'
    },
    {
      id: 4,
      type: 'spaces',
      label: 'Active Spaces',
      value: '1,847',
      change: 5.7,
      period: 'vs last month'
    }
  ];

  // Mock data for performance indicators
  const performanceIndicators = [
    {
      id: 1,
      name: 'Conversion Rate',
      value: '3.2%',
      unit: '',
      target: '4.0%',
      progress: 80,
      status: 'good',
      change: 0.3
    },
    {
      id: 2,
      name: 'Avg Booking Value',
      value: '$127',
      unit: 'USD',
      target: '$150',
      progress: 85,
      status: 'good',
      change: 5.2
    },
    {
      id: 3,
      name: 'User Retention',
      value: '68%',
      unit: '',
      target: '75%',
      progress: 91,
      status: 'excellent',
      change: 2.1
    },
    {
      id: 4,
      name: 'Space Utilization',
      value: '74%',
      unit: '',
      target: '80%',
      progress: 93,
      status: 'excellent',
      change: 1.8
    },
    {
      id: 5,
      name: 'Customer Satisfaction',
      value: '4.3',
      unit: '/5.0',
      target: '4.5',
      progress: 86,
      status: 'good',
      change: 0.1
    },
    {
      id: 6,
      name: 'Response Time',
      value: '2.4h',
      unit: 'avg',
      target: '2.0h',
      progress: 60,
      status: 'average',
      change: -0.2
    }
  ];

  // Mock chart data
  const chartData = {
    userGrowth: [
      { name: 'Jan', value: 8400 },
      { name: 'Feb', value: 9200 },
      { name: 'Mar', value: 10100 },
      { name: 'Apr', value: 11300 },
      { name: 'May', value: 12100 },
      { name: 'Jun', value: 12847 }
    ],
    bookingTrends: [
      { name: 'Mon', value: 420 },
      { name: 'Tue', value: 380 },
      { name: 'Wed', value: 510 },
      { name: 'Thu', value: 490 },
      { name: 'Fri', value: 620 },
      { name: 'Sat', value: 580 },
      { name: 'Sun', value: 340 }
    ],
    revenueAnalytics: [
      { name: 'Office Spaces', value: 45 },
      { name: 'Meeting Rooms', value: 30 },
      { name: 'Coworking', value: 15 },
      { name: 'Event Venues', value: 10 }
    ],
    spacePerformance: [
      { name: 'Q1', value: 65 },
      { name: 'Q2', value: 72 },
      { name: 'Q3', value: 68 },
      { name: 'Q4', value: 74 }
    ]
  };

  useEffect(() => {
    // Initialize default widgets
    setWidgets([
      {
        id: 1,
        title: 'User Growth Trends',
        type: 'line',
        data: chartData.userGrowth
      },
      {
        id: 2,
        title: 'Weekly Booking Trends',
        type: 'bar',
        data: chartData.bookingTrends
      },
      {
        id: 3,
        title: 'Revenue by Category',
        type: 'pie',
        data: chartData.revenueAnalytics
      },
      {
        id: 4,
        title: 'Space Utilization',
        type: 'bar',
        data: chartData.spacePerformance
      }
    ]);
  }, []);

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

  const handleRemoveWidget = (widgetId) => {
    setWidgets(prev => prev.filter(widget => widget.id !== widgetId));
  };

  const handleDrillDown = (widgetId) => {
    console.log('Drill down for widget:', widgetId);
    // Implement drill-down functionality
  };

  const handleAddWidget = () => {
    const newWidget = {
      id: Date.now(),
      title: 'New Chart Widget',
      type: 'line',
      data: chartData.userGrowth
    };
    setWidgets(prev => [...prev, newWidget]);
  };

  const handleGenerateReport = (reportConfig) => {
    console.log('Generating report with config:', reportConfig);
    // Implement report generation logic
  };

  const handleExportData = (exportConfig) => {
    console.log('Exporting data with config:', exportConfig);
    // Implement data export logic
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
          </div>
          <UserProfileDropdown />
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

          {/* Metrics Overview */}
          <MetricsOverview metrics={metricsData} />

          {/* Filter Controls */}
          <FilterControls
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
          />

          {/* Performance Indicators */}
          <PerformanceIndicators indicators={performanceIndicators} />

          {/* Chart Widgets */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Dashboard Widgets</h2>
              <Button
                variant="outline"
                onClick={handleAddWidget}
                iconName="Plus"
                iconPosition="left"
              >
                Add Widget
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {widgets.map((widget) => (
                <ChartWidget
                  key={widget.id}
                  title={widget.title}
                  type={widget.type}
                  data={widget.data}
                  onRemove={() => handleRemoveWidget(widget.id)}
                  onDrillDown={() => handleDrillDown(widget.id)}
                />
              ))}
            </div>
          </div>

          {/* Report Generator */}
          <ReportGenerator onGenerateReport={handleGenerateReport} />

          {/* Data Export Panel */}
          <DataExportPanel onExport={handleExportData} />
        </main>
      </div>
    </div>
  );
};

export default AnalyticsReports;