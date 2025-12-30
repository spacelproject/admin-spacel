import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logError, logDebug, logWarn } from '../utils/logger'
import { handleDatabaseError, formatErrorForUser } from '../utils/errorHandler'

const useSupportTickets = () => {
  const { user, isAdmin } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchTickets = useCallback(async () => {
    if (!isAdmin) {
      setTickets([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch all tickets first (without profile join to avoid RLS filtering)
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('support_tickets')
        .select(`
          id,
          ticket_id,
          subject,
          description,
          category,
          priority,
          status,
          assigned_to,
          user_id,
          created_at,
          updated_at,
          booking_id
        `)
        .order('updated_at', { ascending: false })

      if (ticketsError) {
        const appError = handleDatabaseError(ticketsError, 'Fetch tickets')
        logError('Error fetching tickets:', appError)
        throw appError
      }

      logDebug('Tickets fetched', { count: ticketsData?.length || 0 })

      if (!ticketsData || ticketsData.length === 0) {
        setTickets([])
        setLoading(false)
        return
      }

      // Fetch profiles separately for all unique user_ids
      const userIds = [...new Set(ticketsData.map(t => t.user_id).filter(Boolean))]
      let profilesMap = {}
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url')
          .in('id', userIds)

        if (profilesError) {
          logWarn('Error fetching profiles (non-critical):', profilesError)
        } else {
          // Create a map for quick lookup
          profilesData?.forEach(profile => {
            profilesMap[profile.id] = profile
          })
        }
      }

      // Get all support agents for assignee mapping
      const { data: agentsData } = await supabase
        .from('admin_users')
        .select(`
          user_id,
          email,
          profiles:user_id (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('role', 'support')
        .eq('is_active', true)

      // Create agent map for quick lookup
      const agentMap = {}
      agentsData?.forEach(agent => {
        agentMap[agent.user_id] = {
          id: agent.user_id,
          name: `${agent.profiles?.first_name || ''} ${agent.profiles?.last_name || ''}`.trim() || agent.email.split('@')[0],
          role: 'Support Specialist',
          avatar: agent.profiles?.avatar_url || '/assets/images/no_image.png',
          status: 'online'
        }
      })

      // Transform tickets to match expected format
      const transformedTickets = ticketsData.map(ticket => {
        const profile = profilesMap[ticket.user_id] || null
        return {
          id: ticket.ticket_id || ticket.id,
          dbId: ticket.id,
          user: {
            id: ticket.user_id, // ✅ Add user ID - required for replies
            name: profile 
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User'
              : 'User',
            email: profile?.email || '',
            avatar: profile?.avatar_url || '/assets/images/no_image.png'
          },
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          assignee: ticket.assigned_to ? agentMap[ticket.assigned_to] || null : null,
          createdAt: new Date(ticket.created_at),
          lastUpdated: new Date(ticket.updated_at),
          description: ticket.description,
          bookingId: ticket.booking_id || null
        }
      })

      setTickets(transformedTickets)
    } catch (err) {
      const appError = handleDatabaseError(err, 'Fetch support tickets')
      logError('Error fetching support tickets:', appError)
      setError(formatErrorForUser(appError))
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    fetchTickets()

    // Set up real-time subscription
    if (!isAdmin) return

    const channel = supabase
      .channel('support_tickets_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'support_tickets' 
        }, 
        (payload) => {
          logDebug('Support ticket change received', { eventType: payload.eventType })
          
          if (payload.eventType === 'INSERT') {
            // Auto-assign if enabled (check localStorage or settings)
            const autoAssignEnabled = localStorage.getItem('support_auto_assign') !== 'false'
            if (autoAssignEnabled && payload.new && !payload.new.assigned_to) {
              autoAssignNewTicket(payload.new.id)
            }
            // Fetch fresh data to get all related info
            fetchTickets()
          } else if (payload.eventType === 'UPDATE') {
            // Update ticket in place or refetch
            fetchTickets()
          } else if (payload.eventType === 'DELETE') {
            setTickets(prev => prev.filter(ticket => ticket.dbId !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [fetchTickets, isAdmin])

  // Auto-assign function
  const autoAssignNewTicket = async (ticketId) => {
    try {
      // Fetch support agents sorted by active tickets
      const { data: agents } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('role', 'support')
        .eq('is_active', true)

      if (!agents || agents.length === 0) return

      const agentIds = agents.map(a => a.user_id)

      // Get active ticket counts
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('assigned_to')
        .in('assigned_to', agentIds)
        .in('status', ['open', 'pending', 'in-progress'])

      const counts = {}
      agentIds.forEach(id => counts[id] = 0)
      tickets?.forEach(t => {
        if (t.assigned_to) counts[t.assigned_to] = (counts[t.assigned_to] || 0) + 1
      })

      // Assign to agent with least tickets
      const sortedAgents = agentIds.sort((a, b) => counts[a] - counts[b])
      const assignTo = sortedAgents[0]

      if (assignTo) {
        await supabase
          .from('support_tickets')
          .update({ assigned_to: assignTo, updated_at: new Date().toISOString() })
          .eq('id', ticketId)
      }
    } catch (error) {
      logError('Error auto-assigning ticket:', error)
    }
  }

  return {
    tickets,
    loading,
    error,
    refetch: fetchTickets
  }
}

export default useSupportTickets

