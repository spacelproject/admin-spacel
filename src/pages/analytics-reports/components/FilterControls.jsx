import React from 'react';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';


const FilterControls = ({ filters, onFilterChange, onClearFilters }) => {
  const userTypeOptions = [
    { value: 'all', label: 'All Users' },
    { value: 'hosts', label: 'Hosts' },
    { value: 'guests', label: 'Guests' },
    { value: 'premium', label: 'Premium Users' }
  ];

  const spaceCategoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'office', label: 'Office Spaces' },
    { value: 'meeting', label: 'Meeting Rooms' },
    { value: 'coworking', label: 'Coworking Spaces' },
    { value: 'event', label: 'Event Venues' }
  ];

  const locationOptions = [
    { value: 'all', label: 'All Locations' },
    { value: 'new-york', label: 'New York' },
    { value: 'los-angeles', label: 'Los Angeles' },
    { value: 'chicago', label: 'Chicago' },
    { value: 'san-francisco', label: 'San Francisco' }
  ];

  const bookingStatusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'pending', label: 'Pending' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'completed', label: 'Completed' }
  ];

  const hasActiveFilters = Object.values(filters).some(value => value !== 'all');

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Filters</h3>
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearFilters}
            iconName="X"
            iconPosition="left"
          >
            Clear All
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select
          label="User Type"
          options={userTypeOptions}
          value={filters.userType}
          onChange={(value) => onFilterChange('userType', value)}
        />
        
        <Select
          label="Space Category"
          options={spaceCategoryOptions}
          value={filters.spaceCategory}
          onChange={(value) => onFilterChange('spaceCategory', value)}
        />
        
        <Select
          label="Location"
          options={locationOptions}
          value={filters.location}
          onChange={(value) => onFilterChange('location', value)}
        />
        
        <Select
          label="Booking Status"
          options={bookingStatusOptions}
          value={filters.bookingStatus}
          onChange={(value) => onFilterChange('bookingStatus', value)}
        />
      </div>
    </div>
  );
};

export default FilterControls;