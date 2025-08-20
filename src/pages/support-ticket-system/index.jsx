import React, { useState, useEffect } from 'react';
import AdminSidebar from '../../components/ui/AdminSidebar';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import Button from '../../components/ui/Button';

import SupportStats from './components/SupportStats';
import TicketFilters from './components/TicketFilters';
import TicketTable from './components/TicketTable';
import TicketDetailModal from './components/TicketDetailModal';
import AssignmentPanel from './components/AssignmentPanel';

const SupportTicketSystem = () => {
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    priority: 'all',
    category: 'all',
    status: 'all',
    assignee: 'all',
    dateFrom: '',
    dateTo: ''
  });

  // Mock data
  const mockStats = {
    total: 1247,
    open: 89,
    resolvedToday: 34,
    avgResponseTime: '2.3h',
    satisfactionRate: 94,
    unassigned: 12
  };

  const mockTicketCounts = {
    urgent: 8,
    high: 23,
    medium: 45,
    low: 13,
    unassigned: 12
  };

  const mockSupportAgents = [
    {
      id: 'sarah-johnson',
      name: 'Sarah Johnson',
      role: 'Senior Support Specialist',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e0b434?w=150',
      status: 'online',
      activeTickets: 8,
      avgResponseTime: '1.8h',
      satisfactionRate: 96
    },
    {
      id: 'mike-chen',
      name: 'Mike Chen',
      role: 'Technical Support Lead',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      status: 'online',
      activeTickets: 12,
      avgResponseTime: '2.1h',
      satisfactionRate: 94
    },
    {
      id: 'emily-davis',
      name: 'Emily Davis',
      role: 'Customer Success Manager',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      status: 'busy',
      activeTickets: 15,
      avgResponseTime: '2.5h',
      satisfactionRate: 98
    },
    {
      id: 'alex-rodriguez',
      name: 'Alex Rodriguez',
      role: 'Support Specialist',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      status: 'online',
      activeTickets: 6,
      avgResponseTime: '1.9h',
      satisfactionRate: 92
    }
  ];

  const mockTickets = [
    {
      id: 'TK-2024-156',
      user: {
        name: 'Emma Thompson',
        email: 'emma.thompson@email.com',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e0b434?w=150'
      },
      subject: 'Unable to complete booking payment',
      category: 'billing',
      priority: 'high',
      status: 'open',
      assignee: mockSupportAgents[0],
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      lastUpdated: new Date(Date.now() - 30 * 60 * 1000),
      description: `I'm trying to book a conference room for next week but the payment keeps failing. I've tried multiple credit cards and the issue persists. Can you please help me complete this booking?`
    },
    {
      id: 'TK-2024-155',
      user: {
        name: 'James Wilson',
        email: 'james.wilson@company.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      },
      subject: 'Space listing not appearing in search results',
      category: 'technical',
      priority: 'medium',
      status: 'in-progress',
      assignee: mockSupportAgents[1],
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      lastUpdated: new Date(Date.now() - 45 * 60 * 1000),
      description: `I published my office space listing yesterday but it's not showing up in search results. I've checked all the settings and everything seems correct.`
    },
    {
      id: 'TK-2024-154',
      user: {
        name: 'Sarah Martinez',
        email: 'sarah.martinez@startup.io',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
      },
      subject: 'Refund request for cancelled booking',
      category: 'billing',
      priority: 'urgent',
      status: 'pending',
      assignee: mockSupportAgents[2],
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      lastUpdated: new Date(Date.now() - 15 * 60 * 1000),
      description: `I had to cancel my booking due to an emergency and was told I would receive a full refund. It's been 5 business days and I haven't received the refund yet.`
    },
    {
      id: 'TK-2024-153',
      user: {
        name: 'Michael Brown',
        email: 'michael.brown@email.com',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'
      },
      subject: 'How to update space availability calendar?',
      category: 'general',
      priority: 'low',
      status: 'resolved',
      assignee: mockSupportAgents[3],
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      lastUpdated: new Date(Date.now() - 2 * 60 * 60 * 1000),
      description: `I need help understanding how to update my space availability calendar. The interface is a bit confusing and I want to make sure I'm doing it correctly.`
    },
    {
      id: 'TK-2024-152',
      user: {
        name: 'Lisa Chen',email: 'lisa.chen@design.com',avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e0b434?w=150'
      },
      subject: 'Account verification issues',category: 'technical',priority: 'high',status: 'open',assignee: null,createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),lastUpdated: new Date(Date.now() - 4 * 60 * 60 * 1000),description: `I'm unable to verify my account. I've clicked the verification link multiple times but it keeps saying the link is invalid or expired.`
    },
    {
      id: 'TK-2024-151',
      user: {
        name: 'David Rodriguez',email: 'david.rodriguez@tech.com',avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      },
      subject: 'Commission rate inquiry',category: 'billing',priority: 'medium',status: 'closed',
      assignee: mockSupportAgents[0],
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      lastUpdated: new Date(Date.now() - 20 * 60 * 60 * 1000),
      description: `I have questions about the commission rates for my space listings. Can you provide more details about how the pricing structure works?`
    }
  ];

  const [tickets, setTickets] = useState(mockTickets);
  const [filteredTickets, setFilteredTickets] = useState(mockTickets);

  // Filter tickets based on current filters
  useEffect(() => {
    let filtered = tickets;

    if (filters.search) {
      filtered = filtered.filter(ticket =>
        ticket.id.toLowerCase().includes(filters.search.toLowerCase()) ||
        ticket.user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        ticket.subject.toLowerCase().includes(filters.search.toLowerCase()) ||
        ticket.user.email.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === filters.priority);
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(ticket => ticket.category === filters.category);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === filters.status);
    }

    if (filters.assignee !== 'all') {
      if (filters.assignee === 'unassigned') {
        filtered = filtered.filter(ticket => !ticket.assignee);
      } else {
        filtered = filtered.filter(ticket => ticket.assignee?.id === filters.assignee);
      }
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(ticket => ticket.createdAt >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(ticket => ticket.createdAt <= toDate);
    }

    setFilteredTickets(filtered);
  }, [filters, tickets]);

  const handleTicketSelect = (ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  };

  const handleTicketUpdate = (updatedTicket) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      )
    );
    setIsDetailModalOpen(false);
    setSelectedTicket(null);
  };

  const handleBulkAction = (action, value) => {
    console.log(`Bulk action: ${action} with value: ${value} for tickets:`, selectedTickets);
    // Implement bulk action logic here
    setSelectedTickets([]);
  };

  const handleAssignTickets = (agentId) => {
    if (agentId === 'auto') {
      // Auto-assign logic
      console.log('Auto-assigning tickets');
    } else {
      // Manual assign logic
      console.log('Assigning tickets to agent:', agentId);
    }
  };

  const handleExportTickets = () => {
    console.log('Exporting tickets...');
    // Implement export functionality
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      
      <div className="lg:ml-sidebar">
        {/* Header */}
        <header className="h-header bg-header-background border-b border-header-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-header">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-header-foreground">Support Ticket System</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTickets}
              iconName="Download"
              iconPosition="left"
              className="hidden sm:flex"
            >
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTickets}
              iconName="Download"
              className="sm:hidden"
            />
            <UserProfileDropdown />
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 lg:p-6 space-y-6">
          <div className="max-w-7xl mx-auto">
            <BreadcrumbNavigation />
            
            {/* Stats Overview */}
            <SupportStats stats={mockStats} />
            
            {/* Assignment Panel */}
            <AssignmentPanel
              supportAgents={mockSupportAgents}
              onAssignTickets={handleAssignTickets}
            />
            
            {/* Filters */}
            <TicketFilters
              filters={filters}
              onFiltersChange={setFilters}
              ticketCounts={mockTicketCounts}
            />
            
            {/* Results Header */}
            <div className="bg-card rounded-lg border border-border p-4 lg:p-6 card-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Support Tickets ({filteredTickets.length})
                  </h2>
                  {selectedTickets.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedTickets.length} selected
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="RefreshCw"
                    onClick={() => window.location.reload()}
                    className="hidden sm:flex"
                  >
                    Refresh
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="Filter"
                    className="hidden sm:flex"
                  >
                    Advanced Filters
                  </Button>
                  
                  {/* Mobile buttons */}
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="RefreshCw"
                    onClick={() => window.location.reload()}
                    className="sm:hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="Filter"
                    className="sm:hidden"
                  />
                </div>
              </div>
            </div>
            
            {/* Tickets Table */}
            <TicketTable
              tickets={filteredTickets}
              onTicketSelect={handleTicketSelect}
              onBulkAction={handleBulkAction}
              selectedTickets={selectedTickets}
              onTicketSelectionChange={setSelectedTickets}
            />
          </div>
        </main>
      </div>

      {/* Ticket Detail Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTicket(null);
        }}
        onUpdate={handleTicketUpdate}
      />
    </div>
  );
};

export default SupportTicketSystem;