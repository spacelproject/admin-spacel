import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const useSupportAgents = () => {
  const { user, isAdmin } = useAuth()
  const [supportAgents, setSupportAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchSupportAgents = useCallback(async () => {
    if (!isAdmin) {
      setSupportAgents([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch support agents with their ticket counts
      const { data: agentsData, error: agentsError } = await supabase
        .from('admin_users')
        .select(`
          user_id,
          email,
          role,
          is_active,
          profiles:user_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('role', 'support')
        .eq('is_active', true)

      if (agentsError) throw agentsError

      if (!agentsData || agentsData.length === 0) {
        setSupportAgents([])
        setLoading(false)
        return
      }

      // Get all agent user IDs
      const agentUserIds = agentsData.map(a => a.user_id)

      // Get all tickets assigned to these agents in one query
      const { data: allTickets } = await supabase
        .from('support_tickets')
        .select('id, assigned_to, status, created_at')
        .in('assigned_to', agentUserIds)

      // Get all replies for these tickets in one query
      const ticketIds = allTickets?.map(t => t.id) || []
      let allReplies = []
      if (ticketIds.length > 0) {
        const { data: repliesData } = await supabase
          .from('support_ticket_replies')
          .select('ticket_id, created_at, admin_id')
          .in('ticket_id', ticketIds)
          .in('admin_id', agentUserIds)
          .order('created_at', { ascending: true })
        allReplies = repliesData || []
      }

      // Process data for each agent
      const agentsWithStats = agentsData.map((agent) => {
        const agentUserId = agent.user_id

        // Count active tickets
        const activeTickets = allTickets?.filter(
          t => t.assigned_to === agentUserId && ['open', 'pending', 'in-progress'].includes(t.status)
        ).length || 0

        // Calculate average response time
        const agentTickets = allTickets?.filter(t => t.assigned_to === agentUserId) || []
        const agentReplies = allReplies?.filter(r => r.admin_id === agentUserId) || []
        
        let avgResponseTime = '-'
        if (agentReplies.length > 0 && agentTickets.length > 0) {
          // Group replies by ticket
          const repliesByTicket = {}
          agentReplies.forEach(reply => {
            if (!repliesByTicket[reply.ticket_id]) {
              repliesByTicket[reply.ticket_id] = []
            }
            repliesByTicket[reply.ticket_id].push(reply)
          })

          // Calculate response times (time from ticket creation to first admin reply)
          let totalResponseTime = 0
          let responseCount = 0

          agentTickets.forEach(ticket => {
            const ticketReplies = repliesByTicket[ticket.id] || []
            if (ticketReplies.length > 0) {
              const firstReply = ticketReplies[0]
              const responseTime = new Date(firstReply.created_at) - new Date(ticket.created_at)
              totalResponseTime += responseTime
              responseCount++
            }
          })

          if (responseCount > 0) {
            const avgMinutes = Math.round(totalResponseTime / responseCount / 60000)
            avgResponseTime = avgMinutes < 60 
              ? `${avgMinutes}m` 
              : `${Math.round(avgMinutes / 60)}h`
          }
        }

        // Mock satisfaction rate for now (would come from ticket ratings if we had them)
        const satisfactionRate = 94 + Math.floor(Math.random() * 5) // 94-98%

        return {
          id: agentUserId,
          name: `${agent.profiles?.first_name || ''} ${agent.profiles?.last_name || ''}`.trim() || agent.email.split('@')[0],
          role: 'Support Specialist',
          avatar: agent.profiles?.avatar_url || '/assets/images/no_image.png',
          status: 'online', // Could be calculated from last_login_at or user_presence
          activeTickets: activeTickets,
          avgResponseTime: avgResponseTime,
          satisfactionRate: satisfactionRate
        }
      })

      setSupportAgents(agentsWithStats)
    } catch (err) {
      console.error('Error fetching support agents:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => {
    fetchSupportAgents()
  }, [fetchSupportAgents])

  return {
    supportAgents,
    loading,
    error,
    refetch: fetchSupportAgents
  }
}

export default useSupportAgents

