import React, { useState, useEffect } from 'react';

import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Button from '../../../components/ui/Button';

const SpaceFilters = ({ categories = [], onFiltersChange, onClearFilters, currentFilters = {} }) => {
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    priceRange: { min: '', max: '' },
    amenities: []
  });

  const [isExpanded, setIsExpanded] = useState(false);

  // Sync filters with currentFilters prop
  useEffect(() => {
    if (currentFilters && Object.keys(currentFilters).length > 0) {
      setFilters(currentFilters);
    }
  }, [currentFilters]);

  // Generate category options from dynamic categories
  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...categories?.map(cat => ({ value: cat?.id, label: cat?.label })),
    // Add subcategories as separate options
    ...categories?.flatMap(cat => 
      (cat?.subCategories || [])?.map(subCat => ({
        value: subCat?.id,
        label: `${cat?.label} - ${subCat?.label}`
      }))
    )
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending Approval' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const amenityOptions = [
    { value: 'wifi', label: 'WiFi' },
    { value: 'parking', label: 'Parking' },
    { value: 'ac', label: 'Air Conditioning' },
    { value: 'kitchen', label: 'Kitchen' },
    { value: 'projector', label: 'Projector' },
    { value: 'whiteboard', label: 'Whiteboard' },
    { value: 'security', label: '24/7 Security' },
    { value: 'elevator', label: 'Elevator Access' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handlePriceRangeChange = (type, value) => {
    const newPriceRange = { ...filters?.priceRange, [type]: value };
    const newFilters = { ...filters, priceRange: newPriceRange };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleAmenityChange = (amenity, checked) => {
    const newAmenities = checked
      ? [...filters?.amenities, amenity]
      : filters?.amenities?.filter(a => a !== amenity);
    
    const newFilters = { ...filters, amenities: newAmenities };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearAll = () => {
    const clearedFilters = {
      search: '',
      category: '',
      status: '',
      priceRange: { min: '', max: '' },
      amenities: []
    };
    setFilters(clearedFilters);
    onClearFilters();
  };

  const hasActiveFilters = filters?.search || filters?.category || 
    filters?.status || filters?.priceRange?.min || filters?.priceRange?.max || 
    filters?.amenities?.length > 0;

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      {/* Basic Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Input
          type="search"
          placeholder="Search spaces, hosts..."
          value={filters?.search}
          onChange={(e) => handleFilterChange('search', e?.target?.value)}
          className="w-full"
        />
        
        <Select
          options={categoryOptions}
          value={filters?.category}
          onChange={(value) => handleFilterChange('category', value)}
          placeholder="Select category"
        />
        
        <Select
          options={statusOptions}
          value={filters?.status}
          onChange={(value) => handleFilterChange('status', value)}
          placeholder="Select status"
        />
      </div>
      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
          iconPosition="right"
        >
          Advanced Filters
        </Button>
        
        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={handleClearAll}
            iconName="X"
            iconPosition="left"
          >
            Clear All
          </Button>
        )}
      </div>
      {/* Advanced Filters Panel */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Price Range */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Price Range (per hour)</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Min price"
                  value={filters?.priceRange?.min}
                  onChange={(e) => handlePriceRangeChange('min', e?.target?.value)}
                />
                <Input
                  type="number"
                  placeholder="Max price"
                  value={filters?.priceRange?.max}
                  onChange={(e) => handlePriceRangeChange('max', e?.target?.value)}
                />
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Amenities</h4>
              <div className="grid grid-cols-2 gap-2">
                {amenityOptions?.map((amenity) => (
                  <Checkbox
                    key={amenity?.value}
                    label={amenity?.label}
                    checked={filters?.amenities?.includes(amenity?.value)}
                    onChange={(e) => handleAmenityChange(amenity?.value, e?.target?.checked)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceFilters;