import React, { useState } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const TicketTable = ({ tickets, onTicketSelect, onBulkAction, selectedTickets, onTicketSelectionChange }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'lastUpdated', direction: 'desc' });

  const priorityColors = {
    urgent: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200'
  };

  const statusColors = {
    open: 'bg-blue-100 text-blue-800 border-blue-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'in-progress': 'bg-purple-100 text-purple-800 border-purple-200',
    resolved: 'bg-green-100 text-green-800 border-green-200',
    closed: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const assigneeOptions = [
    { value: 'sarah-johnson', label: 'Sarah Johnson' },
    { value: 'mike-chen', label: 'Mike Chen' },
    { value: 'emily-davis', label: 'Emily Davis' },
    { value: 'alex-rodriguez', label: 'Alex Rodriguez' }
  ];

  const statusOptions = [
    { value: 'open', label: 'Open' },
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      onTicketSelectionChange(tickets.map(ticket => ticket.id));
    } else {
      onTicketSelectionChange([]);
    }
  };

  const handleTicketSelection = (ticketId, checked) => {
    if (checked) {
      onTicketSelectionChange([...selectedTickets, ticketId]);
    } else {
      onTicketSelectionChange(selectedTickets.filter(id => id !== ticketId));
    }
  };

  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return 'ArrowUpDown';
    return sortConfig.direction === 'asc' ? 'ArrowUp' : 'ArrowDown';
  };

  const isAllSelected = selectedTickets.length === tickets.length && tickets.length > 0;
  const isIndeterminate = selectedTickets.length > 0 && selectedTickets.length < tickets.length;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Bulk Actions Bar */}
      {selectedTickets.length > 0 && (
        <div className="bg-muted border-b border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {selectedTickets.length} ticket{selectedTickets.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <Select
                options={assigneeOptions}
                placeholder="Assign to..."
                onChange={(value) => onBulkAction('assign', value)}
                className="w-40"
              />
              <Select
                options={statusOptions}
                placeholder="Change status..."
                onChange={(value) => onBulkAction('status', value)}
                className="w-40"
              />
              <Select
                options={priorityOptions}
                placeholder="Set priority..."
                onChange={(value) => onBulkAction('priority', value)}
                className="w-40"
              />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-border">
            <tr>
              <th className="w-12 p-4">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('id')}
                  className="flex items-center space-x-1 hover:text-primary transition-smooth"
                >
                  <span>Ticket ID</span>
                  <Icon name={getSortIcon('id')} size={16} />
                </button>
              </th>
              <th className="text-left p-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('user')}
                  className="flex items-center space-x-1 hover:text-primary transition-smooth"
                >
                  <span>User</span>
                  <Icon name={getSortIcon('user')} size={16} />
                </button>
              </th>
              <th className="text-left p-4 font-medium text-foreground">Subject</th>
              <th className="text-left p-4 font-medium text-foreground">Category</th>
              <th className="text-left p-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('priority')}
                  className="flex items-center space-x-1 hover:text-primary transition-smooth"
                >
                  <span>Priority</span>
                  <Icon name={getSortIcon('priority')} size={16} />
                </button>
              </th>
              <th className="text-left p-4 font-medium text-foreground">Status</th>
              <th className="text-left p-4 font-medium text-foreground">Assignee</th>
              <th className="text-left p-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('lastUpdated')}
                  className="flex items-center space-x-1 hover:text-primary transition-smooth"
                >
                  <span>Last Updated</span>
                  <Icon name={getSortIcon('lastUpdated')} size={16} />
                </button>
              </th>
              <th className="w-20 p-4"></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-b border-border hover:bg-muted/50 transition-smooth cursor-pointer"
                onClick={() => onTicketSelect(ticket)}
              >
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedTickets.includes(ticket.id)}
                    onChange={(e) => handleTicketSelection(ticket.id, e.target.checked)}
                  />
                </td>
                <td className="p-4">
                  <span className="font-mono text-sm text-primary">#{ticket.id}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-3">
                    <Image
                      src={ticket.user.avatar}
                      alt={ticket.user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-foreground">{ticket.user.name}</p>
                      <p className="text-sm text-muted-foreground">{ticket.user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="font-medium text-foreground truncate max-w-xs">{ticket.subject}</p>
                </td>
                <td className="p-4">
                  <span className="text-sm text-muted-foreground capitalize">{ticket.category}</span>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityColors[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[ticket.status]}`}>
                    {ticket.status.replace('-', ' ')}
                  </span>
                </td>
                <td className="p-4">
                  {ticket.assignee ? (
                    <div className="flex items-center space-x-2">
                      <Image
                        src={ticket.assignee.avatar}
                        alt={ticket.assignee.name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-sm text-foreground">{ticket.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </td>
                <td className="p-4">
                  <span className="text-sm text-muted-foreground">{formatDate(ticket.lastUpdated)}</span>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconName="MoreHorizontal"
                    onClick={() => onTicketSelect(ticket)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Cards */}
      <div className="lg:hidden">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            className="border-b border-border p-4 hover:bg-muted/50 transition-smooth cursor-pointer"
            onClick={() => onTicketSelect(ticket)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Checkbox
                  checked={selectedTickets.includes(ticket.id)}
                  onChange={(e) => handleTicketSelection(ticket.id, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="font-mono text-sm text-primary">#{ticket.id}</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${priorityColors[ticket.priority]}`}>
                  {ticket.priority}
                </span>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${statusColors[ticket.status]}`}>
                {ticket.status.replace('-', ' ')}
              </span>
            </div>

            <div className="flex items-center space-x-3 mb-3">
              <Image
                src={ticket.user.avatar}
                alt={ticket.user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="font-medium text-foreground">{ticket.user.name}</p>
                <p className="text-sm text-muted-foreground">{ticket.user.email}</p>
              </div>
            </div>

            <h4 className="font-medium text-foreground mb-2">{ticket.subject}</h4>
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="capitalize">{ticket.category}</span>
              <span>{formatDate(ticket.lastUpdated)}</span>
            </div>

            {ticket.assignee && (
              <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-border">
                <Image
                  src={ticket.assignee.avatar}
                  alt={ticket.assignee.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
                <span className="text-sm text-foreground">Assigned to {ticket.assignee.name}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {tickets.length === 0 && (
        <div className="text-center py-12">
          <Icon name="Inbox" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No tickets found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
        </div>
      )}
    </div>
  );
};

export default TicketTable;