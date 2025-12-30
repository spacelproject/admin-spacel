/**
 * Standardized error handling utility
 * Provides consistent error handling patterns across the application
 */

import { logError, logWarn } from './logger'

/**
 * Standard error response format
 */
export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, details = null) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
    this.timestamp = new Date().toISOString()
  }
}

/**
 * Handle database errors consistently
 */
export const handleDatabaseError = (error, context = 'Database operation') => {
  logError(`${context} failed:`, error)
  
  // Supabase specific error codes
  if (error?.code === 'PGRST116') {
    return new AppError('Resource not found', 'NOT_FOUND', 404, error)
  }
  
  if (error?.code === 'PGRST301' || error?.code === '23505') {
    return new AppError('Duplicate entry', 'DUPLICATE_ENTRY', 409, error)
  }
  
  if (error?.code === '23503') {
    return new AppError('Foreign key constraint violation', 'FOREIGN_KEY_ERROR', 400, error)
  }
  
  if (error?.message?.includes('timeout') || error?.message?.includes('network')) {
    return new AppError('Database connection timeout', 'TIMEOUT', 504, error)
  }
  
  if (error?.message?.includes('permission denied') || error?.message?.includes('RLS')) {
    return new AppError('Permission denied', 'PERMISSION_DENIED', 403, error)
  }
  
  // Generic database error
  return new AppError(
    error?.message || 'Database operation failed',
    'DATABASE_ERROR',
    500,
    error
  )
}

/**
 * Handle API errors consistently
 */
export const handleApiError = (error, context = 'API request') => {
  logError(`${context} failed:`, error)
  
  if (error?.response) {
    const { status, data } = error.response
    return new AppError(
      data?.message || `API request failed with status ${status}`,
      'API_ERROR',
      status,
      data
    )
  }
  
  if (error?.request) {
    return new AppError('Network error - no response received', 'NETWORK_ERROR', 0, error)
  }
  
  return new AppError(
    error?.message || 'API request failed',
    'API_ERROR',
    500,
    error
  )
}

/**
 * Handle validation errors
 */
export const handleValidationError = (errors, context = 'Validation') => {
  logWarn(`${context} failed:`, errors)
  return new AppError(
    'Validation failed',
    'VALIDATION_ERROR',
    400,
    { errors }
  )
}

/**
 * Format error for user display
 */
export const formatErrorForUser = (error) => {
  if (error instanceof AppError) {
    // User-friendly messages for known error types
    const userMessages = {
      'NOT_FOUND': 'The requested resource was not found',
      'DUPLICATE_ENTRY': 'This record already exists',
      'FOREIGN_KEY_ERROR': 'Cannot perform this operation due to related records',
      'TIMEOUT': 'The request took too long. Please try again.',
      'PERMISSION_DENIED': 'You do not have permission to perform this action',
      'VALIDATION_ERROR': 'Please check your input and try again',
      'NETWORK_ERROR': 'Network error. Please check your connection.',
    }
    
    return userMessages[error.code] || error.message || 'An error occurred'
  }
  
  // Generic error message for unknown errors
  return 'An unexpected error occurred. Please try again.'
}

/**
 * Standard error handler for async operations
 */
export const withErrorHandling = async (operation, context = 'Operation') => {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }
    
    // Try to classify the error
    if (error?.code?.startsWith('PGRST') || error?.code?.startsWith('23')) {
      throw handleDatabaseError(error, context)
    }
    
    if (error?.response || error?.request) {
      throw handleApiError(error, context)
    }
    
    // Unknown error
    logError(`Unhandled error in ${context}:`, error)
    throw new AppError(
      error?.message || 'An unexpected error occurred',
      'UNKNOWN_ERROR',
      500,
      error
    )
  }
}

export default {
  AppError,
  handleDatabaseError,
  handleApiError,
  handleValidationError,
  formatErrorForUser,
  withErrorHandling
}

