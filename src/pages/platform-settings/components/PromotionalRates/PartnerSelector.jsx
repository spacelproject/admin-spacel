import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../../components/AppIcon';
import Input from '../../../../components/ui/Input';
import { supabase } from '../../../../lib/supabase';

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

const PartnerSelector = ({ value, onChange, error, required = false, label = "Partner" }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const searchRef = useRef(null);

  // Use debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Fetch selected partner details when value changes
  useEffect(() => {
    if (value && value !== 'all') {
      fetchPartnerDetails(value);
    } else if (value === 'all') {
      setSelectedPartner({ id: 'all', name: 'All Partners', email: 'Applies to all partners' });
      setSearchTerm('All Partners');
    } else {
      setSelectedPartner(null);
      setSearchTerm('');
    }
  }, [value]);

  const fetchPartnerDetails = async (partnerId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, company_name')
        .eq('id', partnerId)
        .eq('role', 'partner')
        .single();
      
      if (!error && data) {
        const partner = {
          id: data.id,
          name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || data.company_name || 'No Name',
          email: data.email,
          company: data.company_name
        };
        setSelectedPartner(partner);
        setSearchTerm(partner.name);
      }
    } catch (err) {
      console.error('Error fetching partner:', err);
    }
  };

  // Real search functionality
  const searchPartners = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, company_name')
        .eq('role', 'partner')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,company_name.ilike.%${query}%`)
        .limit(10);
      
      if (!error) {
        const formattedSuggestions = data.map(partner => ({
          type: 'partner',
          name: `${partner.first_name || ''} ${partner.last_name || ''}`.trim() || partner.company_name || 'No Name',
          email: partner.email,
          id: partner.id,
          company: partner.company_name
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
    if (debouncedSearchTerm && debouncedSearchTerm !== selectedPartner?.name) {
      searchPartners(debouncedSearchTerm);
    }
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
    setShowSuggestions(value.length > 0 && value !== selectedPartner?.name);
  };

  const handleSuggestionClick = (suggestion) => {
    setSelectedPartner(suggestion);
    setSearchTerm(suggestion.name);
    setShowSuggestions(false);
    onChange(suggestion.id);
  };

  const handleAllPartnersClick = () => {
    setSelectedPartner({ id: 'all', name: 'All Partners', email: 'Applies to all partners' });
    setSearchTerm('All Partners');
    setShowSuggestions(false);
    onChange('all');
  };

  const handleClear = () => {
    setSelectedPartner(null);
    setSearchTerm('');
    setShowSuggestions(false);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative" ref={searchRef}>
        <div className="relative">
          <Icon 
            name="Search" 
            size={18} 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" 
          />
          <Input
            type="text"
            placeholder="Search partner by name, email, or company..."
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setShowSuggestions(searchTerm.length > 0 || true)}
            className="pl-9 pr-9"
            error={error}
          />
          {selectedPartner && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Icon name="X" size={16} />
            </button>
          )}
        </div>

        {/* Search Suggestions */}
        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-modal z-dropdown max-h-64 overflow-y-auto">
            {/* All Partners Option */}
            <button
              type="button"
              onClick={handleAllPartnersClick}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-muted transition-smooth border-b border-border"
            >
              <Icon 
                name="Users" 
                size={16} 
                className="text-primary flex-shrink-0" 
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  All Partners
                </p>
                <p className="text-xs text-muted-foreground">
                  Apply to all partners
                </p>
              </div>
            </button>

            {searchLoading ? (
              <div className="flex items-center justify-center px-4 py-3">
                <Icon name="Loader2" size={16} className="animate-spin text-muted-foreground mr-2" />
                <span className="text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : suggestions.length > 0 ? (
              suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id || index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-muted transition-smooth border-b border-border last:border-b-0"
                >
                  <Icon 
                    name="Building" 
                    size={16} 
                    className="text-muted-foreground flex-shrink-0" 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {suggestion.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {suggestion.email}
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
                <p className="text-sm text-muted-foreground">No partners found</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};

export default PartnerSelector;

