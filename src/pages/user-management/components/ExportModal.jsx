import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { useToast } from '../../../components/ui/Toast';

const ExportModal = ({ isOpen, onClose, onExport, selectedCount, totalCount }) => {
  const { showToast } = useToast();
  const [exportOptions, setExportOptions] = useState({
    format: 'csv',
    scope: 'selected', // 'selected' or 'filtered' or 'all'
    includeFields: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      phone: true,
      bookings: true,
      earnings: true,
      dates: true
    }
  });

  if (!isOpen) return null;

  const formatOptions = [
    { value: 'csv', label: 'CSV (Comma Separated Values)' },
    { value: 'excel', label: 'Excel (.xlsx)' },
    { value: 'json', label: 'JSON' }
  ];

  const scopeOptions = [
    { value: 'selected', label: `Selected Users (${selectedCount})` },
    { value: 'filtered', label: `Filtered Users (${totalCount})` },
    { value: 'all', label: 'All Users' }
  ];

  const handleExport = () => {
    if (exportOptions.scope === 'selected' && selectedCount === 0) {
      showToast('Please select at least one user to export', 'error');
      return;
    }

    onExport(exportOptions);
    handleClose();
  };

  const handleClose = () => {
    setExportOptions({
      format: 'csv',
      scope: 'selected',
      includeFields: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        bookings: true,
        earnings: true,
        dates: true
      }
    });
    onClose();
  };

  const toggleField = (field) => {
    setExportOptions(prev => ({
      ...prev,
      includeFields: {
        ...prev.includeFields,
        [field]: !prev.includeFields[field]
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-4">
      <div className="bg-card rounded-lg shadow-modal w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="Download" size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Export Users</h2>
              <p className="text-sm text-muted-foreground">Choose export options</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            iconName="X"
            onClick={handleClose}
          />
        </div>

        {/* Form */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Export Scope */}
          <div className="space-y-2">
            <Select
              label="Export Scope"
              options={scopeOptions}
              value={exportOptions.scope}
              onChange={(value) => setExportOptions(prev => ({ ...prev, scope: value }))}
            />
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Select
              label="Export Format"
              options={formatOptions}
              value={exportOptions.format}
              onChange={(value) => setExportOptions(prev => ({ ...prev, format: value }))}
            />
          </div>

          {/* Fields Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Include Fields</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(exportOptions.includeFields).map(([field, included]) => (
                <label key={field} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => toggleField(field)}
                    className="rounded border-border"
                  />
                  <span className="text-sm text-foreground capitalize">
                    {field === 'id' ? 'User ID' : 
                     field === 'bookings' ? 'Total Bookings' :
                     field === 'earnings' ? 'Earnings/Spent' :
                     field === 'dates' ? 'Dates' :
                     field}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border">
          <Button 
            variant="outline" 
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button 
            variant="default" 
            onClick={handleExport}
            iconName="Download"
            iconPosition="left"
          >
            Export
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;

