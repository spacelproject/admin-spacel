import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const ChangeHistoryPanel = ({ isOpen, onClose }) => {
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // Mock change history data
  const changeHistory = [
    {
      id: 1,
      setting: "Platform Fee Percentage",
      category: "Payment Configuration",
      oldValue: "4.5%",
      newValue: "5.0%",
      changedBy: {
        name: "Sarah Johnson",
        email: "sarah.johnson@spacio.com",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b9c5e8b1?w=150"
      },
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      impact: "high",
      reason: "Adjusted to match market standards and improve revenue"
    },
    {
      id: 2,
      setting: "Session Timeout",
      category: "Security Policies",
      oldValue: "60 minutes",
      newValue: "30 minutes",
      changedBy: {
        name: "Michael Chen",
        email: "michael.chen@spacio.com",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
      },
      timestamp: new Date(Date.now() - 7200000), // 2 hours ago
      impact: "medium",
      reason: "Enhanced security measure to reduce session hijacking risks"
    },
    {
      id: 3,
      setting: "Email Notifications",
      category: "Notification Settings",
      oldValue: "Disabled",
      newValue: "Enabled",
      changedBy: {
        name: "Emily Rodriguez",
        email: "emily.rodriguez@spacio.com",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"
      },
      timestamp: new Date(Date.now() - 86400000), // 1 day ago
      impact: "low",
      reason: "Re-enabled after resolving email delivery issues"
    },
    {
      id: 4,
      setting: "Maintenance Mode",
      category: "General Settings",
      oldValue: "Enabled",
      newValue: "Disabled",
      changedBy: {
        name: "David Kim",
        email: "david.kim@spacio.com",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
      },
      timestamp: new Date(Date.now() - 172800000), // 2 days ago
      impact: "critical",
      reason: "Completed system maintenance and restored normal operations"
    },
    {
      id: 5,
      setting: "Two-Factor Authentication",
      category: "Security Policies",
      oldValue: "Optional",
      newValue: "Required for Admins",
      changedBy: {
        name: "Sarah Johnson",
        email: "sarah.johnson@spacio.com",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b9c5e8b1?w=150"
      },
      timestamp: new Date(Date.now() - 259200000), // 3 days ago
      impact: "high",
      reason: "Strengthened admin account security following security audit"
    }
  ];

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

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const handleRollback = (changeId) => {
    console.log('Rolling back change:', changeId);
  };

  const handleExportHistory = () => {
    console.log('Exporting change history...');
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
            >
              Export History
            </Button>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {changeHistory.map((change) => (
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
                        <p className="text-sm font-mono bg-destructive/10 text-destructive px-2 py-1 rounded">
                          {change.oldValue}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">New Value</p>
                        <p className="text-sm font-mono bg-success/10 text-success px-2 py-1 rounded">
                          {change.newValue}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center space-x-2">
                        <Image
                          src={change.changedBy.avatar}
                          alt={change.changedBy.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                        <span>{change.changedBy.name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Icon name="Clock" size={14} />
                        <span>{formatTimestamp(change.timestamp)}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground italic">
                      "{change.reason}"
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRollback(change.id)}
                      iconName="RotateCcw"
                      iconPosition="left"
                    >
                      Rollback
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {changeHistory.length} recent changes
            </p>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                Load More
              </Button>
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