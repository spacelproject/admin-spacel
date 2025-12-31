import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminSidebar from '../../components/ui/AdminSidebar';
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation';
import UserProfileDropdown from '../../components/ui/UserProfileDropdown';
import NotificationBell from '../../components/NotificationBell';
import Button from '../../components/ui/Button';
import useSupportAgents from '../../hooks/useSupportAgents';
import useSupportTickets from '../../hooks/useSupportTickets';
import useSupportStats from '../../hooks/useSupportStats';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';

import SupportStats from './components/SupportStats';
import TicketFilters from './components/TicketFilters';
import TicketTable from './components/TicketTable';
import TicketDetailModal from './components/TicketDetailModal';
import AssignmentPanel from './components/AssignmentPanel';

const SupportTicketSystem = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();
  const { supportAgents, loading: agentsLoading } = useSupportAgents();
  const { tickets: allTickets, loading: ticketsLoading, refetch: refetchTickets } = useSupportTickets();
  const { avgResponseTime } = useSupportStats(allTickets);
  const [selectedTickets, setSelectedTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('open'); // 'all', 'open', 'resolved'
  const [filters, setFilters] = useState({
    search: '',
    priority: 'all',
    category: 'all',
    assignee: 'all',
    dateFrom: '',
    dateTo: ''
  });

  // Calculate stats from real data
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const total = allTickets.length;
    const open = allTickets.filter(t => ['open', 'pending', 'in-progress'].includes(t.status)).length;
    const resolvedToday = allTickets.filter(t => 
      t.status === 'resolved' && new Date(t.lastUpdated) >= todayStart
    ).length;
    const unassigned = allTickets.filter(t => !t.assignee).length;

    // Satisfaction rate - would come from ticket ratings if available
    const satisfactionRate = 94

    return {
      total,
      open,
      resolvedToday,
      avgResponseTime,
      satisfactionRate,
      unassigned
    };
  }, [allTickets, avgResponseTime]);

  // Calculate ticket counts by priority for filters
  const ticketCounts = useMemo(() => {
    return {
      urgent: allTickets.filter(t => t.priority === 'urgent').length,
      high: allTickets.filter(t => t.priority === 'high').length,
      medium: allTickets.filter(t => t.priority === 'medium').length,
      low: allTickets.filter(t => t.priority === 'low').length,
      unassigned: allTickets.filter(t => !t.assignee).length
    };
  }, [allTickets]);

  // Normalize category variations to standard codes
  const normalizeCategory = (categoryValue) => {
    if (!categoryValue) return null
    
    const normalized = categoryValue.toLowerCase().trim()
    
    // Map variations to standard codes
    const categoryMappings = {
      'billing/payments': 'billing',
      'billing & payments': 'billing',
      'billing and payments': 'billing',
      'payment': 'payment',
      'payment processing': 'payment',
      'account': 'account',
      'account & access': 'account',
      'account and access': 'account',
      'booking': 'booking',
      'booking issues': 'booking',
      'space': 'space',
      'space management': 'space',
      'general': 'general',
      'general inquiry': 'general',
      'technical': 'technical',
      'technical support': 'technical',
      'refund': 'refund',
      'refunds': 'refund',
      'other': 'other'
    }
    
    return categoryMappings[normalized] || normalized
  }

  // Filter tickets based on active tab and filters
  const filteredTickets = useMemo(() => {
    let filtered = allTickets;

    // Apply tab filter first
    if (activeTab === 'open') {
      filtered = filtered.filter(ticket => ['open', 'pending', 'in-progress'].includes(ticket.status));
    } else if (activeTab === 'resolved') {
      filtered = filtered.filter(ticket => ['resolved', 'closed'].includes(ticket.status));
    }
    // 'all' shows everything

    // Apply other filters
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

    // Apply category filter (handles variations)
    if (filters.category !== 'all') {
      filtered = filtered.filter(ticket => {
        if (!ticket.category) return false
        
        // Normalize both the ticket category and filter value
        const ticketCategoryNormalized = normalizeCategory(ticket.category)
        const filterCategoryNormalized = normalizeCategory(filters.category)
        
        // Match normalized values or exact match
        return ticketCategoryNormalized === filterCategoryNormalized ||
               ticket.category.toLowerCase() === filters.category.toLowerCase() ||
               ticket.category === filters.category
      });
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

    return filtered;
  }, [allTickets, filters, activeTab]);

  const handleTicketSelect = (ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
    // Update URL to include ticket parameter
    setSearchParams({ ticket: ticket.dbId || ticket.id });
  };

  // Handle URL query parameter to open ticket modal
  useEffect(() => {
    const ticketId = searchParams.get('ticket');
    if (ticketId && allTickets.length > 0 && !selectedTicket) {
      const ticket = allTickets.find(t => (t.dbId === ticketId) || (t.id === ticketId));
      if (ticket) {
        setSelectedTicket(ticket);
        setIsDetailModalOpen(true);
      }
    }
  }, [searchParams, allTickets, selectedTicket]);

  // Clean up URL when modal closes
  useEffect(() => {
    if (!isDetailModalOpen && !selectedTicket) {
      const ticketId = searchParams.get('ticket');
      if (ticketId) {
        setSearchParams({});
      }
    }
  }, [isDetailModalOpen, selectedTicket, searchParams, setSearchParams]);

  const handleTicketUpdate = (updatedTicket) => {
    // The real-time subscription will handle the update
    refetchTickets();
    setIsDetailModalOpen(false);
    setSelectedTicket(null);
  };

  const handleBulkAction = async (action, value) => {
    if (selectedTickets.length === 0) return;

    try {
      // Find dbIds for selected tickets
      const selectedTicketObjects = allTickets.filter(t => selectedTickets.includes(t.id));
      const dbIds = selectedTicketObjects.map(t => t.dbId);
      const count = dbIds.length;

      if (action === 'assign' && value) {
        // Bulk assign tickets
        const { error } = await supabase
          .from('support_tickets')
          .update({ assigned_to: value, updated_at: new Date().toISOString() })
          .in('id', dbIds);

        if (error) throw error;
        
        // Find agent name for success message
        const agent = supportAgents.find(a => a.id === value);
        const agentName = agent ? agent.name : 'support agent';
        showToast(`${count} ticket(s) assigned to ${agentName} successfully`, 'success');
      } else if (action === 'status' && value) {
        // Bulk update status
        const { error } = await supabase
          .from('support_tickets')
          .update({ status: value, updated_at: new Date().toISOString() })
          .in('id', dbIds);

        if (error) throw error;
        showToast(`${count} ticket(s) status updated to ${value} successfully`, 'success');
      } else if (action === 'priority' && value) {
        // Bulk update priority
        const { error } = await supabase
          .from('support_tickets')
          .update({ priority: value, updated_at: new Date().toISOString() })
          .in('id', dbIds);

        if (error) throw error;
        showToast(`${count} ticket(s) priority updated to ${value} successfully`, 'success');
      }

    setSelectedTickets([]);
      // Real-time subscription will update the UI
    } catch (error) {
      console.error('Error performing bulk action:', error);
      showToast('Failed to perform bulk action. Please try again.', 'error');
    }
  };

  const handleAssignTickets = async (agentId) => {
    if (selectedTickets.length === 0) {
      showToast('Please select tickets to assign', 'warning');
      return;
    }

    if (agentId === 'auto') {
      // Auto-assign: assign to agent with least active tickets
      if (supportAgents.length === 0) {
        showToast('No support agents available', 'warning');
        return;
      }

      const sortedAgents = [...supportAgents].sort((a, b) => a.activeTickets - b.activeTickets);
      agentId = sortedAgents[0].id;
    }

    await handleBulkAction('assign', agentId);
  };

  const handleExportTickets = () => {
    // Convert filtered tickets to CSV
    const headers = ['Ticket ID', 'Subject', 'User', 'Email', 'Category', 'Priority', 'Status', 'Assignee', 'Created', 'Updated'];
    const rows = filteredTickets.map(ticket => [
      ticket.id,
      ticket.subject,
      ticket.user.name,
      ticket.user.email,
      ticket.category,
      ticket.priority,
      ticket.status,
      ticket.assignee?.name || 'Unassigned',
      ticket.createdAt.toLocaleDateString(),
      ticket.lastUpdated.toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `support_tickets_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`${filteredTickets.length} ticket(s) exported successfully`, 'success');
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
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <UserProfileDropdown />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <BreadcrumbNavigation />
            
            {/* Stats Overview */}
            <SupportStats stats={stats} />
            
            {/* Assignment Panel */}
            <AssignmentPanel
              supportAgents={supportAgents}
              onAssignTickets={handleAssignTickets}
              loading={agentsLoading}
            />
            
            {/* Filters */}
            <TicketFilters
              filters={filters}
              onFiltersChange={setFilters}
              ticketCounts={ticketCounts}
              supportAgents={supportAgents}
            />
            
            {/* Tabs and Results Header */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-border bg-muted/30">
                <div className="flex space-x-1 px-6 pt-4">
                  <button
                    onClick={() => setActiveTab('open')}
                    className={`px-6 py-3 text-sm font-medium transition-smooth border-b-2 ${
                      activeTab === 'open'
                        ? 'text-primary border-primary'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    Open Tickets ({allTickets.filter(t => ['open', 'pending', 'in-progress'].includes(t.status)).length})
                  </button>
                  <button
                    onClick={() => setActiveTab('resolved')}
                    className={`px-6 py-3 text-sm font-medium transition-smooth border-b-2 ${
                      activeTab === 'resolved'
                        ? 'text-primary border-primary'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    Resolved ({allTickets.filter(t => ['resolved', 'closed'].includes(t.status)).length})
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-6 py-3 text-sm font-medium transition-smooth border-b-2 ${
                      activeTab === 'all'
                        ? 'text-primary border-primary'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    All Tickets ({allTickets.length})
                  </button>
                </div>
              </div>
            
            {/* Results Header */}
              <div className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <h2 className="text-lg font-semibold text-foreground">
                      {activeTab === 'open' ? 'Open Tickets' : activeTab === 'resolved' ? 'Resolved Tickets' : 'All Tickets'} ({filteredTickets.length})
                  </h2>
                  {selectedTickets.length > 0 && (
                      <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {selectedTickets.length} selected
                    </span>
                  )}
                </div>
                
                  <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="RefreshCw"
                      onClick={refetchTickets}
                      disabled={ticketsLoading}
                    className="hidden sm:flex"
                  >
                    Refresh
                  </Button>
                  
                  {/* Mobile buttons */}
                  <Button
                    variant="outline"
                    size="sm"
                    iconName="RefreshCw"
                      onClick={refetchTickets}
                      disabled={ticketsLoading}
                    className="sm:hidden"
                  />
                </div>
              </div>
            </div>
            
            {/* Tickets Table */}
              {ticketsLoading ? (
                <div className="p-12 text-center">
                  <p className="text-muted-foreground">Loading tickets...</p>
                </div>
              ) : (
            <TicketTable
              tickets={filteredTickets}
              onTicketSelect={handleTicketSelect}
              onBulkAction={handleBulkAction}
              selectedTickets={selectedTickets}
              onTicketSelectionChange={setSelectedTickets}
                  supportAgents={supportAgents}
            />
              )}
            </div>
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
          // Remove ticket parameter from URL
          setSearchParams({});
        }}
        onUpdate={handleTicketUpdate}
      />
    </div>
  );
};

export default SupportTicketSystem;