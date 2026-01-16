import { createClient } from '@supabase/supabase-js'
import { logConnection, logError } from '../utils/logger'

// Supabase configuration - must use environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = []
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY')
  
  const errorMsg = `Missing required environment variables: ${missing.join(', ')}. Please check your .env file.`
  logError('❌ Configuration Error:', errorMsg)
  throw new Error(errorMsg)
}

// Log connection status (sanitized)
logConnection('Supabase', 'Initializing', { url: supabaseUrl ? 'configured' : 'missing' })

// Create Supabase client with your real database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'supabase.auth.admin', // Custom storage key for admin panel
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' // Use PKCE flow for better security and CORS handling
  },
  global: {
    headers: {
      'x-client-info': 'spacel-admin-panel'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Log connection status (only in development)
logConnection('Supabase', 'Connected to SPACEL Marketplace database')

// Database configuration for SPACEL Marketplace

// Database helper functions - mapped to your actual SPACEL database schema
export const db = {
  // Core tables - mapped to your actual SPACEL database
  users: supabase.from('profiles'), // Your actual table name
  spaces: supabase.from('listings'), // Your actual table name
  bookings: supabase.from('bookings'), // Your actual table name
  categories: supabase.from('main_categories'), // Main categories table (part of three-table system)
  reviews: supabase.from('reviews'), // Your actual table name
  messages: supabase.from('messages'), // Your actual table name
  
  // Existing tables from your SPACEL database
  earnings: supabase.from('earnings'), // Partner earnings
  notifications: supabase.from('notifications'), // User notifications
  admin_notifications: supabase.from('admin_notifications'), // Admin notifications
  payment_logs: supabase.from('payment_logs'), // Payment logs
  booking_modifications: supabase.from('booking_modifications'), // Booking modifications
  user_preferences: supabase.from('user_preferences'), // User preferences
  favorites: supabase.from('favorites'), // User favorites
  conversations: supabase.from('conversations'), // Chat conversations
  user_presence: supabase.from('user_presence'), // User online status
  
  // Admin-specific tables (these will likely be new)
  admin_users: supabase.from('admin_users'),
  moderation_actions: supabase.from('moderation_actions'),
  support_tickets: supabase.from('support_tickets'),
  platform_settings: supabase.from('platform_settings'),
  audit_logs: supabase.from('audit_logs'),
  
  // Content management tables
  announcements: supabase.from('announcements'),
  documentation: supabase.from('documentation'),
  legal_pages: supabase.from('legal_pages'),
  
  // Analytics
  analytics_events: supabase.from('analytics_events')
}

// Storage buckets
export const storage = {
  spaces: supabase.storage.from('space-images'),
  users: supabase.storage.from('user-avatars'),
  content: supabase.storage.from('content-images'),
  documents: supabase.storage.from('documents'),
  support: supabase.storage.from('support-attachments')
}

// Real-time subscriptions helper
export const subscribeToTable = (tableName, callback, filter = {}) => {
  return supabase
    .channel(`${tableName}-changes`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: tableName,
      filter: filter
    }, callback)
    .subscribe()
}

// Auth helpers
export const auth = {
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },
  
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },
  
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },
  
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export default supabase
