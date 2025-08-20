import React, { useState, useEffect } from 'react';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';

const SettingsSearch = ({ onSearch, onClear }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mock search data for all settings
  const searchableSettings = [
    { id: 'platform-name', label: 'Platform Name', tab: 'general', category: 'Platform Information' },
    { id: 'company-name', label: 'Company Name', tab: 'general', category: 'Platform Information' },
    { id: 'support-email', label: 'Support Email', tab: 'general', category: 'Platform Information' },
    { id: 'timezone', label: 'Timezone', tab: 'general', category: 'Localization' },
    { id: 'maintenance-mode', label: 'Maintenance Mode', tab: 'general', category: 'System Controls' },
    { id: 'user-registration', label: 'User Registration', tab: 'general', category: 'Feature Toggles' },
    { id: 'default-currency', label: 'Default Currency', tab: 'payment', category: 'Currency Configuration' },
    { id: 'stripe-enabled', label: 'Stripe', tab: 'payment', category: 'Payment Methods' },
    { id: 'platform-fee', label: 'Platform Fee', tab: 'payment', category: 'Fee Structure' },
    { id: 'payout-schedule', label: 'Payout Schedule', tab: 'payment', category: 'Payout Configuration' },
    { id: 'email-notifications', label: 'Email Notifications', tab: 'notifications', category: 'Notification Channels' },
    { id: 'email-provider', label: 'Email Provider', tab: 'notifications', category: 'Email Configuration' },
    { id: 'welcome-email', label: 'Welcome Email', tab: 'notifications', category: 'User Notifications' },
    { id: 'password-length', label: 'Password Length', tab: 'security', category: 'Password Policies' },
    { id: 'session-timeout', label: 'Session Timeout', tab: 'security', category: 'Session Management' },
    { id: 'two-factor', label: 'Two-Factor Authentication', tab: 'security', category: 'Two-Factor Authentication' },
    { id: 'api-rate-limit', label: 'API Rate Limit', tab: 'security', category: 'API Security' },
    { id: 'ssl-required', label: 'SSL Required', tab: 'security', category: 'Data Protection' }
  ];

  useEffect(() => {
    if (searchQuery.trim()) {
      setIsSearching(true);
      
      // Simulate search delay
      const searchTimeout = setTimeout(() => {
        const results = searchableSettings.filter(setting =>
          setting.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          setting.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(results);
        setIsSearching(false);
      }, 300);

      return () => clearTimeout(searchTimeout);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    onSearch(query);
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    onClear();
  };

  const handleResultClick = (result) => {
    console.log('Navigate to setting:', result);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Input
          type="search"
          placeholder="Search settings..."
          value={searchQuery}
          onChange={handleSearch}
          className="pl-10 pr-10"
        />
        
        <Icon 
          name="Search" 
          size={18} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
        />
        
        {searchQuery && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
          >
            <Icon name="X" size={18} />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {(searchQuery && (searchResults.length > 0 || isSearching)) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-md shadow-modal z-dropdown max-h-80 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-muted-foreground">
              <Icon name="Loader2" size={20} className="animate-spin mx-auto mb-2" />
              <p className="text-sm">Searching settings...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-muted transition-smooth border-b border-border last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-popover-foreground">{result.label}</p>
                      <p className="text-xs text-muted-foreground">{result.category}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                        {result.tab}
                      </span>
                      <Icon name="ChevronRight" size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <Icon name="Search" size={20} className="mx-auto mb-2" />
              <p className="text-sm">No settings found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SettingsSearch;