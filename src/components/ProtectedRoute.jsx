import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './ui/LoadingSpinner'

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, loading, isAdmin, authInitialized } = useAuth()
  const location = useLocation()

  console.log('🔍 ProtectedRoute check:', { 
    loading, 
    authInitialized,
    hasUser: !!user, 
    isAdmin, 
    userRole: user?.role,
    requiredRole,
    userEmail: user?.email,
    path: location.pathname 
  })

  // Show loading only if auth is still initializing AND we don't have a user
  // If we have a user (even from cache), show UI immediately
  if ((loading || !authInitialized) && !user) {
    console.log('⏳ ProtectedRoute: Auth still initializing, showing spinner')
    return <LoadingSpinner text="Checking authentication..." />
  }
  
  // If auth is initialized but we have a user, show UI immediately (optimistic)
  if (authInitialized && user) {
    console.log('✅ ProtectedRoute: Auth initialized with user, proceeding with checks')
  }

  // Role-based access control
  if (requiredRole) {
    // Support role: can access support routes
    if (requiredRole === 'support') {
      // If auth is initialized but no user, redirect to login
      if (!user) {
        console.log('❌ ProtectedRoute: User not authenticated, redirecting to login')
        console.log('🔍 Debug info:', { loading, authInitialized, user })
        return <Navigate to="/admin-login" state={{ from: location }} replace />
      }
      
      // Allow support agents and admins to access support routes
      if (user?.role !== 'support' && user?.role !== 'admin' && user?.role !== 'super_admin') {
        console.warn(`❌ ProtectedRoute: User ${user?.email} (Role: ${user?.role}) attempted to access support route.`)
        console.log('🔍 Debug info:', { userRole: user?.role, requiredRole })
        return <Navigate to="/admin-login" replace />
      }
      
      console.log('✅ ProtectedRoute: Support agent authenticated, allowing access')
    } else if (requiredRole === 'admin') {
      // If auth is initialized but no user, redirect to login
      if (!user) {
        console.log('❌ ProtectedRoute: User not authenticated, redirecting to login')
        return <Navigate to="/admin-login" state={{ from: location }} replace />
      }
      
      // Admin routes: STRICTLY require admin or super_admin role (not support)
      if (user?.role !== 'admin' && user?.role !== 'super_admin') {
        console.warn(`User ${user?.email} (Role: ${user?.role}) attempted to access admin route. Redirecting to support page if support agent.`)
        // Redirect support agents to their own page instead of login
        if (user?.role === 'support') {
          return <Navigate to="/support-agent-tickets" replace />
        }
        return <Navigate to="/admin-login" replace />
      }
    }
  } else {
    // No requiredRole specified: STRICTLY require admin role (default behavior)
    if (!user) {
      console.log('❌ ProtectedRoute: User not authenticated, redirecting to login')
      return <Navigate to="/admin-login" state={{ from: location }} replace />
    }
    
    if (user?.role !== 'admin' && user?.role !== 'super_admin') {
      console.log('❌ ProtectedRoute: User not admin, redirecting')
      // Redirect support agents to their own page instead of login
      if (user?.role === 'support') {
        return <Navigate to="/support-agent-tickets" replace />
      }
      return <Navigate to="/admin-login" state={{ from: location }} replace />
    }
  }

  console.log('✅ ProtectedRoute: User authenticated, rendering children')
  return children
}

export default ProtectedRoute
