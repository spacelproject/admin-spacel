import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import BookingSearchBar from './BookingSearchBar';
import { useToast } from '../../../components/ui/Toast';

const BookingFilters = ({ onFiltersChange, bookingCounts, bookings = [] }) => {
  const { showToast } = useToast();
  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    status: '',
    paymentStatus: '',
    amountRange: { min: '', max: '' },
    searchQuery: '',
    guestName: '',
    guestEmail: '',
    hostName: '',
    bookingType: '',
    payoutStatus: ''
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [savedPresets, setSavedPresets] = useState([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'pending', label: 'Pending' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'completed', label: 'Completed' }
  ];

  const paymentStatusOptions = [
    { value: '', label: 'All Payment Status' },
    { value: 'paid', label: 'Paid' },
    { value: 'pending', label: 'Pending Payment' },
    { value: 'refunded', label: 'Refunded' },
    { value: 'failed', label: 'Failed' }
  ];

  const bookingTypeOptions = [
    { value: '', label: 'All Types' },
    { value: 'instant', label: 'Instant' },
    { value: 'request', label: 'Request' },
    { value: 'recurring', label: 'Recurring' }
  ];

  const payoutStatusOptions = [
    { value: '', label: 'All Payout Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' }
  ];


  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateRangeChange = (type, value) => {
    const newDateRange = { ...filters.dateRange, [type]: value };
    const newFilters = { ...filters, dateRange: newDateRange };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleAmountRangeChange = (type, value) => {
    const newAmountRange = { ...filters.amountRange, [type]: value };
    const newFilters = { ...filters, amountRange: newAmountRange };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      dateRange: { start: '', end: '' },
      status: '',
      paymentStatus: '',
      amountRange: { min: '', max: '' },
      searchQuery: '',
      guestName: '',
      guestEmail: '',
      hostName: '',
      bookingType: '',
      payoutStatus: ''
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = filters.status || filters.paymentStatus || 
    filters.dateRange.start || filters.dateRange.end || 
    filters.amountRange.min || filters.amountRange.max || 
    filters.searchQuery || filters.guestName || filters.guestEmail ||
    filters.hostName || filters.bookingType || filters.payoutStatus;

  // Load saved presets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('booking_filter_presets');
      if (saved) {
        setSavedPresets(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading filter presets:', error);
    }
  }, []);

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      showToast('Please enter a name for this filter preset', 'error');
      return;
    }

    try {
      const newPreset = {
        id: Date.now().toString(),
        name: presetName.trim(),
        filters: { ...filters },
        created_at: new Date().toISOString()
      };

      const updatedPresets = [...savedPresets, newPreset];
      setSavedPresets(updatedPresets);
      localStorage.setItem('booking_filter_presets', JSON.stringify(updatedPresets));
      showToast('Filter preset saved successfully', 'success');
      setPresetName('');
      setShowPresetModal(false);
    } catch (error) {
      console.error('Error saving preset:', error);
      showToast('Error saving filter preset', 'error');
    }
  };

  const handleLoadPreset = (preset) => {
    setFilters(preset.filters);
    onFiltersChange(preset.filters);
    showToast(`Loaded filter preset: ${preset.name}`, 'success');
  };

  const handleDeletePreset = (presetId) => {
    try {
      const updatedPresets = savedPresets.filter(p => p.id !== presetId);
      setSavedPresets(updatedPresets);
      localStorage.setItem('booking_filter_presets', JSON.stringify(updatedPresets));
      showToast('Filter preset deleted', 'success');
    } catch (error) {
      console.error('Error deleting preset:', error);
      showToast('Error deleting filter preset', 'error');
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      {/* Search Bar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        <BookingSearchBar
          onSearch={(value) => handleFilterChange('searchQuery', value)}
          bookings={bookings}
        />
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          iconName={isExpanded ? "ChevronUp" : "ChevronDown"}
          iconPosition="right"
        >
          Advanced Filters
        </Button>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Date Range</label>
              <div className="space-y-2">
                <Input
                  type="date"
                  placeholder="Start date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="End date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                />
              </div>
            </div>

            {/* Booking Status */}
            <div>
              <Select
                label="Booking Status"
                options={statusOptions}
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
              />
            </div>

            {/* Payment Status */}
            <div>
              <Select
                label="Payment Status"
                options={paymentStatusOptions}
                value={filters.paymentStatus}
                onChange={(value) => handleFilterChange('paymentStatus', value)}
              />
            </div>

            {/* Amount Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Amount Range</label>
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Min amount"
                  value={filters.amountRange.min}
                  onChange={(e) => handleAmountRangeChange('min', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max amount"
                  value={filters.amountRange.max}
                  onChange={(e) => handleAmountRangeChange('max', e.target.value)}
                />
              </div>
            </div>

            {/* Guest Name */}
            <div>
              <Input
                label="Guest Name"
                placeholder="Filter by guest name"
                value={filters.guestName}
                onChange={(e) => handleFilterChange('guestName', e.target.value)}
              />
            </div>

            {/* Guest Email */}
            <div>
              <Input
                label="Guest Email"
                type="email"
                placeholder="Filter by guest email"
                value={filters.guestEmail}
                onChange={(e) => handleFilterChange('guestEmail', e.target.value)}
              />
            </div>

            {/* Host Name */}
            <div>
              <Input
                label="Host Name"
                placeholder="Filter by host name"
                value={filters.hostName}
                onChange={(e) => handleFilterChange('hostName', e.target.value)}
              />
            </div>

            {/* Booking Type */}
            <div>
              <Select
                label="Booking Type"
                options={bookingTypeOptions}
                value={filters.bookingType}
                onChange={(value) => handleFilterChange('bookingType', value)}
              />
            </div>

            {/* Payout Status */}
            <div>
              <Select
                label="Payout Status"
                options={payoutStatusOptions}
                value={filters.payoutStatus}
                onChange={(value) => handleFilterChange('payoutStatus', value)}
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-muted-foreground">
              Showing {bookingCounts.filtered} of {bookingCounts.total} bookings
            </div>
            <div className="flex items-center space-x-2">
              {/* Filter Presets */}
              {savedPresets.length > 0 && (
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setShowPresetModal(!showPresetModal)}
                    iconName="Bookmark"
                    iconPosition="left"
                    size="sm"
                  >
                    Presets ({savedPresets.length})
                  </Button>
                  {showPresetModal && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-popover border border-border rounded-md shadow-modal z-dropdown">
                      <div className="p-2">
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">
                          Saved Presets
                        </div>
                        {savedPresets.map(preset => (
                          <div key={preset.id} className="flex items-center justify-between px-2 py-2 hover:bg-muted rounded">
                            <button
                              onClick={() => {
                                handleLoadPreset(preset);
                                setShowPresetModal(false);
                              }}
                              className="flex-1 text-left text-sm text-foreground"
                            >
                              {preset.name}
                            </button>
                            <button
                              onClick={() => handleDeletePreset(preset.id)}
                              className="p-1 hover:bg-destructive/10 rounded"
                            >
                              <Icon name="Trash2" size={14} className="text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => setShowPresetModal(true)}
                iconName="Save"
                iconPosition="left"
                size="sm"
              >
                Save Preset
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  iconName="X"
                  iconPosition="left"
                  size="sm"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save Preset Modal */}
      {showPresetModal && !savedPresets.find(p => p.id === 'temp') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
          <div className="bg-card rounded-lg shadow-modal w-full max-w-md">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Save Filter Preset</h3>
            </div>
            <div className="p-6 space-y-4">
              <Input
                label="Preset Name"
                placeholder="Enter a name for this filter preset"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSavePreset();
                  }
                }}
              />
              <div className="flex items-center justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPresetModal(false);
                    setPresetName('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleSavePreset}
                  iconName="Save"
                  iconPosition="left"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingFilters;