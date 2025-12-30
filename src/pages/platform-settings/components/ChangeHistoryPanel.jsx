import React, { useState, useMemo } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import useSettingsHistory from '../../../hooks/useSettingsHistory';

const ChangeHistoryPanel = ({ isOpen, onClose }) => {
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const filters = useMemo(() => ({
    category: filterBy === 'all' ? undefined : filterBy
  }), [filterBy]);

  const { history, loading, error, refetch } = useSettingsHistory(filters);

  const filterOptions = [
    { value: 'all', label: 'All Changes' },
    { value: 'general', label: 'General Settings' },
    { value: 'payment', label: 'Payment Configuration' },
    { value: 'notifications', label: 'Notification Settings' },
    { value: 'security', label: 'Security Policies' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'impact', label: 'By Impact Level' }
  ];

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'critical': return 'text-destructive bg-destructive/10';
      case 'high': return 'text-warning bg-warning/10';
      case 'medium': return 'text-accent bg-accent/10';
      case 'low': return 'text-success bg-success/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getImpactIcon = (impact) => {
    switch (impact) {
      case 'critical': return 'AlertTriangle';
      case 'high': return 'AlertCircle';
      case 'medium': return 'Info';
      case 'low': return 'CheckCircle';
      default: return 'Circle';
    }
  };

  const formatValue = (value, settingType) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (settingType === 'boolean') {
      return value ? 'Enabled' : 'Disabled';
    }
    
    if (settingType === 'number') {
      return value.toString();
    }
    
    if (settingType === 'json') {
      return JSON.stringify(value);
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    return String(value);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const date = new Date(timestamp);
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      }
      return 'Just now';
    }
  };

  const sortedHistory = useMemo(() => {
    if (!history || history.length === 0) return [];

    const sorted = [...history];

    switch (sortBy) {
      case 'oldest':
        return sorted.sort((a, b) => a.timestamp - b.timestamp);
      case 'impact':
        const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return sorted.sort((a, b) => {
          const aImpact = impactOrder[a.impact] || 0;
          const bImpact = impactOrder[b.impact] || 0;
          if (aImpact !== bImpact) {
            return bImpact - aImpact;
          }
          return b.timestamp - a.timestamp;
        });
      case 'newest':
      default:
        return sorted.sort((a, b) => b.timestamp - a.timestamp);
    }
  }, [history, sortBy]);

  const handleExportHistory = async () => {
    try {
      const { exportData, exportToPDF } = await import('../../../utils/exportUtils');
      
      // Prepare history data for export
      const exportDataArray = sortedHistory.map(change => ({
        'Setting': change.setting || 'N/A',
        'Category': change.category || 'N/A',
        'Old Value': formatValue(change.oldValue, change.settingType),
        'New Value': formatValue(change.newValue, change.settingType),
        'Changed By': change.changedBy?.name || 'N/A',
        'Changed By Email': change.changedBy?.email || 'N/A',
        'Impact': change.impact || 'N/A',
        'Reason': change.reason || 'N/A',
        'Timestamp': change.timestamp ? new Date(change.timestamp).toLocaleString() : 'N/A'
      }));
      
      const fileName = `settings-history-${new Date().toISOString().split('T')[0]}`;
      await exportData(exportDataArray, fileName, 'csv');
    } catch (error) {
      console.error('Error exporting history:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-modal flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <Icon name="History" size={24} className="text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-card-foreground">Change History</h2>
              <p className="text-sm text-muted-foreground">Track all platform setting modifications</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-smooth"
          >
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Select
                label=""
                options={filterOptions}
                value={filterBy}
                onChange={setFilterBy}
                className="w-48"
              />
              
              <Select
                label=""
                options={sortOptions}
                value={sortBy}
                onChange={setSortBy}
                className="w-48"
              />
            </div>
            
            <Button
              variant="outline"
              onClick={handleExportHistory}
              iconName="Download"
              iconPosition="left"
              disabled={!sortedHistory || sortedHistory.length === 0}
            >
              Export History
            </Button>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <LoadingState message="Loading change history..." />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : sortedHistory.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="History" size={48} className="text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No change history found</p>
            </div>
          ) : (
          <div className="space-y-4">
              {sortedHistory.map((change) => (
              <div key={change.id} className="bg-muted/30 rounded-lg border border-border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-card-foreground">{change.setting}</h3>
                      <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                        {change.category}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full flex items-center space-x-1 ${getImpactColor(change.impact)}`}>
                        <Icon name={getImpactIcon(change.impact)} size={12} />
                        <span className="capitalize">{change.impact}</span>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Previous Value</p>
                          <p className="text-sm font-mono bg-destructive/10 text-destructive px-2 py-1 rounded break-all">
                            {formatValue(change.oldValue, change.settingType)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">New Value</p>
                          <p className="text-sm font-mono bg-success/10 text-success px-2 py-1 rounded break-all">
                            {formatValue(change.newValue, change.settingType)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                            {change.changedBy.name.charAt(0).toUpperCase()}
                          </div>
                        <span>{change.changedBy.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Icon name="Clock" size={14} />
                        <span>{formatTimestamp(change.timestamp)}</span>
                      </div>
                    </div>
                    
                      {change.reason && (
                    <p className="text-sm text-muted-foreground italic">
                      "{change.reason}"
                    </p>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {sortedHistory.length} {sortedHistory.length === 1 ? 'change' : 'changes'}
            </p>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeHistoryPanel;
