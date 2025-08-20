import React, { useState } from 'react';
import Select from '../../../components/ui/Select';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';


const TicketFilters = ({ filters, onFiltersChange, ticketCounts }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'billing', label: 'Billing & Payments' },
    { value: 'general', label: 'General Inquiry' },
    { value: 'booking', label: 'Booking Issues' },
    { value: 'space', label: 'Space Management' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  const assigneeOptions = [
    { value: 'all', label: 'All Assignees' },
    { value: 'unassigned', label: 'Unassigned' },
    { value: 'sarah-johnson', label: 'Sarah Johnson' },
    { value: 'mike-chen', label: 'Mike Chen' },
    { value: 'emily-davis', label: 'Emily Davis' },
    { value: 'alex-rodriguez', label: 'Alex Rodriguez' }
  ];

  const handleFilterChange = (key, value) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const handleDateChange = (key, value) => {
    const updatedFilters = { ...localFilters, [key]: value };
    setLocalFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      priority: 'all',
      category: 'all',
      status: 'all',
      assignee: 'all',
      dateFrom: '',
      dateTo: ''
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(localFilters).some(value => 
    value !== '' && value !== 'all'
  );

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Filter Tickets</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            iconName="X"
            iconPosition="left"
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Input
          type="search"
          placeholder="Search tickets, users..."
          value={localFilters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
        />

        <Select
          options={priorityOptions}
          value={localFilters.priority}
          onChange={(value) => handleFilterChange('priority', value)}
          placeholder="Select priority"
        />

        <Select
          options={categoryOptions}
          value={localFilters.category}
          onChange={(value) => handleFilterChange('category', value)}
          placeholder="Select category"
        />

        <Select
          options={statusOptions}
          value={localFilters.status}
          onChange={(value) => handleFilterChange('status', value)}
          placeholder="Select status"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Select
          options={assigneeOptions}
          value={localFilters.assignee}
          onChange={(value) => handleFilterChange('assignee', value)}
          placeholder="Select assignee"
        />

        <Input
          type="date"
          label="From Date"
          value={localFilters.dateFrom}
          onChange={(e) => handleDateChange('dateFrom', e.target.value)}
        />

        <Input
          type="date"
          label="To Date"
          value={localFilters.dateTo}
          onChange={(e) => handleDateChange('dateTo', e.target.value)}
        />
      </div>

      {/* Ticket Counts */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-sm text-muted-foreground">
            Urgent: <span className="font-medium text-foreground">{ticketCounts.urgent}</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
          <span className="text-sm text-muted-foreground">
            High: <span className="font-medium text-foreground">{ticketCounts.high}</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <span className="text-sm text-muted-foreground">
            Medium: <span className="font-medium text-foreground">{ticketCounts.medium}</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm text-muted-foreground">
            Low: <span className="font-medium text-foreground">{ticketCounts.low}</span>
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
          <span className="text-sm text-muted-foreground">
            Unassigned: <span className="font-medium text-foreground">{ticketCounts.unassigned}</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default TicketFilters;