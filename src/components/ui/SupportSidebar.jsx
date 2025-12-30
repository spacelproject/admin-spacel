import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import Icon from '../AppIcon'

const SupportSidebar = () => {
  const location = useLocation()

  const navItem = (to, label, icon) => {
    const active = location.pathname === to
    return (
      <Link
        to={to}
        className={`flex items-center px-4 py-2 rounded-md transition-smooth ${
          active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
      >
        <Icon name={icon} size={18} className="mr-2" />
        <span className="text-sm font-medium">{label}</span>
      </Link>
    )
  }

  return (
    <aside className="hidden lg:block fixed inset-y-0 left-0 w-sidebar bg-card border-r border-border z-sidebar p-4 space-y-2">
      <div className="px-2 py-3">
        <h2 className="text-sm font-semibold text-foreground">Support</h2>
      </div>
      <nav className="space-y-1">
        {navItem('/support-agent-tickets', 'My Tickets', 'Ticket')}
      </nav>
    </aside>
  )
}

export default SupportSidebar


