import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import { supabase } from '../../../lib/supabase';

// Debounced search hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

const UserSearchBar = ({ onSearch, onBulkAction, selectedCount }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // Use debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Real search functionality
  const searchUsers = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, phone, company_name')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);
      
      if (!error) {
        const formattedSuggestions = data.map(user => ({
          type: 'user',
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Name',
          email: user.email,
          id: user.id,
          role: user.role,
          phone: user.phone,
          company: user.company_name
        }));
        setSuggestions(formattedSuggestions);
      } else {
        console.error('Search error:', error);
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Effect to trigger search when debounced term changes
  useEffect(() => {
    searchUsers(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
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
    setSearchTerm(suggestion.name);
    onSearch(suggestion.name);
    setShowSuggestions(false);
  };

  // No need for client-side filtering since we're getting filtered results from Supabase

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3.5 card-shadow mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      {/* Search Bar */}
      <div className="flex-1 relative" ref={searchRef}>
        <div className="relative">
          <Icon 
            name="Search" 
            size={18} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
          />
          <Input
            type="search"
            placeholder="Search by name, email, or user ID..."
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setShowSuggestions(searchTerm.length > 0)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Search Suggestions */}
        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-modal z-dropdown max-h-64 overflow-y-auto">
            {searchLoading ? (
              <div className="flex items-center justify-center px-4 py-3">
                <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id || index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-muted transition-smooth border-b border-border last:border-b-0"
                >
                  <Icon 
                    name="User" 
                    size={16} 
                    className="text-muted-foreground flex-shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {suggestion.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {suggestion.email} • {suggestion.role} • {suggestion.id.slice(0, 8)}...
                    </p>
                    {suggestion.company && (
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.company}
                      </p>
                    )}
                  </div>
                </button>
              ))
            ) : searchTerm.length >= 2 ? (
              <div className="px-4 py-3 text-center">
                <Icon name="Search" size={16} className="text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Selection / Bulk Actions Bar */}
      <div className="flex items-center justify-end gap-2 text-xs md:text-sm">
        {selectedCount > 0 ? (
          <>
            <span className="font-medium text-gray-800">
              {selectedCount} selected
            </span>
            <button
              type="button"
              onClick={() => onBulkAction('activate')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-smooth"
            >
              <Icon name="CheckCircle" size={14} className="text-emerald-500" />
              <span>Activate</span>
            </button>
            <button
              type="button"
              onClick={() => onBulkAction('suspend')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-smooth"
            >
              <Icon name="PauseCircle" size={14} className="text-amber-500" />
              <span>Suspend</span>
            </button>
            <button
              type="button"
              onClick={() => onBulkAction('delete')}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-100 text-red-600 hover:bg-red-50 transition-smooth"
            >
              <Icon name="Trash2" size={14} className="text-red-500" />
              <span>Delete</span>
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-[11px] md:text-xs text-gray-500">
            <span className="hidden md:inline-block">Tip:</span>
            <span>Select rows to run bulk actions like activate, suspend, or delete.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSearchBar;