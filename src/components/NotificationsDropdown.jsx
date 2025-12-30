import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications'
import useAnnouncements from '../hooks/useAnnouncements'
import { useAuth } from '../contexts/AuthContext'
import Icon from './AppIcon'
import Button from './ui/Button'

const NotificationsDropdown = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    formatNotificationTime
  } = useNotifications()
  const { trackAnnouncementView } = useAnnouncements()

  const [markingAllRead, setMarkingAllRead] = useState(false)

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return // Nothing to mark as read
    
    setMarkingAllRead(true)
    try {
      const result = await markAllAsRead()
      if (result.success) {
        console.log('✅ All notifications marked as read')
      } else {
        console.error('Failed to mark all as read:', result.error)
      }
    } catch (error) {
      console.error('Error in handleMarkAllRead:', error)
    } finally {
      setMarkingAllRead(false)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'announcement':
        return { name: 'Megaphone', color: 'text-primary' }
      case 'listing_approval':
        return { name: 'CheckCircle', color: 'text-success' }
      case 'listing_rejection':
        return { name: 'XCircle', color: 'text-error' }
      case 'booking':
        return { name: 'Calendar', color: 'text-primary' }
      case 'booking_reminder':
        return { name: 'Clock', color: 'text-warning' }
      case 'system':
        return { name: 'Info', color: 'text-info' }
      default:
        return { name: 'Bell', color: 'text-muted-foreground' }
    }
  }

  const getNotificationAction = (notification) => {
    if (notification.data?.action_url) {
      return (
        <button
          onClick={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            markAsRead(notification.id)
            
            // Track announcement view if this is an announcement notification
            if (notification.type === 'announcement' && notification.data?.announcement_id && user?.id) {
              try {
                await trackAnnouncementView(notification.data.announcement_id, user.id)
              } catch (error) {
                console.error('Error tracking announcement view:', error)
              }
            }
            
            // Extract the path from the action_url (remove query params for navigation)
            const url = notification.data.action_url
            const [path, queryString] = url.split('?')
            
            // Navigate using React Router (client-side navigation, no page reload)
            navigate(path + (queryString ? `?${queryString}` : ''))
            onClose()
          }}
          className="text-xs text-primary hover:text-primary/80 underline"
        >
          View Details
        </button>
      )
    }
    return null
  }

  if (!isOpen) return null

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-lg shadow-lg z-50">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-card-foreground">Notifications</h3>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {unreadCount} unread
              </span>
            )}
            <Button
              variant="outline"
              size="xs"
              onClick={handleMarkAllRead}
              disabled={markingAllRead || unreadCount === 0}
              className="text-xs"
            >
              {markingAllRead ? 'Marking...' : 'Mark All Read'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Icon name="Bell" size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((notification) => {
              const icon = getNotificationIcon(notification.type)
              return (
                <div
                  key={notification.id || notification.created_at}
                  className={`p-4 hover:bg-muted/30 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                  }`}
                  onClick={async () => {
                    markAsRead(notification.id)
                    
                    // Track announcement view if this is an announcement notification
                    if (notification.type === 'announcement' && notification.data?.announcement_id && user?.id) {
                      try {
                        await trackAnnouncementView(notification.data.announcement_id, user.id)
                      } catch (error) {
                        console.error('Error tracking announcement view:', error)
                      }
                    }
                  }}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 ${icon.color}`}>
                      <Icon name={icon.name} size={16} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-card-foreground">
                          {notification.title}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {formatNotificationTime(notification.created_at)}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      
                      {notification.type === 'listing_rejection' && notification.data?.rejection_reason && (
                        <div className="bg-error/10 border border-error/20 rounded-md p-2 mb-2">
                          <p className="text-xs text-error font-medium mb-1">Rejection Reason:</p>
                          <p className="text-xs text-error/80">{notification.data.rejection_reason}</p>
                        </div>
                      )}
                      
                      {getNotificationAction(notification)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border">
        <Button
          variant="outline"
          fullWidth
          onClick={onClose}
          className="text-sm"
        >
          Close
        </Button>
      </div>
    </div>
  )
}

export default NotificationsDropdown
