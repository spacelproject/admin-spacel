import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const DateRangeSelector = ({ selectedRange, onRangeChange, customDateRange, onCustomDateChange }) => {
  const [showCustomSelector, setShowCustomSelector] = useState(false);
  const [tempDateRange, setTempDateRange] = useState(customDateRange);

  const predefinedRanges = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '6m', label: 'Last 6 months' },
    { value: '1y', label: 'Last year' },
    { value: 'ytd', label: 'Year to date' },
    { value: 'custom', label: 'Custom range' }
  ];

  const quickRanges = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'thisWeek' },
    { label: 'Last Week', value: 'lastWeek' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' }
  ];

  const handleQuickRangeSelect = (rangeType) => {
    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    let from, to;
    
    switch (rangeType) {
      case 'today':
        from = to = formatDate(today);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        from = to = formatDate(yesterday);
        break;
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        from = formatDate(startOfWeek);
        to = formatDate(today);
        break;
      case 'lastWeek':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        from = formatDate(lastWeekStart);
        to = formatDate(lastWeekEnd);
        break;
      case 'thisMonth':
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        from = formatDate(thisMonthStart);
        to = formatDate(today);
        break;
      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        from = formatDate(lastMonthStart);
        to = formatDate(lastMonthEnd);
        break;
      default:
        return;
    }
    
    const newRange = { from, to };
    setTempDateRange(newRange);
    onCustomDateChange('from', from);
    onCustomDateChange('to', to);
  };

  const handleApplyCustomRange = () => {
    if (tempDateRange.from && tempDateRange.to) {
      onRangeChange('custom');
      setShowCustomSelector(false);
    }
  };

  const handleCancelCustomRange = () => {
    setTempDateRange(customDateRange);
    setShowCustomSelector(false);
  };

  const handleTempDateChange = (field, value) => {
    setTempDateRange(prev => ({ ...prev, [field]: value }));
  };

  const isValidDateRange = tempDateRange.from && tempDateRange.to && tempDateRange.from <= tempDateRange.to;

  return (
    <div className="bg-card rounded-lg border border-border p-6 mb-6">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <Select
              label="Date Range"
              options={predefinedRanges}
              value={selectedRange}
              onChange={onRangeChange}
              className="w-48"
            />
            
            {selectedRange !== 'custom' && (
              <Button
                variant="outline"
                size="sm"
                iconName="Calendar"
                iconPosition="left"
                onClick={() => setShowCustomSelector(true)}
              >
                Custom Range
              </Button>
            )}
          </div>

          {selectedRange === 'custom' && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Icon name="Calendar" size={16} />
              <span>
                {customDateRange.from} to {customDateRange.to}
              </span>
            </div>
          )}
        </div>

        {/* Custom Date Selector Modal */}
        {showCustomSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal">
            <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-card-foreground">Select Custom Date Range</h3>
                <Button variant="ghost" size="sm" iconName="X" onClick={handleCancelCustomRange} />
              </div>

              {/* Quick Range Buttons */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-card-foreground mb-3">Quick Select</h4>
                <div className="grid grid-cols-2 gap-2">
                  {quickRanges.map((range) => (
                    <Button
                      key={range.value}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickRangeSelect(range.value)}
                      className="text-xs"
                    >
                      {range.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date Inputs */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={tempDateRange.from || ''}
                    onChange={(e) => handleTempDateChange('from', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    max={tempDateRange.to || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={tempDateRange.to || ''}
                    onChange={(e) => handleTempDateChange('to', e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    min={tempDateRange.from || ''}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={handleApplyCustomRange}
                  disabled={!isValidDateRange}
                  className="flex-1"
                >
                  Apply Range
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelCustomRange}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Regular Custom Date Inputs (when custom is selected from dropdown) */}
        {selectedRange === 'custom' && !showCustomSelector && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t border-border">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                From
              </label>
              <input
                type="date"
                value={customDateRange.from}
                onChange={(e) => onCustomDateChange('from', e.target.value)}
                className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                max={customDateRange.to || new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                To
              </label>
              <input
                type="date"
                value={customDateRange.to}
                onChange={(e) => onCustomDateChange('to', e.target.value)}
                className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                min={customDateRange.from || ''}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="pt-6">
              <Button
                variant="outline"
                size="sm"
                iconName="RotateCcw"
                iconPosition="left"
                onClick={() => setShowCustomSelector(true)}
              >
                Quick Select
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DateRangeSelector;