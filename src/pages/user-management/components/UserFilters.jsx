import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';

const UserFilters = ({ onFiltersChange, isExpanded, onToggle }) => {
  const { user: adminUser } = useAuth();
  const { showToast } = useToast();
  const [filters, setFilters] = useState({
    userType: '',
    status: '',
    registrationDateFrom: '',
    registrationDateTo: '',
    location: '',
    lastActivityFrom: '',
    lastActivityTo: ''
  });
  const [savedPresets, setSavedPresets] = useState([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetName, setPresetName] = useState('');

  const userTypeOptions = [
    { value: '', label: 'All User Types' },
    { value: 'partner', label: 'Partner' },
    { value: 'seeker', label: 'Seeker' },
    { value: 'admin', label: 'Admin' }
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'pending', label: 'Pending Verification' },
    { value: 'inactive', label: 'Inactive' }
  ];

  // Location filter is free-form (avoid dummy dropdown options)

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

  // Load saved presets from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('user_filter_presets');
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
      localStorage.setItem('user_filter_presets', JSON.stringify(updatedPresets));
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
      localStorage.setItem('user_filter_presets', JSON.stringify(updatedPresets));
      showToast('Filter preset deleted', 'success');
    } catch (error) {
      console.error('Error deleting preset:', error);
      showToast('Error deleting filter preset', 'error');
    }
  };

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
          {/* Saved Presets */}
          {savedPresets.length > 0 && (
            <div className="relative group">
              <Button
                variant="ghost"
                size="sm"
                iconName="Bookmark"
                iconPosition="left"
              >
                Presets
              </Button>
              <div className="absolute top-full right-0 mt-2 w-48 bg-popover border border-border rounded-md shadow-modal z-dropdown opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="py-2">
                  {savedPresets.map((preset) => (
                    <div key={preset.id} className="flex items-center justify-between px-4 py-2 hover:bg-muted">
                      <button
                        onClick={() => handleLoadPreset(preset)}
                        className="flex-1 text-left text-sm text-foreground"
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => handleDeletePreset(preset.id)}
                        className="ml-2 text-muted-foreground hover:text-destructive"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-border mt-2 pt-2">
                    <button
                      onClick={() => setShowPresetModal(true)}
                      className="w-full text-left px-4 py-2 text-sm text-primary hover:bg-muted"
                    >
                      <Icon name="Plus" size={14} className="inline mr-2" />
                      Save Current Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {hasActiveFilters && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPresetModal(true)}
                iconName="BookmarkPlus"
                iconPosition="left"
              >
                Save Preset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                iconName="X"
                iconPosition="left"
              >
                Clear All
              </Button>
            </>
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
            <Input
              label="Location"
              type="text"
              value={filters?.location}
              onChange={(e) => handleFilterChange('location', e?.target?.value)}
              placeholder="Search location"
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

      {/* Save Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
          <div className="bg-card rounded-lg shadow-modal w-full max-w-md">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Save Filter Preset</h3>
              <Input
                label="Preset Name"
                type="text"
                placeholder="Enter preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
              <div className="flex items-center justify-end space-x-2">
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

export default UserFilters;