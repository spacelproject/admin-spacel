import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';
import { useDataExport } from '../../../hooks/useDataExport';

const DataExportPanel = ({ onExport, selectedDateRange, customDateRange }) => {
  const [exportFormat, setExportFormat] = useState('csv');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [dateRange, setDateRange] = useState(selectedDateRange || '30d');
  const { exportData, exporting } = useDataExport();

  const formatOptions = [
    { value: 'csv', label: 'CSV' },
    { value: 'excel', label: 'Excel (XLSX)' },
    { value: 'pdf', label: 'PDF Report' }
  ];

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '6m', label: 'Last 6 months' },
    { value: '1y', label: 'Last year' },
    { value: 'ytd', label: 'Year to date' },
    { value: 'custom', label: 'Custom range' }
  ];
  
  // Update dateRange when selectedDateRange prop changes
  useEffect(() => {
    if (selectedDateRange) {
      setDateRange(selectedDateRange);
    }
  }, [selectedDateRange]);

  const availableColumns = [
    { id: 'user-data', label: 'User Data' },
    { id: 'booking-data', label: 'Booking Data' },
    { id: 'revenue-data', label: 'Revenue Data' },
    { id: 'space-data', label: 'Space Data' },
    { id: 'performance-metrics', label: 'Performance Metrics' },
    { id: 'analytics-data', label: 'Analytics Data' }
  ];

  const handleColumnToggle = (columnId) => {
    setSelectedColumns(prev => 
      prev.includes(columnId) 
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      console.warn('⚠️ Please select at least one data column to export');
      return;
    }

    try {
      const exportConfig = {
        format: exportFormat,
        columns: selectedColumns,
        dateRange: dateRange,
        customDateRange: dateRange === 'custom' ? customDateRange : null,
        timestamp: new Date().toISOString()
      };
      
      const result = await exportData(exportConfig);
      
      if (result?.success) {
        // Call the parent callback if provided
        if (onExport) {
          onExport(exportConfig);
        }
        
        // Show success message
        console.log('✅ Export completed successfully:', result.message || 'File downloaded');
      } else {
        console.warn('⚠️ Export completed with warnings:', result?.message);
      }
    } catch (error) {
      console.error('❌ Export failed:', error?.message || error);
      // Could add error toast notification here
      throw error; // Re-throw to allow parent to handle
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Icon name="Download" size={24} className="text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Data Export</h3>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Export Format"
            options={formatOptions}
            value={exportFormat}
            onChange={setExportFormat}
          />

          <Select
            label="Date Range"
            options={dateRangeOptions}
            value={dateRange}
            onChange={setDateRange}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Select Data to Export
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {availableColumns.map((column) => (
              <Checkbox
                key={column.id}
                label={column.label}
                checked={selectedColumns.includes(column.id)}
                onChange={() => handleColumnToggle(column.id)}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="default"
            onClick={handleExport}
            disabled={selectedColumns.length === 0 || exporting}
            iconName={exporting ? "Loader2" : "Download"}
            iconPosition="left"
            className="flex-1"
          >
            {exporting ? 'Exporting...' : 'Export Data'}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setSelectedColumns(availableColumns.map(col => col.id))}
            iconName="CheckSquare"
            iconPosition="left"
            disabled={exporting}
          >
            Select All
          </Button>
          
          <Button
            variant="ghost"
            onClick={() => setSelectedColumns([])}
            iconName="Square"
            iconPosition="left"
            disabled={exporting}
          >
            Clear All
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DataExportPanel;