import React, { useState, useMemo } from 'react';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import { Checkbox } from '../../../components/ui/Checkbox';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const TicketTable = ({ tickets, onTicketSelect, onBulkAction, selectedTickets, onTicketSelectionChange, selectable = true, supportAgents = [], showAssignee = true }) => {
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

  const assigneeOptions = supportAgents.map(agent => ({
    value: agent.id,
    label: agent.name
  }));

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

  // Sort tickets based on sortConfig
  const sortedTickets = useMemo(() => {
    const sorted = [...tickets];
    
    sorted.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'user':
          aValue = a.user.name.toLowerCase();
          bValue = b.user.name.toLowerCase();
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority] || 0;
          bValue = priorityOrder[b.priority] || 0;
          break;
        case 'lastUpdated':
          aValue = a.lastUpdated.getTime();
          bValue = b.lastUpdated.getTime();
          break;
        case 'subject':
          aValue = a.subject.toLowerCase();
          bValue = b.subject.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [tickets, sortConfig]);

  const isAllSelected = selectedTickets.length === tickets.length && tickets.length > 0;
  const isIndeterminate = selectedTickets.length > 0 && selectedTickets.length < tickets.length;

  return (
    <div className="overflow-hidden">
      {/* Bulk Actions Bar */}
      {selectable && selectedTickets.length > 0 && (
        <div className="bg-muted border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {selectedTickets.length} ticket{selectedTickets.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
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
        <table className="w-full table-fixed">
          <colgroup>
            {selectable && <col className="w-12" />}
            <col className="w-32" />
            <col className="w-48" />
            <col className="w-64" />
            <col className="w-32" />
            <col className="w-28" />
            {showAssignee && <col className="w-40" />}
            <col className="w-36" />
            <col className="w-20" />
          </colgroup>
          <thead className="bg-muted border-b border-border">
            <tr>
              {selectable && (
                <th className="px-6 py-4">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isIndeterminate}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
              )}
              <th className="text-left px-6 py-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('id')}
                  className="flex items-center gap-2 hover:text-primary transition-smooth"
                >
                  <span>Ticket ID</span>
                  <Icon name={getSortIcon('id')} size={16} />
                </button>
              </th>
              <th className="text-left px-6 py-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('user')}
                  className="flex items-center gap-2 hover:text-primary transition-smooth"
                >
                  <span>User</span>
                  <Icon name={getSortIcon('user')} size={16} />
                </button>
              </th>
              <th className="text-left px-6 py-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('subject')}
                  className="flex items-center gap-2 hover:text-primary transition-smooth"
                >
                  <span>Subject</span>
                  <Icon name={getSortIcon('subject')} size={16} />
                </button>
              </th>
              <th className="text-left px-6 py-4 font-medium text-foreground">Category</th>
              <th className="text-left px-6 py-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('priority')}
                  className="flex items-center gap-2 hover:text-primary transition-smooth"
                >
                  <span>Priority</span>
                  <Icon name={getSortIcon('priority')} size={16} />
                </button>
              </th>
              {showAssignee && (
                <th className="text-left px-6 py-4 font-medium text-foreground">Assignee</th>
              )}
              <th className="text-left px-6 py-4 font-medium text-foreground">
                <button
                  onClick={() => handleSort('lastUpdated')}
                  className="flex items-center gap-2 hover:text-primary transition-smooth"
                >
                  <span>Last Updated</span>
                  <Icon name={getSortIcon('lastUpdated')} size={16} />
                </button>
              </th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {sortedTickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="border-b border-border hover:bg-muted/50 transition-smooth cursor-pointer"
                onClick={() => onTicketSelect(ticket)}
              >
                {selectable && (
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedTickets.includes(ticket.id)}
                      onChange={(e) => handleTicketSelection(ticket.id, e.target.checked)}
                    />
                  </td>
                )}
                <td className="px-6 py-4">
                  <span className="font-mono text-sm text-primary">#{ticket.id}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Image
                      src={ticket.user.avatar}
                      alt={ticket.user.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium text-foreground">{ticket.user.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-foreground truncate max-w-xs">{ticket.subject}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-muted-foreground capitalize">{ticket.category}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${priorityColors[ticket.priority]}`}>
                    {ticket.priority}
                  </span>
                </td>
                {showAssignee && (
                  <td className="px-6 py-4">
                    {ticket.assignee ? (
                      <div className="flex items-center gap-2">
                        <Image
                          src={ticket.assignee.avatar}
                          alt={ticket.assignee.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="text-sm text-foreground">{ticket.assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </td>
                )}
                <td className="px-6 py-4">
                  <span className="text-sm text-muted-foreground">{formatDate(ticket.lastUpdated)}</span>
                </td>
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
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
        {sortedTickets.map((ticket) => (
          <div
            key={ticket.id}
            className="border-b border-border p-6 hover:bg-muted/50 transition-smooth cursor-pointer"
            onClick={() => onTicketSelect(ticket)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedTickets.includes(ticket.id)}
                  onChange={(e) => handleTicketSelection(ticket.id, e.target.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="font-mono text-sm text-primary">#{ticket.id}</span>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${priorityColors[ticket.priority]}`}>
                  {ticket.priority}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <Image
                src={ticket.user.avatar}
                alt={ticket.user.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="font-medium text-foreground">{ticket.user.name}</p>
              </div>
            </div>

            <h4 className="font-medium text-foreground mb-3">{ticket.subject}</h4>
            
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <span className="capitalize">{ticket.category}</span>
              <span>{formatDate(ticket.lastUpdated)}</span>
            </div>

            {showAssignee && ticket.assignee && (
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <Image
                  src={ticket.assignee.avatar}
                  alt={ticket.assignee.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="text-sm text-foreground">Assigned to {ticket.assignee.name}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {sortedTickets.length === 0 && (
        <div className="text-center py-16 px-6">
          <Icon name="Inbox" size={48} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No tickets found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search criteria.</p>
        </div>
      )}
    </div>
  );
};

export default TicketTable;