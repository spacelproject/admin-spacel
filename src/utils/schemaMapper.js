// Schema mapping utility to adapt admin panel to existing database structure

/**
 * Maps admin panel table names to your existing database table names
 * Update these mappings based on your actual table names
 */
export const TABLE_MAPPINGS = {
  // Core tables - mapped to your actual SPACEL database schema
  users: 'profiles', // Your actual table name
  spaces: 'listings', // Your actual table name
  bookings: 'bookings', // Your actual table name
  categories: 'categories', // May need to create this
  reviews: 'reviews', // Your actual table name
  messages: 'messages', // Your actual table name
  
  // Existing tables from your database
  earnings: 'earnings', // Partner earnings
  notifications: 'notifications', // User notifications
  admin_notifications: 'admin_notifications', // Admin notifications
  payment_logs: 'payment_logs', // Payment logs
  
  // Admin-specific tables - these will likely be new
  admin_users: 'admin_users',
  moderation_actions: 'moderation_actions',
  support_tickets: 'support_tickets',
  platform_settings: 'platform_settings',
  audit_logs: 'audit_logs',
  announcements: 'announcements',
  documentation: 'documentation',
  legal_pages: 'legal_pages'
}

/**
 * Column mappings for different table structures
 * Helps adapt to your existing column names
 */
export const COLUMN_MAPPINGS = {
  // User table mappings (profiles table)
  users: {
    id: 'id', // UUID primary key
    email: 'email',
    firstName: 'first_name',
    lastName: 'last_name',
    phone: 'phone',
    avatar: 'avatar_url',
    role: 'role', // seeker, partner, admin
    status: 'is_active', // derived from role and other fields
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    lastActivity: 'updated_at', // or create last_activity field
    bio: 'bio',
    companyName: 'company_name',
    companyType: 'company_type',
    isPhoneVerified: 'is_phone_verified'
  },
  
  // Space table mappings (listings table)
  spaces: {
    id: 'id',
    hostId: 'partner_id', // Your actual column name
    name: 'name',
    description: 'description',
    category: 'category',
    subCategory: 'subcategory',
    capacity: 'capacity',
    size: 'area',
    priceHourly: 'hourly_price',
    priceDaily: 'daily_price',
    status: 'status', // pending, active, etc.
    location: 'address', // Your actual column name
    amenities: 'amenities', // JSON field
    images: 'images', // JSON field
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    bookingType: 'booking_type', // instant, approval
    openingTime: 'opening_time',
    closingTime: 'closing_time',
    availableDays: 'available_days',
    rules: 'rules',
    pricingPeriod: 'pricing_period',
    discounts: 'discounts'
  },
  
  // Booking table mappings
  bookings: {
    id: 'id',
    bookingId: 'id', // Use UUID as booking reference
    guestId: 'seeker_id', // Your actual column name
    spaceId: 'listing_id', // Your actual column name
    checkIn: 'start_time', // Your actual column name
    checkOut: 'end_time', // Your actual column name
    guests: 'guest_count', // Your actual column name
    status: 'status',
    paymentStatus: 'payment_status',
    paymentMethod: 'stripe_payment_method_id',
    transactionId: 'stripe_payment_intent_id',
    baseAmount: 'base_amount', // Base space rental amount (correct field)
    subtotal: 'base_amount', // Use base_amount instead of price for correct calculation
    serviceFee: 'service_fee',
    processingFee: 'payment_processing_fee',
    taxes: 'payment_processing_fee', // Alias for processingFee
    total: 'total_paid',
    specialRequests: 'special_requests',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    bookingType: 'booking_type',
    cancellationReason: 'cancellation_reason',
    cancelledAt: 'cancelled_at',
    completedAt: 'completed_at',
    paymentCapturedAt: 'payment_captured_at'
  }
}

/**
 * Status mappings for different status systems
 */
export const STATUS_MAPPINGS = {
  // User status mappings
  user: {
    active: 'active', // or 'active', 'enabled'
    suspended: 'suspended', // or 'disabled', 'banned'
    pending: 'pending', // or 'unverified'
    inactive: 'inactive'
  },
  
  // Space status mappings
  space: {
    pending: 'pending', // or 'under_review', 'awaiting_approval'
    active: 'active', // or 'approved', 'live'
    suspended: 'suspended', // or 'disabled', 'hidden'
    rejected: 'rejected', // or 'declined'
    draft: 'draft'
  },
  
  // Booking status mappings
  booking: {
    pending: 'pending', // or 'requested'
    confirmed: 'confirmed', // or 'approved'
    completed: 'completed', // or 'finished'
    cancelled: 'cancelled', // or 'canceled'
    expired: 'expired'
  },
  
  // Payment status mappings
  payment: {
    pending: 'pending',
    paid: 'paid', // or 'completed'
    failed: 'failed',
    refunded: 'refunded',
    cancelled: 'cancelled'
  }
}

/**
 * Helper function to get the correct table name
 */
export const getTableName = (adminTableName) => {
  return TABLE_MAPPINGS[adminTableName] || adminTableName
}

/**
 * Helper function to get the correct column name
 */
export const getColumnName = (tableName, adminColumnName) => {
  const mappings = COLUMN_MAPPINGS[tableName]
  return mappings?.[adminColumnName] || adminColumnName
}

/**
 * Helper function to map status values
 */
export const mapStatus = (type, adminStatus) => {
  const mappings = STATUS_MAPPINGS[type]
  return mappings?.[adminStatus] || adminStatus
}

/**
 * Configuration for your existing database
 * Update this based on your actual setup
 */
export const DATABASE_CONFIG = {
  // Authentication setup
  auth: {
    useSupabaseAuth: true, // Are you using Supabase Auth?
    userTable: 'users', // or 'profiles'
    adminRoleField: 'role', // column that stores user roles
    adminRoles: ['admin', 'super_admin', 'moderator'] // valid admin roles
  },
  
  // File storage setup
  storage: {
    bucketNames: {
      spaces: 'space-images', // or 'listings', 'properties'
      users: 'user-avatars', // or 'profiles'
      content: 'content-images',
      documents: 'documents'
    }
  },
  
  // Real-time setup
  realtime: {
    enabled: true,
    channels: {
      spaces: 'spaces-changes',
      bookings: 'bookings-changes',
      users: 'users-changes',
      support: 'support-changes'
    }
  }
}

export default {
  TABLE_MAPPINGS,
  COLUMN_MAPPINGS,
  STATUS_MAPPINGS,
  getTableName,
  getColumnName,
  mapStatus,
  DATABASE_CONFIG
}
