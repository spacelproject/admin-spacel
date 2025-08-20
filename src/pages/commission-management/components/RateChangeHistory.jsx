import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';

const RateChangeHistory = () => {
  const [filters, setFilters] = useState({
    dateRange: 'all',
    admin: '',
    changeType: 'all'
  });

  // Mock rate change history data
  const rateChanges = [
    {
      id: 1,
      timestamp: '2025-01-15T10:30:00Z',
      admin: {
        name: 'John Smith',
        email: 'john.smith@spacio.com'
      },
      changeType: 'category-rate',
      category: 'event-space',
      oldRate: 18,
      newRate: 20,
      reason: 'Increased demand for event spaces during peak season'
    },
    {
      id: 2,
      timestamp: '2025-01-12T14:15:00Z',
      admin: {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@spacio.com'
      },
      changeType: 'default-rate',
      category: null,
      oldRate: 12,
      newRate: 15,
      reason: 'Platform-wide rate adjustment to improve revenue'
    },
    {
      id: 3,
      timestamp: '2025-01-10T09:45:00Z',
      admin: {
        name: 'Michael Chen',
        email: 'michael.chen@spacio.com'
      },
      changeType: 'promotional-rate',
      category: 'coworking',
      oldRate: 18,
      newRate: 12,
      reason: 'New Year promotional campaign for coworking spaces'
    },
    {
      id: 4,
      timestamp: '2025-01-08T16:20:00Z',
      admin: {
        name: 'Emily Rodriguez',
        email: 'emily.rodriguez@spacio.com'
      },
      changeType: 'category-rate',
      category: 'office-space',
      oldRate: 15,
      newRate: 12,
      reason: 'Competitive adjustment for office space category'
    },
    {
      id: 5,
      timestamp: '2025-01-05T11:10:00Z',
      admin: {
        name: 'David Park',
        email: 'david.park@spacio.com'
      },
      changeType: 'bulk-adjustment',
      category: 'all',
      oldRate: null,
      newRate: null,
      reason: 'Bulk rate increase of 2% across all categories'
    }
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'This Quarter' }
  ];

  const changeTypeOptions = [
    { value: 'all', label: 'All Changes' },
    { value: 'default-rate', label: 'Default Rate' },
    { value: 'category-rate', label: 'Category Rate' },
    { value: 'promotional-rate', label: 'Promotional Rate' },
    { value: 'bulk-adjustment', label: 'Bulk Adjustment' }
  ];

  const getChangeTypeLabel = (type) => {
    const option = changeTypeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  };

  const getChangeTypeIcon = (type) => {
    switch (type) {
      case 'default-rate':
        return 'Settings';
      case 'category-rate':
        return 'Tag';
      case 'promotional-rate':
        return 'Percent';
      case 'bulk-adjustment':
        return 'Layers';
      default:
        return 'Edit';
    }
  };

  const getCategoryLabel = (category) => {
    const categoryLabels = {
      'office-space': 'Office Space',
      'meeting-room': 'Meeting Room',
      'coworking': 'Coworking Space',
      'event-space': 'Event Space',
      'storage': 'Storage Space',
      'all': 'All Categories'
    };
    return categoryLabels[category] || category;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredChanges = rateChanges.filter(change => {
    if (filters.admin && !change.admin.name.toLowerCase().includes(filters.admin.toLowerCase())) {
      return false;
    }
    if (filters.changeType !== 'all' && change.changeType !== filters.changeType) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-card-foreground">Rate Change History</h2>
        <Button
          variant="outline"
          iconName="Download"
          iconPosition="left"
        >
          Export History
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Select
          label="Date Range"
          options={dateRangeOptions}
          value={filters.dateRange}
          onChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
        />

        <Input
          label="Admin Name"
          placeholder="Search by admin..."
          value={filters.admin}
          onChange={(e) => setFilters(prev => ({ ...prev, admin: e.target.value }))}
        />

        <Select
          label="Change Type"
          options={changeTypeOptions}
          value={filters.changeType}
          onChange={(value) => setFilters(prev => ({ ...prev, changeType: value }))}
        />
      </div>

      {/* History List */}
      <div className="space-y-4">
        {filteredChanges.length === 0 ? (
          <div className="text-center py-8">
            <Icon name="Clock" size={32} className="text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No rate changes found</p>
          </div>
        ) : (
          filteredChanges.map((change) => (
            <div key={change.id} className="bg-muted rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Icon 
                      name={getChangeTypeIcon(change.changeType)} 
                      size={16} 
                      className="text-primary"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-card-foreground">
                        {getChangeTypeLabel(change.changeType)}
                      </span>
                      {change.category && (
                        <span className="px-2 py-1 bg-accent/10 text-accent text-xs rounded-full">
                          {getCategoryLabel(change.category)}
                        </span>
                      )}
                    </div>
                    
                    {change.oldRate !== null && change.newRate !== null && (
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-sm text-muted-foreground">{change.oldRate}%</span>
                        <Icon name="ArrowRight" size={14} className="text-muted-foreground" />
                        <span className="text-sm font-medium text-primary">{change.newRate}%</span>
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground mb-2">{change.reason}</p>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>By {change.admin.name}</span>
                      <span>•</span>
                      <span>{formatTimestamp(change.timestamp)}</span>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  iconName="MoreHorizontal"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredChanges.length > 0 && (
        <div className="text-center mt-6">
          <Button variant="outline">
            Load More History
          </Button>
        </div>
      )}
    </div>
  );
};

export default RateChangeHistory;