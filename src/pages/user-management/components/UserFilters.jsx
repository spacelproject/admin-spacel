import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';

const UserFilters = ({ onFiltersChange, isExpanded, onToggle }) => {
  const [filters, setFilters] = useState({
    userType: '',
    status: '',
    registrationDateFrom: '',
    registrationDateTo: '',
    location: '',
    lastActivityFrom: '',
    lastActivityTo: ''
  });

  const userTypeOptions = [
    { value: '', label: 'All User Types' },
    { value: 'partner', label: 'Partner' },
    { value: 'seeker', label: 'Seeker' }
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'pending', label: 'Pending Verification' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const locationOptions = [
    { value: '', label: 'All Locations' },
    { value: 'new-york', label: 'New York' },
    { value: 'los-angeles', label: 'Los Angeles' },
    { value: 'chicago', label: 'Chicago' },
    { value: 'houston', label: 'Houston' },
    { value: 'phoenix', label: 'Phoenix' },
    { value: 'philadelphia', label: 'Philadelphia' },
    { value: 'san-antonio', label: 'San Antonio' },
    { value: 'san-diego', label: 'San Diego' },
    { value: 'dallas', label: 'Dallas' },
    { value: 'san-jose', label: 'San Jose' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      userType: '',
      status: '',
      registrationDateFrom: '',
      registrationDateTo: '',
      location: '',
      lastActivityFrom: '',
      lastActivityTo: ''
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters)?.some(value => value !== '');

  return (
    <div className="bg-card border border-border rounded-lg mb-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-2">
          <Icon name="Filter" size={20} className="text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Advanced Filters</h3>
          {hasActiveFilters && (
            <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              iconName="X"
              iconPosition="left"
            >
              Clear All
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
            iconPosition="right"
          >
            {isExpanded ? 'Hide' : 'Show'} Filters
          </Button>
        </div>
      </div>
      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* First Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Select
              label="User Type"
              options={userTypeOptions}
              value={filters?.userType}
              onChange={(value) => handleFilterChange('userType', value)}
              placeholder="Select user type"
            />
            <Select
              label="Account Status"
              options={statusOptions}
              value={filters?.status}
              onChange={(value) => handleFilterChange('status', value)}
              placeholder="Select status"
            />
            <Select
              label="Location"
              options={locationOptions}
              value={filters?.location}
              onChange={(value) => handleFilterChange('location', value)}
              placeholder="Select location"
              searchable
            />
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Registration From"
              type="date"
              value={filters?.registrationDateFrom}
              onChange={(e) => handleFilterChange('registrationDateFrom', e?.target?.value)}
            />
            <Input
              label="Registration To"
              type="date"
              value={filters?.registrationDateTo}
              onChange={(e) => handleFilterChange('registrationDateTo', e?.target?.value)}
            />
            <Input
              label="Last Activity From"
              type="date"
              value={filters?.lastActivityFrom}
              onChange={(e) => handleFilterChange('lastActivityFrom', e?.target?.value)}
            />
            <Input
              label="Last Activity To"
              type="date"
              value={filters?.lastActivityTo}
              onChange={(e) => handleFilterChange('lastActivityTo', e?.target?.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UserFilters;