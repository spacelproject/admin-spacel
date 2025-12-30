import React, { useState } from 'react'
import { useNotifications } from '../hooks/useNotifications'
import Icon from './AppIcon'
import NotificationsDropdown from './NotificationsDropdown'

const NotificationBell = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { unreadCount } = useNotifications()

  const handleBellClick = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const handleCloseDropdown = () => {
    setIsDropdownOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Icon name="Bell" size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-blue-600 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationsDropdown
        isOpen={isDropdownOpen}
        onClose={handleCloseDropdown}
      />
    </div>
  )
}

export default NotificationBell
