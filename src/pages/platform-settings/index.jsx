import React, { useState } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

// Import tab components
import GeneralSettingsTab from './components/GeneralSettingsTab';
import PaymentConfigTab from './components/PaymentConfigTab';
import NotificationSettingsTab from './components/NotificationSettingsTab';
import SecurityPoliciesTab from './components/SecurityPoliciesTab';
import SettingsSearch from './components/SettingsSearch';
import ChangeHistoryPanel from './components/ChangeHistoryPanel';

const PlatformSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const tabs = [
    {
      id: 'general',
      label: 'General',
      icon: 'Settings',
      component: GeneralSettingsTab
    },
    {
      id: 'payment',
      label: 'Payment',
      icon: 'CreditCard',
      component: PaymentConfigTab
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: 'Bell',
      component: NotificationSettingsTab
    },
    {
      id: 'security',
      label: 'Security',
      icon: 'Shield',
      component: SecurityPoliciesTab
    }
  ];

  const handleTabChange = (tabId) => {
    if (hasUnsavedChanges) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave this tab?');
      if (!confirmLeave) return;
    }
    setActiveTab(tabId);
    setHasUnsavedChanges(false);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleExportConfig = () => {
    console.log('Exporting configuration...');
  };

  const handleImportConfig = () => {
    console.log('Importing configuration...');
  };

  const handleBackup = () => {
    console.log('Creating backup...');
  };

  const ActiveTabComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="lg:ml-sidebar">
        {/* Header */}
        <header className="h-header bg-header-background border-b border-header-border px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="lg:hidden">
              <button className="p-2 hover:bg-muted rounded-md">
                <Icon name="Menu" size={20} />
              </button>
            </div>
            
            <div className="min-w-0 flex-1 lg:flex-none">
              <h1 className="text-xl font-semibold text-header-foreground truncate">Platform Settings</h1>
              <p className="text-sm text-muted-foreground hidden lg:block">Configure system parameters and policies</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="hidden md:block w-60 lg:w-80">
              <SettingsSearch onSearch={handleSearch} onClear={handleClearSearch} />
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
                iconName="History"
                iconPosition="left"
                className="hidden sm:flex"
              >
                History
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(true)}
                iconName="History"
                className="sm:hidden"
              />
              
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  iconName="MoreVertical"
                />
                {/* Dropdown menu would go here */}
              </div>
            </div>
            
            <UserProfileDropdown />
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 lg:p-6 space-y-6">
          <div className="max-w-7xl mx-auto">
            <BreadcrumbNavigation />
            
            {/* Mobile Search */}
            <div className="md:hidden">
              <div className="bg-card rounded-lg border border-border p-4 card-shadow">
                <SettingsSearch onSearch={handleSearch} onClear={handleClearSearch} />
              </div>
            </div>

            {/* Action Bar */}
            <div className="bg-card rounded-lg border border-border p-4 lg:p-6 card-shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Icon name="Clock" size={16} />
                    <span>Last backup: July 16, 2025 at 11:30 PM</span>
                  </div>
                  
                  {hasUnsavedChanges && (
                    <div className="flex items-center space-x-2 text-sm text-warning">
                      <Icon name="AlertCircle" size={16} />
                      <span>You have unsaved changes</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackup}
                    iconName="Database"
                    iconPosition="left"
                    className="hidden sm:flex"
                  >
                    Backup
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImportConfig}
                    iconName="Upload"
                    iconPosition="left"
                    className="hidden sm:flex"
                  >
                    Import
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportConfig}
                    iconName="Download"
                    iconPosition="left"
                    className="hidden sm:flex"
                  >
                    Export
                  </Button>
                  
                  {/* Mobile action buttons */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBackup}
                    iconName="Database"
                    className="sm:hidden"
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleImportConfig}
                    iconName="Upload"
                    className="sm:hidden"
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportConfig}
                    iconName="Download"
                    className="sm:hidden"
                  />
                </div>
              </div>
            </div>

            {/* Settings Container */}
            <div className="bg-card rounded-lg border border-border overflow-hidden card-shadow">
              {/* Tab Navigation */}
              <div className="border-b border-border overflow-x-auto">
                <nav className="flex space-x-8 px-4 lg:px-6 min-w-max" aria-label="Settings tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`
                        flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-smooth whitespace-nowrap
                        ${activeTab === tab.id
                          ? 'border-primary text-primary' :'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                        }
                      `}
                    >
                      <Icon name={tab.icon} size={18} />
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-4 lg:p-6">
                {ActiveTabComponent && <ActiveTabComponent />}
              </div>
            </div>

            {/* System Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
              <div className="bg-card rounded-lg border border-border p-4 lg:p-6 card-shadow">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-success rounded-full flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-card-foreground">System Status</p>
                    <p className="text-sm text-muted-foreground">All systems operational</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card rounded-lg border border-border p-4 lg:p-6 card-shadow">
                <div className="flex items-center space-x-3">
                  <Icon name="Database" size={20} className="text-accent flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-card-foreground">Database</p>
                    <p className="text-sm text-muted-foreground">Connected, 45ms latency</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-card rounded-lg border border-border p-4 lg:p-6 card-shadow">
                <div className="flex items-center space-x-3">
                  <Icon name="Shield" size={20} className="text-success flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-card-foreground">Security</p>
                    <p className="text-sm text-muted-foreground">SSL active, no threats</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Change History Panel */}
      <ChangeHistoryPanel 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)} 
      />
    </div>
  );
};

export default PlatformSettings;