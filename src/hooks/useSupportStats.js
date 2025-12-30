import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

const useSupportStats = (tickets) => {
  const [avgResponseTime, setAvgResponseTime] = useState('-')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!tickets || tickets.length === 0) {
      setAvgResponseTime('-')
      return
    }

    const calculateAvgResponseTime = async () => {
      setLoading(true)
      try {
        const ticketIds = tickets.map(t => t.dbId).filter(Boolean)
        
        if (ticketIds.length === 0) {
          setAvgResponseTime('-')
          return
        }

        // Get all replies for these tickets
        const { data: replies, error } = await supabase
          .from('support_ticket_replies')
          .select('ticket_id, created_at, admin_id')
          .in('ticket_id', ticketIds)
          .not('admin_id', 'is', null)
          .order('created_at', { ascending: true })

        if (error) throw error

        if (!replies || replies.length === 0) {
          setAvgResponseTime('-')
          return
        }

        // Group replies by ticket
        const repliesByTicket = {}
        replies.forEach(reply => {
          if (!repliesByTicket[reply.ticket_id]) {
            repliesByTicket[reply.ticket_id] = []
          }
          repliesByTicket[reply.ticket_id].push(reply)
        })

        // Calculate response times: time from ticket creation to first admin reply
        let totalResponseTime = 0
        let responseCount = 0

        for (const ticket of tickets) {
          if (!ticket.dbId) continue
          
          const ticketReplies = repliesByTicket[ticket.dbId] || []
          if (ticketReplies.length > 0) {
            const firstAdminReply = ticketReplies[0]
            const ticketCreatedAt = new Date(ticket.createdAt)
            const replyCreatedAt = new Date(firstAdminReply.created_at)
            
            if (replyCreatedAt > ticketCreatedAt) {
              const responseTime = replyCreatedAt - ticketCreatedAt
              totalResponseTime += responseTime
              responseCount++
            }
          }
        }

        if (responseCount > 0) {
          const avgMinutes = Math.round(totalResponseTime / responseCount / 60000)
          const formatted = avgMinutes < 60 
            ? `${avgMinutes}m` 
            : `${Math.round(avgMinutes / 60)}h`
          setAvgResponseTime(formatted)
        } else {
          setAvgResponseTime('-')
        }
      } catch (error) {
        console.error('Error calculating average response time:', error)
        setAvgResponseTime('-')
      } finally {
        setLoading(false)
      }
    }

    calculateAvgResponseTime()
  }, [tickets])

  return { avgResponseTime, loading }
}

export default useSupportStats

