import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';

const ReportGenerator = ({ onGenerateReport }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState([]);
  const [reportFormat, setReportFormat] = useState('pdf');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');

  const reportTemplates = [
    { value: 'financial', label: 'Financial Summary' },
    { value: 'user-activity', label: 'User Activity Report' },
    { value: 'space-performance', label: 'Space Performance Analysis' },
    { value: 'booking-trends', label: 'Booking Trends Report' },
    { value: 'custom', label: 'Custom Report' }
  ];

  const availableMetrics = [
    { id: 'user-growth', label: 'User Growth' },
    { id: 'booking-volume', label: 'Booking Volume' },
    { id: 'revenue-trends', label: 'Revenue Trends' },
    { id: 'space-utilization', label: 'Space Utilization' },
    { id: 'conversion-rates', label: 'Conversion Rates' },
    { id: 'customer-satisfaction', label: 'Customer Satisfaction' }
  ];

  const formatOptions = [
    { value: 'pdf', label: 'PDF' },
    { value: 'csv', label: 'CSV' },
    { value: 'excel', label: 'Excel' }
  ];

  const frequencyOptions = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const handleMetricToggle = (metricId) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleGenerateReport = () => {
    const reportConfig = {
      template: selectedTemplate,
      metrics: selectedMetrics,
      format: reportFormat,
      schedule: scheduleEnabled ? {
        enabled: true,
        frequency: scheduleFrequency
      } : { enabled: false }
    };
    
    onGenerateReport(reportConfig);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center space-x-2 mb-6">
        <Icon name="FileText" size={24} className="text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Report Generator</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Select
            label="Report Template"
            options={reportTemplates}
            value={selectedTemplate}
            onChange={setSelectedTemplate}
            placeholder="Select a template"
          />

          {selectedTemplate === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Select Metrics
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableMetrics.map((metric) => (
                  <Checkbox
                    key={metric.id}
                    label={metric.label}
                    checked={selectedMetrics.includes(metric.id)}
                    onChange={() => handleMetricToggle(metric.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <Select
            label="Export Format"
            options={formatOptions}
            value={reportFormat}
            onChange={setReportFormat}
          />
        </div>

        <div className="space-y-4">
          <div>
            <Checkbox
              label="Schedule Automated Reports"
              checked={scheduleEnabled}
              onChange={(e) => setScheduleEnabled(e.target.checked)}
            />
          </div>

          {scheduleEnabled && (
            <Select
              label="Frequency"
              options={frequencyOptions}
              value={scheduleFrequency}
              onChange={setScheduleFrequency}
            />
          )}

          <div className="pt-4">
            <Button
              variant="default"
              onClick={handleGenerateReport}
              disabled={!selectedTemplate}
              iconName="Download"
              iconPosition="left"
              fullWidth
            >
              Generate Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;