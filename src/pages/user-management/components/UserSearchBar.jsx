import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';

const UserSearchBar = ({ onSearch, onBulkAction, selectedCount }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const searchRef = useRef(null);
  const bulkRef = useRef(null);

  // Mock search suggestions
  const suggestions = [
    { type: 'user', name: 'John Smith', email: 'john.smith@email.com', id: 'USR001' },
    { type: 'user', name: 'Sarah Johnson', email: 'sarah.j@email.com', id: 'USR002' },
    { type: 'user', name: 'Michael Brown', email: 'michael.brown@email.com', id: 'USR003' },
    { type: 'email', value: 'admin@spacio.com' },
    { type: 'id', value: 'USR004' }
  ];

  const bulkActions = [
    { id: 'activate', label: 'Activate Users', icon: 'CheckCircle', variant: 'success' },
    { id: 'suspend', label: 'Suspend Users', icon: 'XCircle', variant: 'warning' },
    { id: 'delete', label: 'Delete Users', icon: 'Trash2', variant: 'destructive' },
    { id: 'export', label: 'Export Selected', icon: 'Download', variant: 'default' },
    { id: 'message', label: 'Send Message', icon: 'MessageCircle', variant: 'default' },
    { id: 'role', label: 'Change Role', icon: 'UserCog', variant: 'default' }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (bulkRef.current && !bulkRef.current.contains(event.target)) {
        setShowBulkActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(value.length > 0);
    onSearch(value);
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'user') {
      setSearchTerm(suggestion.name);
      onSearch(suggestion.name);
    } else {
      setSearchTerm(suggestion.value);
      onSearch(suggestion.value);
    }
    setShowSuggestions(false);
  };

  const handleBulkActionClick = (actionId) => {
    onBulkAction(actionId);
    setShowBulkActions(false);
  };

  const filteredSuggestions = suggestions.filter(suggestion => {
    const searchLower = searchTerm.toLowerCase();
    if (suggestion.type === 'user') {
      return suggestion.name.toLowerCase().includes(searchLower) ||
             suggestion.email.toLowerCase().includes(searchLower) ||
             suggestion.id.toLowerCase().includes(searchLower);
    }
    return suggestion.value.toLowerCase().includes(searchLower);
  });

  return (
    <div className="flex items-center space-x-4 mb-6">
      {/* Search Bar */}
      <div className="flex-1 relative" ref={searchRef}>
        <div className="relative">
          <Icon 
            name="Search" 
            size={20} 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
          />
          <Input
            type="search"
            placeholder="Search by name, email, or user ID..."
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setShowSuggestions(searchTerm.length > 0)}
            className="pl-10"
          />
        </div>

        {/* Search Suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-modal z-dropdown max-h-64 overflow-y-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-muted transition-smooth border-b border-border last:border-b-0"
              >
                <Icon 
                  name={suggestion.type === 'user' ? 'User' : suggestion.type === 'email' ? 'Mail' : 'Hash'} 
                  size={16} 
                  className="text-muted-foreground flex-shrink-0" 
                />
                <div className="flex-1 min-w-0">
                  {suggestion.type === 'user' ? (
                    <>
                      <p className="text-sm font-medium text-foreground truncate">
                        {suggestion.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.email} • {suggestion.id}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-foreground truncate">
                      {suggestion.value}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedCount > 0 && (
        <div className="relative" ref={bulkRef}>
          <button
            onClick={() => setShowBulkActions(!showBulkActions)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-smooth"
          >
            <Icon name="Settings" size={16} />
            <span className="text-sm font-medium">
              Bulk Actions ({selectedCount})
            </span>
            <Icon name="ChevronDown" size={16} />
          </button>

          {/* Bulk Actions Dropdown */}
          {showBulkActions && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-popover border border-border rounded-md shadow-modal z-dropdown">
              <div className="py-2">
                {bulkActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleBulkActionClick(action.id)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-2 text-left transition-smooth
                      ${action.variant === 'destructive' ?'text-destructive hover:bg-destructive/10' 
                        : action.variant === 'warning' ?'text-warning hover:bg-warning/10'
                        : action.variant === 'success' ?'text-success hover:bg-success/10' :'text-popover-foreground hover:bg-muted'
                      }
                    `}
                  >
                    <Icon 
                      name={action.icon} 
                      size={16} 
                      className={
                        action.variant === 'destructive' ? 'text-destructive' :
                        action.variant === 'warning' ? 'text-warning' :
                        action.variant === 'success'? 'text-success' : 'text-muted-foreground'
                      }
                    />
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserSearchBar;