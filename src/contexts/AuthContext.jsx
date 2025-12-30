import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { logError, logInfo, logWarn, logDebug } from '../utils/logger'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Cache keys for localStorage
const CACHE_KEYS = {
  ADMIN_STATUS: 'spacel_admin_status_cache',
  LAST_CHECK: 'spacel_admin_last_check'
}

// Cache duration: 5 minutes (300000ms)
const CACHE_DURATION = 5 * 60 * 1000

// Helper functions for cache management
const getCachedAdminStatus = (userId) => {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.ADMIN_STATUS)
    const lastCheck = localStorage.getItem(CACHE_KEYS.LAST_CHECK)
    
    if (!cached || !lastCheck) return null
    
    const cacheData = JSON.parse(cached)
    const lastCheckTime = parseInt(lastCheck, 10)
    const now = Date.now()
    
    // Check if cache is for the same user and still valid
    if (cacheData.userId === userId && (now - lastCheckTime) < CACHE_DURATION) {
      logDebug('Using cached admin status')
      return cacheData
    }
    
    // Cache expired or different user
    return null
  } catch (error) {
    logWarn('Error reading cache:', error)
    return null
  }
}

const setCachedAdminStatus = (userId, adminData) => {
  try {
    localStorage.setItem(CACHE_KEYS.ADMIN_STATUS, JSON.stringify({
      userId,
      ...adminData,
      cachedAt: Date.now()
    }))
    localStorage.setItem(CACHE_KEYS.LAST_CHECK, Date.now().toString())
  } catch (error) {
    logWarn('Error writing cache:', error)
  }
}

const clearCachedAdminStatus = () => {
  try {
    localStorage.removeItem(CACHE_KEYS.ADMIN_STATUS)
    localStorage.removeItem(CACHE_KEYS.LAST_CHECK)
  } catch (error) {
    logWarn('Error clearing cache:', error)
  }
}

/**
 * AuthProvider component
 * Manages authentication state, admin status checking, and session management
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} AuthContext provider
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [authInitialized, setAuthInitialized] = useState(false)
  const { showToast } = useToast()
  
  // Track consecutive failures
  const consecutiveFailuresRef = useRef(0)
  const initializationRef = useRef(false) // Track if initialization has run
  const authStateChangeRef = useRef({ isProcessing: false, lastEvent: null }) // Prevent race conditions

  /**
   * Check if a user has admin privileges
   * Uses caching, retries, and timeout handling for reliability
   * @param {string} userId - User ID to check
   * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
   * @param {number} retries - Number of retry attempts (default: 2)
   * @param {boolean} useCache - Whether to use cached results (default: true)
   * @returns {Promise<Object|string|null>} Admin user data, 'network_error', or null
   */
  const checkAdminStatus = useCallback(async (userId, timeoutMs = 10000, retries = 2, useCache = true) => {
    // Try cache first if enabled
    if (useCache) {
      const cached = getCachedAdminStatus(userId)
      if (cached) {
        logDebug('Using cached admin status')
        consecutiveFailuresRef.current = 0 // Reset failures on cache hit
        return cached
      }
    }
    const adminCheckPromise = async () => {
      let lastError = null
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          if (attempt > 0) {
            logDebug(`Retrying admin check (attempt ${attempt + 1}/${retries + 1})...`)
            // Exponential backoff: wait 500ms, 1000ms, 2000ms
            await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, attempt - 1)))
          }
          
          logDebug('Checking admin status', { userId: userId?.substring(0, 8) + '...' })
          
          // Try a simpler query first
          const { data: adminUser, error: adminError } = await supabase
            .from('admin_users')
            .select('id, role, permissions, is_active')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle() // Use maybeSingle instead of single to avoid errors

          if (adminError) {
            logWarn('Admin check error:', adminError.message)
            lastError = adminError
            
            // Don't return null on network errors - this could cause logout
            if (adminError.message.includes('network') || 
                adminError.message.includes('timeout') ||
                adminError.message.includes('Failed to fetch') ||
                adminError.code === 'PGRST116' ||
                adminError.code === 'PGRST301') {
              logDebug('Network/database error during admin check')
              // If this is the last attempt, return network_error to keep session
              if (attempt === retries) {
                return 'network_error'
              }
              continue // Retry on network errors
            }
            
            // For other errors, don't retry
            if (attempt === retries) {
              return null
            }
            continue
          }

          if (adminUser) {
            logDebug('Admin user found in admin_users table', { role: adminUser.role })
            // Cache the successful result
            setCachedAdminStatus(userId, adminUser)
            consecutiveFailuresRef.current = 0 // Reset failures on success
            return adminUser
          }

          // If not found in admin_users, check profiles table for admin role
          logDebug('Checking profiles table for admin role...')
          const { data: profileUser, error: profileError } = await supabase
            .from('profiles')
            .select('id, role')
            .eq('id', userId)
            .eq('role', 'admin')
            .maybeSingle()

          if (profileError) {
            logWarn('Profile check error:', profileError.message)
            lastError = profileError
            
            // Retry on network errors
            if (profileError.message.includes('network') || 
                profileError.message.includes('timeout') ||
                profileError.message.includes('Failed to fetch')) {
              if (attempt === retries) {
                return 'network_error'
              }
              continue
            }
            
            if (attempt === retries) {
              return null
            }
            continue
          }

          if (profileUser) {
            logDebug('Admin user found in profiles table with admin role')
            const adminData = {
              id: profileUser.id,
              role: 'admin',
              permissions: ['all'],
              is_active: true
            }
            // Cache the successful result
            setCachedAdminStatus(userId, adminData)
            consecutiveFailuresRef.current = 0 // Reset failures on success
            return adminData
          }

          // User not found as admin - this is a definitive result, don't retry
          logDebug('No admin user found for this user ID')
          return null
        } catch (error) {
          logWarn('Admin check failed:', error.message)
          lastError = error
          
          // Don't return null on network errors
          if (error.message.includes('network') || 
              error.message.includes('timeout') ||
              error.message.includes('Failed to fetch') ||
              error instanceof TypeError) {
            logDebug('Network error during admin check')
            if (attempt === retries) {
              return 'network_error'
            }
            continue
          }
          
          // For other errors, only return null on last attempt
          if (attempt === retries) {
            return null
          }
        }
      }
      
      // If we get here, all retries failed
      logWarn('All admin check attempts failed')
      const isNetworkError = lastError?.message?.includes('network') || 
                             lastError?.message?.includes('timeout') ||
                             lastError?.code === 'PGRST116' ||
                             lastError?.code === 'PGRST301'
      
      if (isNetworkError) {
        consecutiveFailuresRef.current++
        logWarn(`Network error - consecutive failures: ${consecutiveFailuresRef.current}`)
        return 'network_error'
      }
      
      // Non-network error - user is definitively not an admin
      consecutiveFailuresRef.current = 0
      clearCachedAdminStatus()
      return null
    }

    // Race against timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Admin check timeout')), timeoutMs)
    })

    try {
      const result = await Promise.race([adminCheckPromise(), timeoutPromise])
      return result
    } catch (error) {
      logWarn('Admin check timeout or failed:', error.message)
      consecutiveFailuresRef.current++
      logWarn(`Timeout - consecutive failures: ${consecutiveFailuresRef.current}`)
      // On timeout, return network_error to prevent immediate logout
      return 'network_error'
    }
  }, [])


  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current) {
      return
    }
    
    let isMounted = true
    initializationRef.current = true

    const initializeAuth = async () => {
      try {
        logDebug('Initializing authentication...')
        
        // OPTIMISTIC: Check for session in storage FIRST (instant, no network call)
        // Supabase stores session in localStorage with key 'supabase.auth.admin' (from supabase.js config)
        try {
          // Try to get session from localStorage directly
          const storageKey = 'supabase.auth.admin'
          const storedSession = localStorage.getItem(storageKey)
          
          if (storedSession) {
            try {
              const sessionData = JSON.parse(storedSession)
              const currentSession = sessionData?.currentSession || sessionData?.session
              
              if (currentSession?.user && currentSession?.access_token) {
                logDebug('🚀 Optimistic: Found session in storage, initializing immediately')
                const userId = currentSession.user.id
                
                // Try to get cached admin status
                const cached = getCachedAdminStatus(userId)
                
                if (cached) {
                  // We have cached data - show UI immediately!
                  const isAdminRole = cached.role === 'admin' || cached.role === 'super_admin'
                  setUser({ 
                    ...currentSession.user, 
                    role: cached.role,
                    permissions: cached.permissions,
                    adminUserId: cached.id
                  })
                  setIsAdmin(isAdminRole)
                  setLoading(false)
                  setAuthInitialized(true) // ✅ Set immediately - UI can render NOW!
                  logDebug('✅ Optimistic auth complete - UI should render now', { 
                    userId: userId.substring(0, 8) + '...',
                    role: cached.role,
                    isAdmin: isAdminRole
                  })
                  
                  // Verify admin status in background (don't block UI)
                  checkAdminStatus(userId).then(adminUser => {
                    if (!isMounted) return
                    
                    if (adminUser && adminUser !== 'network_error') {
                      // Update with fresh data if different
                      const isAdminRole = adminUser.role === 'admin' || adminUser.role === 'super_admin'
                      setUser(prev => prev ? {
                        ...prev,
                        role: adminUser.role,
                        permissions: adminUser.permissions,
                        adminUserId: adminUser.id
                      } : null)
                      setIsAdmin(isAdminRole)
                      logDebug('Background admin verification completed', { role: adminUser.role })
                    } else if (adminUser === 'network_error') {
                      logDebug('Background admin verification - network error, keeping cached data')
                    } else {
                      logDebug('Background admin verification - not admin, but keeping session')
                      // Don't logout - might be temporary issue, keep cached data
                    }
                  }).catch(err => {
                    logWarn('Background admin verification error:', err)
                    // Don't logout on error - keep cached data
                  })
                  
                  return
                } else {
                  // No cache but have session - still show UI optimistically
                  logDebug('🚀 Optimistic: Session found but no cache, showing UI optimistically')
                  setUser({ 
                    ...currentSession.user, 
                    role: null
                  })
                  setIsAdmin(false)
                  setLoading(false)
                  setAuthInitialized(true) // ✅ Set immediately - UI can render!
                  
                  // Verify admin status in background (don't block UI)
                  checkAdminStatus(userId).then(adminUser => {
                    if (!isMounted) return
                    
                    if (adminUser && adminUser !== 'network_error') {
                      const isAdminRole = adminUser.role === 'admin' || adminUser.role === 'super_admin'
                      setUser(prev => prev ? {
                        ...prev,
                        role: adminUser.role,
                        permissions: adminUser.permissions,
                        adminUserId: adminUser.id
                      } : null)
                      setIsAdmin(isAdminRole)
                      logDebug('Background admin check completed', { role: adminUser.role })
                    } else if (adminUser === 'network_error') {
                      logDebug('Background admin check - network error, keeping session')
                    } else {
                      logDebug('Background admin check - not admin, but keeping session')
                      // Don't logout - might be temporary issue
                    }
                  }).catch(err => {
                    logWarn('Background admin check error:', err)
                    // Don't logout on error
                  })
                  
                  return
                }
              }
            } catch (parseError) {
              logDebug('Error parsing stored session:', parseError)
              // Continue to normal flow
            }
          }
        } catch (storageError) {
          logDebug('No session in storage or error:', storageError)
          // Continue to normal flow
        }
        
        // Normal flow: Get session from Supabase (only if no optimistic session found)
        logDebug('No optimistic session found, checking Supabase...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        logDebug('Session check result', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          error: error?.message 
        })
        
        if (!isMounted) return

        if (error) {
          logError('Error getting current session:', error)
          setUser(null)
          setIsAdmin(false)
          setLoading(false)
          setAuthInitialized(true)
          return
        }

        if (session && session.user) {
          logDebug('Found existing session', { userId: session.user.id?.substring(0, 8) + '...' })
          
          // Try cached status first for faster initialization
          const cached = getCachedAdminStatus(session.user.id)
          if (cached) {
            const isAdminRole = cached.role === 'admin' || cached.role === 'super_admin'
            setUser({ 
              ...session.user, 
              role: cached.role,
              permissions: cached.permissions,
              adminUserId: cached.id
            })
            setIsAdmin(isAdminRole)
            setLoading(false)
            setAuthInitialized(true)
            return
          }
          
          // No cache, check admin status
          const adminUser = await checkAdminStatus(session.user.id)
          
          if (!isMounted) return

          if (adminUser === 'network_error') {
            logDebug('Network error during initial admin check')
              // Use cached status if available, otherwise keep session temporarily
              const fallbackCache = getCachedAdminStatus(session.user.id)
              if (fallbackCache) {
              logDebug('Using stale cache as fallback')
                const isAdminRole = fallbackCache.role === 'admin' || fallbackCache.role === 'super_admin'
                setUser({ 
                  ...session.user, 
                  role: fallbackCache.role,
                  permissions: fallbackCache.permissions,
                  adminUserId: fallbackCache.id
                })
                setIsAdmin(isAdminRole)
              } else {
              logWarn('No cache available - keeping session temporarily')
                // Keep session but show warning
                setUser({ 
                  ...session.user, 
                  role: null,
                })
                setIsAdmin(false)
            }
          } else if (adminUser) {
            logDebug('User found in admin_users table', { role: adminUser.role })
            // Only set isAdmin=true for actual admin/super_admin roles, not support
            const isAdminRole = adminUser.role === 'admin' || adminUser.role === 'super_admin'
            setUser({ 
              ...session.user, 
              role: adminUser.role,
              permissions: adminUser.permissions,
              adminUserId: adminUser.id
            })
            setIsAdmin(isAdminRole)
            if (!isAdminRole) {
              logDebug('User is support agent, not admin')
            }
          } else {
            // On page reload, keep the session even if admin check fails
            // This prevents logout on temporary database issues or slow connections
            logDebug('Admin check returned null - keeping session to prevent logout on reload')
            // Keep user session but mark as non-admin
            // Only clear if this is a fresh login attempt, not a page reload
            const fallbackCache = getCachedAdminStatus(session.user.id)
            if (fallbackCache) {
              // We have cached admin data - use it
              const isAdminRole = fallbackCache.role === 'admin' || fallbackCache.role === 'super_admin'
              setUser({ 
                ...session.user, 
                role: fallbackCache.role,
                permissions: fallbackCache.permissions,
                adminUserId: fallbackCache.id
              })
              setIsAdmin(isAdminRole)
              logDebug('Using cached admin status despite null check result')
            } else {
              // No cache - keep session but mark as non-admin
              // Don't logout on page reload - might be temporary issue
              setUser({ 
                ...session.user, 
                role: null,
              })
              setIsAdmin(false)
              logWarn('Admin check failed but keeping session - might be temporary issue')
            }
          }
        } else {
          logDebug('No existing session found')
          setUser(null)
          setIsAdmin(false)
          clearCachedAdminStatus()
        }
      } catch (error) {
        logError('Error in auth initialization:', error)
        if (isMounted) {
          setUser(null)
          setIsAdmin(false)
        }
      } finally {
        if (isMounted) {
          logDebug('Auth initialization complete')
          setLoading(false)
          setAuthInitialized(true)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      logDebug('Auth state change', { event, hasUser: !!session?.user })
      
      if (!isMounted) return

      // Prevent concurrent processing of same event (race condition fix)
      if (authStateChangeRef.current.isProcessing && authStateChangeRef.current.lastEvent === event) {
        logDebug('Skipping duplicate auth event', { event })
        return
      }

      authStateChangeRef.current.isProcessing = true
      authStateChangeRef.current.lastEvent = event

      try {
        // Handle SIGNED_OUT event immediately
        if (event === 'SIGNED_OUT') {
          logDebug('Auth event: SIGNED_OUT')
          setUser(null)
          setIsAdmin(false)
          clearCachedAdminStatus()
          showToast('You have been signed out', 'info')
          authStateChangeRef.current.isProcessing = false
          return
        }

        // Handle TOKEN_REFRESHED - re-validate admin status but don't logout on failure
        if (event === 'TOKEN_REFRESHED') {
          logDebug('Auth event: TOKEN_REFRESHED - re-validating admin status')
          if (session && session.user) {
            // ✅ Set authInitialized immediately - don't block UI
            setAuthInitialized(true)
            setLoading(false)
            
            // Try cache first for instant update
            const cached = getCachedAdminStatus(session.user.id)
            if (cached) {
              const isAdminRole = cached.role === 'admin' || cached.role === 'super_admin'
              setUser({ 
                ...session.user, 
                role: cached.role,
                permissions: cached.permissions,
                adminUserId: cached.id
              })
              setIsAdmin(isAdminRole)
              logDebug('Token refreshed - using cached admin status')
            } else {
              // Update user immediately with session data (optimistic)
              setUser({ 
                ...session.user, 
                role: user?.role || null, // Keep existing role if available
                permissions: user?.permissions || null,
                adminUserId: user?.adminUserId || null
              })
            }
            
            // Verify admin status
            checkAdminStatus(session.user.id, 5000, 1, false).then(adminUser => {
            if (!isMounted) return

            // Only update if we got a valid admin user, otherwise keep current state
            if (adminUser && adminUser !== 'network_error') {
              const isAdminRole = adminUser.role === 'admin' || adminUser.role === 'super_admin'
              setUser({ 
                ...session.user, 
                role: adminUser.role,
                permissions: adminUser.permissions,
                adminUserId: adminUser.id
              })
              setIsAdmin(isAdminRole)
                logDebug('Token refreshed and admin status validated')
            } else if (adminUser === 'network_error') {
                logDebug('Network error during token refresh admin check')
                // Keep current user state - don't logout on network errors
            }
            // If adminUser is null, don't logout - might be temporary issue
            }).catch(err => {
              logWarn('Error during admin check after token refresh:', err)
              // Don't logout on errors - keep current state
            })
          }
          return
        }

        if (session && session.user) {
          // ✅ Set authInitialized immediately when we have a session
          setAuthInitialized(true)
          setLoading(false)
          
          // Always check admin status when we have a session
          // This ensures we always have the correct role set
          logDebug('Checking admin status for session user')
          
          // Try cache first for instant update
          const cached = getCachedAdminStatus(session.user.id)
          if (cached) {
            const isAdminRole = cached.role === 'admin' || cached.role === 'super_admin'
            setUser({ 
              ...session.user, 
              role: cached.role,
              permissions: cached.permissions,
              adminUserId: cached.id
            })
            setIsAdmin(isAdminRole)
            logDebug('Using cached admin status for instant UI')
          }
          
          // Check admin status
          const adminUser = await checkAdminStatus(session.user.id)
          
          if (!isMounted) return

          if (adminUser === 'network_error') {
            logDebug('Network error during admin check')
              // Don't change the current auth state on network errors
              // Keep session even if we can't verify admin status due to network issues
            return
          } else if (adminUser) {
            logDebug('User authenticated', { role: adminUser.role })
            // Only set isAdmin=true for actual admin/super_admin roles, not support
            const isAdminRole = adminUser.role === 'admin' || adminUser.role === 'super_admin'
            setUser({ 
              ...session.user, 
              role: adminUser.role,
              permissions: adminUser.permissions,
              adminUserId: adminUser.id
            })
            setIsAdmin(isAdminRole)
            if (!isAdminRole) {
              logDebug('User is support agent, not admin')
            }
          } else {
            // Don't logout on admin check failure - might be temporary issue
            // Keep the session and use cached data if available
            logDebug('Admin check returned null - keeping session to prevent logout')
            
            // Only logout if this is a SIGNED_IN event AND we have no cached data
            // For other events (like page reload), always keep the session
            if (event === 'SIGNED_IN') {
              // Check if we have cached admin data
              const cached = getCachedAdminStatus(session.user.id)
              if (cached) {
                // Use cached data - user was admin before
                const isAdminRole = cached.role === 'admin' || cached.role === 'super_admin'
                setUser({ 
                  ...session.user, 
                  role: cached.role,
                  permissions: cached.permissions,
                  adminUserId: cached.id
                })
                setIsAdmin(isAdminRole)
                logDebug('Using cached admin status despite null check')
              } else {
                // No cache and fresh sign in - user is not admin
                logWarn('User signed in but not found as admin - logging out')
                setUser(null)
                setIsAdmin(false)
                clearCachedAdminStatus()
              }
            } else {
              // For other events (like page reload, token refresh), keep session
              // Use cached data if available
              const cached = getCachedAdminStatus(session.user.id)
              if (cached) {
                const isAdminRole = cached.role === 'admin' || cached.role === 'super_admin'
                setUser({ 
                  ...session.user, 
                  role: cached.role,
                  permissions: cached.permissions,
                  adminUserId: cached.id
                })
                setIsAdmin(isAdminRole)
                logDebug('Keeping session with cached admin status')
              } else {
                // Keep session but mark as non-admin
                setUser({ 
                  ...session.user, 
                  role: null,
                })
                setIsAdmin(false)
                logDebug('Admin check failed but keeping session - might be temporary issue')
              }
            }
          }
        } else {
          logDebug('User signed out or no session')
          setUser(null)
          setIsAdmin(false)
          clearCachedAdminStatus()
        }
      } catch (error) {
        logError('Error in auth state change handler:', error)
        // On errors, don't immediately logout - might be temporary
        // Only logout if we're absolutely sure
        if (isMounted && event === 'SIGNED_OUT') {
          setUser(null)
          setIsAdmin(false)
        }
        // For other errors, keep current state
      } finally {
        if (isMounted) {
          setLoading(false)
          authStateChangeRef.current.isProcessing = false
        }
      }

      if (event === 'SIGNED_IN') {
        showToast('Successfully signed in', 'success')
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [showToast, checkAdminStatus]) // Removed authInitialized and user from dependencies to prevent loops


  const signIn = async (email, password) => {
    try {
      setLoading(true)
      logDebug('Attempting sign in', { email })
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        let errorMessage = 'Sign in failed. '
        
        // Provide specific error messages
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.'
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Please verify your email address before signing in. Check your inbox for the verification link.'
        } else if (error.message.includes('too many requests')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.'
        } else {
          errorMessage += error.message
        }
        
        logError('Sign in error:', error)
        showToast(errorMessage, 'error')
        return { success: false, error: { message: errorMessage, original: error } }
      }

      // Check if email is verified
      if (data.user && !data.user.email_confirmed_at) {
        await signOut()
        const errorMessage = 'Please verify your email address before signing in. Check your inbox for the verification link. If you didn\'t receive it, you can request a new verification email.'
        showToast(errorMessage, 'error')
        logWarn('User attempted login without email verification', { userId: data.user.id })
            return { 
          success: false, 
          error: { 
            message: errorMessage,
            code: 'EMAIL_NOT_VERIFIED',
            requiresVerification: true
          } 
        }
      }

      // Check if user is admin or support
      if (data.user) {
        const adminUser = await checkAdminStatus(data.user.id)
        
        if (!adminUser) {
          await signOut()
          const errorMessage = 'You do not have admin or support access. Please contact your administrator if you believe this is an error.'
          showToast(errorMessage, 'error')
          logWarn('User attempted login without admin/support access', { userId: data.user.id })
          return { 
            success: false, 
            error: { 
              message: errorMessage,
              code: 'ACCESS_DENIED'
            } 
          }
        }
        
        // Update user state immediately (don't wait for onAuthStateChange)
        const isAdminRole = adminUser.role === 'admin' || adminUser.role === 'super_admin'
        setUser({ 
          ...data.user, 
          role: adminUser.role,
          permissions: adminUser.permissions,
          adminUserId: adminUser.id
        })
        setIsAdmin(isAdminRole)
        setAuthInitialized(true)
        
        logDebug('Sign in successful', { userId: data.user.id, role: adminUser.role })
        
        // Return role for redirect logic
        return { success: true, data, role: adminUser.role }
      }

      return { success: true, data }
    } catch (error) {
      logError('Sign in exception:', error)
      const errorMessage = error.message || 'Sign in failed. Please try again.'
      showToast(errorMessage, 'error')
      return { success: false, error: { message: errorMessage, original: error } }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      logDebug('Starting sign out process...')
      
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        logError('Sign out error:', error)
        showToast(error.message || 'Sign out failed', 'error')
        return { success: false, error }
      }

      logDebug('Sign out successful, clearing state...')
      
      // Clear all auth state
      setUser(null)
      setIsAdmin(false)
      setAuthInitialized(false)
      clearCachedAdminStatus() // Clear cache on sign out
      
      // Reset consecutive failures
      consecutiveFailuresRef.current = 0
      
      // Reset initialization flag to allow re-initialization on next login
      initializationRef.current = false
      
      return { success: true }
    } catch (error) {
      logError('Sign out exception:', error)
      // Even on error, clear local state
      setUser(null)
      setIsAdmin(false)
      setAuthInitialized(false)
      clearCachedAdminStatus()
      initializationRef.current = false
      showToast(error.message || 'Sign out failed', 'error')
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, metadata = {}) => {
    try {
      setLoading(true)
      logDebug('Starting signup process', { email, hasInviteToken: !!metadata.inviteToken })
      
      // 1. Validate invite token
      if (!metadata.inviteToken) {
        const error = { message: 'Invite token is required. Registration is by invite only.' }
        showToast(error.message, 'error')
        return { success: false, error }
      }

      const { data: inviteToken, error: tokenError } = await supabase
        .from('invite_tokens')
        .select('*')
        .eq('token', metadata.inviteToken)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (tokenError || !inviteToken) {
        const error = { 
          message: 'Invalid or expired invite token. Please request a new invitation.' 
        }
        logError('Invalid invite token:', tokenError)
        showToast(error.message, 'error')
        return { success: false, error }
      }

      // Verify email matches invite token email if specified
      if (inviteToken.email && inviteToken.email !== email) {
        const error = { 
          message: `This invite token is for ${inviteToken.email}. Please use the correct email address.` 
        }
        showToast(error.message, 'error')
        return { success: false, error }
      }

      logDebug('Invite token validated', { tokenId: inviteToken.id, role: inviteToken.role })

      // 2. Check if this is the first admin user (no admins exist)
      const { data: existingAdmins, error: adminCheckError } = await supabase
        .from('admin_users')
        .select('id')
        .limit(1)

      if (adminCheckError) {
        logError('Error checking existing admins:', adminCheckError)
        // Continue anyway - might be first user
      }

      const isFirstUser = !existingAdmins || existingAdmins.length === 0
      const finalRole = isFirstUser ? 'super_admin' : (metadata.role || inviteToken.role || 'admin')
      
      logDebug('Role assignment', { isFirstUser, finalRole, requestedRole: metadata.role || inviteToken.role })

      // 3. Create auth user with metadata (email verification required)
      // Use the role from invite token or metadata (admin or support)
      const selectedRole = metadata.role || inviteToken.role || 'admin'
      
      // Use Edge Function to bypass CORS issues (works regardless of Site URL)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const redirectUrl = `${window.location.origin}/admin-login`
      
      logDebug('Using Edge Function for signup to bypass CORS', { email, role: selectedRole })
      
      // Use Edge Function which bypasses CORS restrictions
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/admin-signup`
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          email,
          password,
          firstName: metadata.firstName || '',
          lastName: metadata.lastName || '',
          role: selectedRole,
          inviteToken: metadata.inviteToken,
          redirectUrl
        })
      })

      const result = await response.json()
      
      let authData, authError

      if (!response.ok) {
        authError = { 
          message: result.error || 'Registration failed', 
          status: response.status 
        }
        logError('Edge Function signup error:', authError)
      } else {
        // Edge Function successfully created user
        // The trigger will create profile and admin_users entry
        authData = { 
          user: result.user || null,
          session: null // No session - user must verify email first
        }
        logDebug('Edge Function signup successful', { userId: result.user?.id })
      }

      if (authError) {
        let errorMessage = 'Registration failed. '
        
        // Provide specific error messages
        if (authError.status === 0 || authError.message?.includes('Failed to fetch') || authError.message?.includes('CORS')) {
          errorMessage = 'Network error: Please check your Supabase configuration. Make sure localhost:5173 is added to allowed origins in Supabase dashboard (Authentication → URL Configuration).'
        } else if (authError.status === 403) {
          errorMessage = 'Access denied: Signup may be disabled or restricted. Please contact your administrator or check Supabase authentication settings.'
        } else if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
          errorMessage = 'This email is already registered. Please sign in instead.'
        } else if (authError.message?.includes('password')) {
          errorMessage = 'Password does not meet requirements. Please use a stronger password.'
        } else if (authError.message?.includes('email')) {
          errorMessage = 'Invalid email address. Please check and try again.'
        } else {
          errorMessage += authError.message || 'Unknown error occurred'
        }
        
        logError('Auth signup error:', authError)
        showToast(errorMessage, 'error')
        return { success: false, error: { message: errorMessage, original: authError } }
      }

      if (!authData.user) {
        const error = { message: 'Registration failed. No user was created.' }
        showToast(error.message, 'error')
        return { success: false, error }
      }

      logDebug('Auth user created', { userId: authData.user.id })

      // 4. Wait a moment for trigger to create profile and admin_users entry
      // The trigger should create both automatically
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 5. Check if admin_users entry was created by trigger, if not create it
      const { data: existingAdminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', authData.user.id)
        .single()

      if (!existingAdminUser) {
        // Trigger didn't create it, create manually
        logDebug('Admin user entry not found, creating manually')
        const { data: adminUser, error: adminUserError } = await supabase
          .from('admin_users')
          .insert({
            user_id: authData.user.id,
            email: email,
            role: finalRole,
            permissions: finalRole === 'super_admin' ? ['all'] : {},
            is_active: true
          })
          .select()
          .single()

        if (adminUserError) {
          logError('Error creating admin_users entry:', adminUserError)
          const error = { 
            message: 'Account created but admin access setup failed. Please contact support.' 
          }
          showToast(error.message, 'error')
          return { success: false, error }
        }
        logDebug('Admin user entry created manually', { adminUserId: adminUser.id })
      } else {
        // Update role if trigger created it with wrong role
        if (existingAdminUser.role !== finalRole) {
          logDebug('Updating admin user role', { 
            current: existingAdminUser.role, 
            new: finalRole 
          })
          const { error: updateError } = await supabase
            .from('admin_users')
            .update({
              role: finalRole,
              permissions: finalRole === 'super_admin' ? ['all'] : existingAdminUser.permissions,
              is_active: true
            })
            .eq('id', existingAdminUser.id)

          if (updateError) {
            logWarn('Error updating admin user role:', updateError)
            // Non-critical, continue
          }
        }
        logDebug('Admin user entry exists', { adminUserId: existingAdminUser.id, role: existingAdminUser.role })
      }

      // 6. Mark invite token as used
      const { error: tokenUpdateError } = await supabase
        .from('invite_tokens')
        .update({
          used: true,
          used_by: authData.user.id,
          used_at: new Date().toISOString()
        })
        .eq('id', inviteToken.id)

      if (tokenUpdateError) {
        logWarn('Error marking invite token as used:', tokenUpdateError)
        // Non-critical error - continue
      }

      logDebug('Registration completed successfully', { 
        userId: authData.user.id, 
        role: finalRole,
        emailVerified: authData.user.email_confirmed_at !== null
      })

      // 7. Show success message - account is verified and ready to login
      const successMessage = isFirstUser 
        ? 'Super admin account created and verified! You can now proceed to login.'
        : `${finalRole === 'admin' ? 'Admin' : 'Support'} account created and verified! You can now proceed to login.`
      
      showToast(successMessage, 'success')
      
      // Account is verified, user can proceed to login
      return { 
        success: true, 
        data: authData,
        requiresEmailVerification: false,
        role: finalRole
      }
    } catch (error) {
      logError('Signup error:', error)
      const errorMessage = error.message || 'Registration failed. Please try again.'
      showToast(errorMessage, 'error')
      return { success: false, error: { message: errorMessage, original: error } }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      setLoading(true)
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin-login?mode=resetPassword`
      })
      
      if (error) {
        showToast(error.message || 'Password reset failed', 'error')
        return { success: false, error }
      }

      showToast('Password reset email sent! Please check your inbox.', 'success')
      return { success: true }
    } catch (error) {
      showToast(error.message || 'Password reset failed', 'error')
      return { success: false, error }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    setUser,
    loading,
    isAdmin,
    authInitialized,
    signIn,
    signOut,
    signUp,
    resetPassword
  }

  // Debug logging (sanitized)
  logDebug('AuthContext state', {
    hasUser: !!user,
    isAdmin, 
    loading,
    authInitialized
  })

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
