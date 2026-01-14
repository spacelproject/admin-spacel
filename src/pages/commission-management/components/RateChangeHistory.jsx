import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import LoadingState from '../../../components/ui/LoadingState';

const RateChangeHistory = () => {
  const { user, isAdmin } = useAuth();
  const [filters, setFilters] = useState({
    dateRange: 'all',
    admin: '',
    changeType: 'all'
  });
  const [rateChanges, setRateChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch rate change history from platform_settings_history
  const fetchRateChangeHistory = useCallback(async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build query for commission-related rate changes
      let query = supabase
        .from('platform_settings_history')
        .select('*')
        .or('category.eq.commission,category.eq.payment,setting_key.ilike.%commission%,setting_key.ilike.%rate%')
        .order('created_at', { ascending: false })
        .limit(200);

      // Apply date range filter
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999); // End of today
        let startDate = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'month':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 1);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'quarter':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 3);
            startDate.setHours(0, 0, 0, 0);
            break;
          default:
            break;
        }
        
        query = query.gte('created_at', startDate.toISOString())
                   .lte('created_at', endDate.toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      // Fetch admin user profiles
      const userIds = [...new Set((data || []).map(entry => entry.changed_by).filter(Boolean))];
      let userProfilesMap = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        
        if (profilesData) {
          profilesData.forEach(profile => {
            userProfilesMap[profile.id] = profile;
          });
        }
      }

      // Transform data to match component format
      const transformedChanges = (data || []).map((entry) => {
        const user = userProfilesMap[entry.changed_by];
        const adminName = user 
          ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown'
          : entry.changed_by_name || 'Unknown Admin';
        const adminEmail = user?.email || entry.changed_by_email || 'N/A';

        // Parse old and new values
        let oldRate = null;
        let newRate = null;
        
        try {
          const oldValue = typeof entry.old_value === 'string' 
            ? JSON.parse(entry.old_value) 
            : entry.old_value;
          const newValue = typeof entry.new_value === 'string' 
            ? JSON.parse(entry.new_value) 
            : entry.new_value;

          // Extract rate values based on setting type
          if (typeof oldValue === 'number') {
            oldRate = oldValue;
          } else if (oldValue && typeof oldValue === 'object') {
            oldRate = oldValue.value || oldValue.rate || oldValue.percentage || null;
          }

          if (typeof newValue === 'number') {
            newRate = newValue;
          } else if (newValue && typeof newValue === 'object') {
            newRate = newValue.value || newValue.rate || newValue.percentage || null;
          }

          // If still null, try to parse as percentage strings
          if (oldRate === null && typeof oldValue === 'string' && oldValue.includes('%')) {
            oldRate = parseFloat(oldValue.replace('%', ''));
          }
          if (newRate === null && typeof newValue === 'string' && newValue.includes('%')) {
            newRate = parseFloat(newValue.replace('%', ''));
          }
        } catch (e) {
          // If parsing fails, try direct numeric conversion
          if (typeof entry.old_value === 'number') oldRate = entry.old_value;
          if (typeof entry.new_value === 'number') newRate = entry.new_value;
        }

        // Determine change type based on setting_key
        let changeType = 'default-rate';
        let category = null;
        
        if (entry.setting_key?.includes('seeker') || entry.setting_key?.includes('guest')) {
          changeType = 'category-rate';
          category = 'seeker';
        } else if (entry.setting_key?.includes('partner') || entry.setting_key?.includes('host')) {
          changeType = 'category-rate';
          category = 'partner';
        } else if (entry.setting_key?.includes('promotional') || entry.setting_key?.includes('promo')) {
          changeType = 'promotional-rate';
        } else if (entry.setting_key?.includes('bulk') || entry.setting_key?.includes('all')) {
          changeType = 'bulk-adjustment';
        }

        return {
          id: entry.id,
          timestamp: entry.created_at,
          admin: {
            name: adminName,
            email: adminEmail
          },
          changeType,
          category,
          oldRate: oldRate !== null ? (typeof oldRate === 'number' ? oldRate : parseFloat(oldRate)) : null,
          newRate: newRate !== null ? (typeof newRate === 'number' ? newRate : parseFloat(newRate)) : null,
          reason: entry.change_reason || `Changed ${entry.setting_key} in ${entry.category || 'settings'}`,
          settingKey: entry.setting_key,
          impactLevel: entry.impact_level || 'medium'
        };
      });

      setRateChanges(transformedChanges);
    } catch (err) {
      console.error('Error fetching rate change history:', err);
      setError(err.message);
      setRateChanges([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filters.dateRange]);

  useEffect(() => {
    fetchRateChangeHistory();

    // Set up real-time subscription for rate changes
    if (isAdmin) {
      const channel = supabase
        .channel('rate_change_history_updates')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'platform_settings_history',
            filter: 'category=eq.commission'
          }, 
          () => {
            console.log('Rate change detected, refreshing history...');
            fetchRateChangeHistory();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAdmin, fetchRateChangeHistory]);

  // Mock rate change history data (fallback)
  const mockRateChanges = [
    {
      id: 1,
      timestamp: '2025-01-15T10:30:00Z',
      admin: {
        name: 'John Smith',
        email: 'john.smith@spacel.com'
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
        email: 'sarah.johnson@spacel.com'
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
        email: 'michael.chen@spacel.com'
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
        email: 'emily.rodriguez@spacel.com'
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
        email: 'david.park@spacel.com'
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
      'seeker': 'Seeker Commission',
      'partner': 'Partner Commission',
      'all': 'All Categories'
    };
    return categoryLabels[category] || category;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const filteredChanges = useMemo(() => {
    return rateChanges.filter(change => {
      if (filters.admin && !change.admin.name.toLowerCase().includes(filters.admin.toLowerCase())) {
        return false;
      }
      if (filters.changeType !== 'all' && change.changeType !== filters.changeType) {
        return false;
      }
      return true;
    });
  }, [rateChanges, filters.admin, filters.changeType]);

  const handleExport = () => {
    // Export functionality with proper CSV escaping
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const csvRows = [
      ['Date', 'Admin', 'Change Type', 'Category', 'Old Rate', 'New Rate', 'Reason'].map(escapeCSV).join(','),
      ...filteredChanges.map(change => [
        change.timestamp ? new Date(change.timestamp).toLocaleString('en-US') : 'N/A',
        change.admin.name || 'Unknown',
        getChangeTypeLabel(change.changeType),
        change.category || 'N/A',
        change.oldRate !== null ? `${change.oldRate}%` : 'N/A',
        change.newRate !== null ? `${change.newRate}%` : 'N/A',
        change.reason || 'N/A'
      ].map(escapeCSV).join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rate-change-history-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <LoadingState message="Loading rate change history..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="text-center py-8">
          <Icon name="AlertCircle" size={32} className="text-destructive mx-auto mb-2" />
          <p className="text-muted-foreground">Error loading rate change history: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-card-foreground">Rate Change History</h2>
        <Button
          variant="outline"
          iconName="Download"
          iconPosition="left"
          onClick={handleExport}
          disabled={filteredChanges.length === 0}
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