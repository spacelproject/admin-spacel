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

const BookingSearchBar = ({ onSearch, bookings = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);

  // Use debounced search term
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Search bookings locally and in database
  const searchBookings = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const queryLower = query.toLowerCase();
      
      // First, search in local bookings
      const localMatches = bookings
        .filter(booking => {
          const idMatch = booking?.booking_reference?.toLowerCase()?.includes(queryLower);
          const guestMatch = booking?.guestName?.toLowerCase()?.includes(queryLower) ||
                           booking?.guestEmail?.toLowerCase()?.includes(queryLower);
          const spaceMatch = booking?.spaceName?.toLowerCase()?.includes(queryLower);
          return idMatch || guestMatch || spaceMatch;
        })
        .slice(0, 5)
        .map(booking => ({
          type: 'booking',
          id: booking.id,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          spaceName: booking.spaceName,
          status: booking.status,
          total: booking.total
        }));

      // Also search in database for bookings not in current page
      const { data: dbBookings, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          total_paid,
          price,
          seekers:seeker_id (
            id,
            email,
            first_name,
            last_name
          ),
          listings:listing_id (
            id,
            name
          )
        `)
        .or(`id.ilike.%${query}%,seekers.email.ilike.%${query}%,seekers.first_name.ilike.%${query}%,seekers.last_name.ilike.%${query}%,listings.name.ilike.%${query}%`)
        .limit(10);
      
      if (!error && dbBookings) {
        const dbMatches = dbBookings
          .filter(dbBooking => {
            // Exclude bookings already in local results
            return !localMatches.some(local => local.id === dbBooking.id);
          })
          .slice(0, 5)
          .map(booking => ({
            type: 'booking',
            id: booking.id,
            guestName: booking.seekers 
              ? `${booking.seekers.first_name || ''} ${booking.seekers.last_name || ''}`.trim() || 'Unknown Guest'
              : 'Unknown Guest',
            guestEmail: booking.seekers?.email || '',
            spaceName: booking.listings?.name || 'Unknown Space',
            status: booking.status,
            total: parseFloat(booking.total_paid || booking.price || 0)
          }));

        const allSuggestions = [...localMatches, ...dbMatches].slice(0, 10);
        setSuggestions(allSuggestions);
      } else {
        setSuggestions(localMatches);
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
    searchBookings(debouncedSearchTerm);
  }, [debouncedSearchTerm, bookings]);

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
    setSearchTerm(suggestion.id || suggestion.guestName || suggestion.spaceName);
    onSearch(suggestion.id || suggestion.guestName || suggestion.spaceName);
    setShowSuggestions(false);
  };

  return (
    <div className="flex-1 relative" ref={searchRef}>
      <div className="relative">
        <Icon 
          name="Search" 
          size={20} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
        />
        <Input
          type="search"
          placeholder="Search by reference, guest name, space name, or email..."
          value={searchTerm}
          onChange={handleSearchChange}
          onFocus={() => setShowSuggestions(searchTerm.length > 0)}
          className="pl-10"
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
                  name="Calendar" 
                  size={16} 
                  className="text-muted-foreground flex-shrink-0" 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {suggestion.guestName} - {suggestion.spaceName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    ID: {suggestion.id?.slice(0, 8)}... • {suggestion.guestEmail} • Status: {suggestion.status}
                  </p>
                </div>
              </button>
            ))
          ) : searchTerm.length >= 2 ? (
            <div className="px-4 py-3 text-center">
              <Icon name="Search" size={16} className="text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No bookings found</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default BookingSearchBar;

