import React, { useEffect, useState, useMemo, useCallback } from 'react'
import UserProfileDropdown from '../../components/ui/UserProfileDropdown'
import BreadcrumbNavigation from '../../components/ui/BreadcrumbNavigation'
import SupportSidebar from '../../components/ui/SupportSidebar'
import TicketTable from '../support-ticket-system/components/TicketTable'
import SupportTicketDetailModal from './components/SupportTicketDetailModal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Icon from '../../components/AppIcon'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

const SupportAgentTickets = () => {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [ticketReplies, setTicketReplies] = useState({})
  const [activeTab, setActiveTab] = useState('open') // 'open', 'resolved', 'all'

  const stats = useMemo(() => {
    const now = new Date()
    const isSameDay = (d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    const myOpen = tickets.filter(t => ['open', 'pending', 'in-progress'].includes(t.status)).length
    const resolvedToday = tickets.filter(t => t.status === 'resolved' && isSameDay(t.lastUpdated)).length
    
    // Calculate avg response time: time between user message and agent response
    let totalResponseTime = 0
    let responseCount = 0
    tickets.forEach(ticket => {
      const replies = ticketReplies[ticket.dbId] || []
      // Find pairs where user sent a message and then agent responded
      for (let i = 0; i < replies.length; i++) {
        const reply = replies[i]
        // If this is a user reply (no admin_id)
        if (!reply.admin_id && reply.user_id) {
          // Look for next agent reply
          for (let j = i + 1; j < replies.length; j++) {
            const nextReply = replies[j]
            if (nextReply.admin_id === user?.id) {
              // Found agent response after user message
              const responseTime = new Date(nextReply.created_at) - new Date(reply.created_at)
              totalResponseTime += responseTime
              responseCount++
              break // Only count first response
            }
          }
        }
      }
    })
    const avgResponseTime = responseCount > 0 
      ? `${Math.round(totalResponseTime / responseCount / 60000)}m`
      : '-'
    
    // Unread count: tickets where last reply is from user (not admin)
    // Meaning there's a new user message waiting for agent response
    let unread = 0
    tickets.forEach(ticket => {
      const replies = ticketReplies[ticket.dbId] || []
      if (replies.length > 0) {
        const lastReply = replies[replies.length - 1]
        // If last reply doesn't have admin_id, it means it's from user
        // This indicates user has replied and is waiting for agent response
        if (!lastReply.admin_id && lastReply.user_id) {
          unread++
        }
      } else {
        // If no replies yet, ticket is unread (initial message needs response)
        unread++
      }
    })
    
    return { myOpen, resolvedToday, avgResponseTime, unread }
  }, [tickets, ticketReplies, user?.id])

  const fetchMyTickets = useCallback(async () => {
    if (!user?.id) {
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`id, ticket_id, subject, description, category, priority, status, assigned_to, booking_id, created_at, updated_at,
          user:profiles!support_tickets_user_id_fkey ( id, first_name, last_name, email, avatar_url )`)
        .eq('assigned_to', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        throw error
      }

      // Always set tickets array, even if empty
      if (data && data.length > 0) {
        const transformed = data.map(t => ({
          id: t.ticket_id || t.id,
          dbId: t.id,
          user: {
            id: t.user?.id,
            name: `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.trim() || 'User',
            email: t.user?.email || '',
            avatar: t.user?.avatar_url || '/assets/images/no_image.png'
          },
          subject: t.subject,
          category: t.category,
          priority: t.priority,
          status: t.status,
          assignee: null,
          createdAt: new Date(t.created_at),
          lastUpdated: new Date(t.updated_at),
          description: t.description,
          bookingId: t.booking_id || null
        }))
        setTickets(transformed)
        
        // Fetch replies for all tickets
        const ticketIds = transformed.map(t => t.dbId)
        if (ticketIds.length > 0) {
          const { data: repliesData, error: repliesError } = await supabase
            .from('support_ticket_replies')
            .select('id, ticket_id, content, created_at, user_id, admin_id')
            .in('ticket_id', ticketIds)
            .order('created_at', { ascending: true })
          
          if (repliesError) {
            console.error('Error fetching replies:', repliesError)
            // Don't fail the whole operation if replies fail
          } else if (repliesData) {
            const repliesByTicket = {}
            repliesData.forEach(reply => {
              if (!repliesByTicket[reply.ticket_id]) {
                repliesByTicket[reply.ticket_id] = []
              }
              repliesByTicket[reply.ticket_id].push(reply)
            })
            setTicketReplies(repliesByTicket)
          }
        } else {
          // No tickets, reset replies
          setTicketReplies({})
        }
      } else {
        // No tickets found - clear state
        setTickets([])
        setTicketReplies({})
      }
    } catch (err) {
      console.error('Error fetching tickets:', err)
      setError(err.message || 'Failed to load tickets. Please try again.')
      setTickets([])
      setTicketReplies({})
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      fetchMyTickets()
      
      // Realtime subscription for my tickets - optimized to update only changed items
      const ticketsChannel = supabase
        .channel('support_tickets_my_changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'support_tickets', 
          filter: `assigned_to=eq.${user.id}` 
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            // New ticket assigned - fetch to get full data
            fetchMyTickets()
          } else if (payload.eventType === 'UPDATE') {
            // Update existing ticket in state
            setTickets(prevTickets => {
              const updated = prevTickets.map(ticket => {
                if (ticket.dbId === payload.new.id) {
                  return {
                    ...ticket,
                    status: payload.new.status,
                    priority: payload.new.priority,
                    lastUpdated: new Date(payload.new.updated_at),
                    subject: payload.new.subject || ticket.subject,
                    category: payload.new.category || ticket.category
                  }
                }
                return ticket
              })
              return updated
            })
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted ticket
            setTickets(prevTickets => prevTickets.filter(t => t.dbId !== payload.old.id))
            // Also remove replies for deleted ticket
            setTicketReplies(prev => {
              const updated = { ...prev }
              delete updated[payload.old.id]
              return updated
            })
          }
        })
        .subscribe()

      // Realtime subscription for replies to my tickets
      // Refresh to update unread counts
      const repliesChannel = supabase
        .channel('support_replies_my_tickets')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'support_ticket_replies'
        }, async (payload) => {
          // Refresh to update unread counts and stats
          fetchMyTickets()
        })
        .subscribe()

      return () => { 
        ticketsChannel.unsubscribe()
        repliesChannel.unsubscribe()
      }
    }
  }, [user?.id, fetchMyTickets])

  const [selectedTickets, setSelectedTickets] = useState([])
  const [filters, setFilters] = useState({
    search: '',
    priority: 'all',
    category: 'all'
  })
  const [categories, setCategories] = useState([])

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('support_categories')
      .select('code, label')
      .eq('is_active', true)
      .order('sort_order')

    if (!error && data) {
      setCategories(data)
    }
  }

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

  // Get unique categories from actual tickets (to catch any mismatches)
  const ticketCategories = useMemo(() => {
    const uniqueCategories = [...new Set(tickets.map(t => t.category).filter(Boolean))]
    return uniqueCategories.map(cat => {
      // Normalize the category value
      const normalizedCode = normalizeCategory(cat)
      
      // Try to find matching category from support_categories
      const matched = categories.find(c => 
        c.code.toLowerCase() === normalizedCode || 
        c.label.toLowerCase() === cat.toLowerCase() ||
        normalizeCategory(c.label) === normalizedCode
      )
      
      return {
        code: normalizedCode, // Use normalized code
        originalCode: cat, // Keep original for filtering
        label: matched ? matched.label : cat // Use label from table if found, otherwise use the category value itself
      }
    })
  }, [tickets, categories])

  // Combine categories from table and tickets, removing duplicates
  const allCategories = useMemo(() => {
    const categoryMap = new Map()
    
    // Add categories from support_categories table (preferred source)
    categories.forEach(cat => {
      const key = cat.code.toLowerCase()
      categoryMap.set(key, { 
        code: cat.code, 
        label: cat.label,
        originalCodes: [cat.code] // Track variations
      })
    })
    
    // Add categories from actual tickets (may include variations)
    ticketCategories.forEach(cat => {
      const key = cat.code.toLowerCase()
      if (categoryMap.has(key)) {
        // Already exists, just add the original code to variations
        const existing = categoryMap.get(key)
        if (!existing.originalCodes.includes(cat.originalCode)) {
          existing.originalCodes.push(cat.originalCode)
        }
      } else {
        // New category from tickets
        categoryMap.set(key, { 
          code: cat.code, 
          label: cat.label,
          originalCodes: [cat.originalCode]
        })
      }
    })
    
    return Array.from(categoryMap.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [categories, ticketCategories])

  // Filter tickets based on active tab and filters
  const filteredTickets = useMemo(() => {
    let filtered = tickets

    // Apply tab filter first
    if (activeTab === 'open') {
      filtered = filtered.filter(ticket => ['open', 'pending', 'in-progress'].includes(ticket.status))
    } else if (activeTab === 'resolved') {
      filtered = filtered.filter(ticket => ['resolved', 'closed'].includes(ticket.status))
    }
    // 'all' shows everything

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(ticket =>
        ticket.id.toLowerCase().includes(searchLower) ||
        ticket.subject.toLowerCase().includes(searchLower) ||
        ticket.user.name.toLowerCase().includes(searchLower) ||
        ticket.user.email.toLowerCase().includes(searchLower)
      )
    }

    // Apply priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === filters.priority)
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
      })
    }

    return filtered
  }, [tickets, activeTab, filters])

  const handleTicketSelect = (ticket) => {
    setSelectedTicket(ticket)
    setIsDetailModalOpen(true)
  }

  const handleTicketUpdate = (updatedTicket) => {
    setTickets(prevTickets =>
      prevTickets.map(ticket =>
        ticket.id === updatedTicket.id ? { ...ticket, ...updatedTicket } : ticket
      )
    )
    // Update the selected ticket if it's the same one being updated
    if (selectedTicket && selectedTicket.id === updatedTicket.id) {
      setSelectedTicket(prev => prev ? { ...prev, ...updatedTicket } : prev)
    }
    // Don't close the modal - just update the ticket data
    // The modal should only close when user explicitly closes it
    fetchMyTickets() // Refresh to get latest data
  }

  return (
    <div className="min-h-screen bg-background">
      <SupportSidebar />
      {/* Header */}
      <header className="h-header bg-header-background border-b border-header-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-header">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-header-foreground">Support - My Tickets</h1>
        </div>
        <div className="flex items-center space-x-4">
          <UserProfileDropdown />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto lg:ml-sidebar">
          <div className="space-y-8">
            <BreadcrumbNavigation />

            {/* Personal Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-sm text-muted-foreground mb-2">My Open</div>
                <div className="text-2xl font-bold text-foreground">{stats.myOpen}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-sm text-muted-foreground mb-2">Resolved Today</div>
                <div className="text-2xl font-bold text-foreground">{stats.resolvedToday}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-sm text-muted-foreground mb-2">Avg Response Time</div>
                <div className="text-2xl font-bold text-foreground">{stats.avgResponseTime}</div>
              </div>
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="text-sm text-muted-foreground mb-2">Unread Replies</div>
                <div className="text-2xl font-bold text-foreground">{stats.unread}</div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  type="search"
                  placeholder="Search tickets, subject, user..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  iconName="Search"
                />
                <Select
                  options={[
                    { value: 'all', label: 'All Priorities' },
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' }
                  ]}
                  value={filters.priority}
                  onChange={(value) => setFilters({ ...filters, priority: value })}
                  placeholder="Select priority"
                />
                <Select
                  options={[
                    { value: 'all', label: 'All Categories' },
                    ...allCategories.map(cat => ({ 
                      value: cat.code, // Use normalized code for filtering
                      label: cat.label // Use standardized label for display
                    }))
                  ]}
                  value={filters.category}
                  onChange={(value) => setFilters({ ...filters, category: value })}
                  placeholder="Select category"
                />
              </div>
              {(filters.search || filters.priority !== 'all' || filters.category !== 'all') && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''} found
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilters({ search: '', priority: 'all', category: 'all' })}
                    iconName="X"
                    iconPosition="left"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>

            {/* Tabs and Tickets Table */}
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
                    Open Tickets ({tickets.filter(t => ['open', 'pending', 'in-progress'].includes(t.status)).length})
                  </button>
                  <button
                    onClick={() => setActiveTab('resolved')}
                    className={`px-6 py-3 text-sm font-medium transition-smooth border-b-2 ${
                      activeTab === 'resolved'
                        ? 'text-primary border-primary'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    Resolved ({tickets.filter(t => ['resolved', 'closed'].includes(t.status)).length})
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-6 py-3 text-sm font-medium transition-smooth border-b-2 ${
                      activeTab === 'all'
                        ? 'text-primary border-primary'
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                    }`}
                  >
                    All Tickets ({tickets.length})
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
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      iconName="RefreshCw"
                      onClick={fetchMyTickets}
                      disabled={loading}
                      className="hidden sm:flex"
                    >
                      Refresh
                    </Button>

                    {/* Mobile button */}
                    <Button
                      variant="outline"
                      size="sm"
                      iconName="RefreshCw"
                      onClick={fetchMyTickets}
                      disabled={loading}
                      className="sm:hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Tickets Table */}
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading tickets...</p>
                </div>
              ) : error ? (
                <div className="p-12 text-center">
                  <Icon name="AlertCircle" size={48} className="text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Tickets</h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button
                    variant="outline"
                    onClick={fetchMyTickets}
                    iconName="RefreshCw"
                    iconPosition="left"
                  >
                    Try Again
                  </Button>
                </div>
              ) : filteredTickets.length === 0 ? (
                <div className="p-12 text-center">
                  <Icon name="Inbox" size={48} className="text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {activeTab === 'open' ? 'No Open Tickets' : 
                     activeTab === 'resolved' ? 'No Resolved Tickets' : 
                     'No Tickets Assigned'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {filters.search || filters.priority !== 'all' || filters.category !== 'all'
                      ? 'No tickets match your current filters. Try adjusting your search criteria.'
                      : 'You don\'t have any tickets assigned to you yet. New tickets will appear here when they are assigned to you.'}
                  </p>
                  {(filters.search || filters.priority !== 'all' || filters.category !== 'all') && (
                    <Button
                      variant="outline"
                      onClick={() => setFilters({ search: '', priority: 'all', category: 'all' })}
                      iconName="X"
                      iconPosition="left"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              ) : (
                <TicketTable
                  tickets={filteredTickets}
                  onTicketSelect={handleTicketSelect}
                  onBulkAction={() => {}}
                  selectedTickets={selectedTickets}
                  onTicketSelectionChange={setSelectedTickets}
                  selectable={false}
                  showAssignee={false}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Ticket Detail Modal */}
      <SupportTicketDetailModal
        ticket={selectedTicket}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedTicket(null)
        }}
        onUpdate={handleTicketUpdate}
      />
    </div>
  )
}

export default SupportAgentTickets


