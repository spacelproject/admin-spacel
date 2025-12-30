/**
 * Input validation utilities for database queries and user inputs
 */

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validate UUID format
 */
export const isValidUUID = (id) => {
  if (!id || typeof id !== 'string') return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

/**
 * Validate that a value is not null, undefined, or empty string
 */
export const isNotEmpty = (value) => {
  return value !== null && value !== undefined && value !== ''
}

/**
 * Validate numeric value
 */
export const isValidNumber = (value, options = {}) => {
  const { min, max, allowFloat = true } = options
  const num = allowFloat ? parseFloat(value) : parseInt(value, 10)
  
  if (isNaN(num)) return false
  if (min !== undefined && num < min) return false
  if (max !== undefined && num > max) return false
  
  return true
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return ''
  return str.trim().replace(/[<>]/g, '')
}

/**
 * Validate database query parameters
 */
export const validateQueryParams = (params) => {
  const errors = []
  
  if (params.id && !isValidUUID(params.id)) {
    errors.push('Invalid ID format')
  }
  
  if (params.email && !isValidEmail(params.email)) {
    errors.push('Invalid email format')
  }
  
  if (params.page && !isValidNumber(params.page, { min: 1 })) {
    errors.push('Invalid page number')
  }
  
  if (params.pageSize && !isValidNumber(params.pageSize, { min: 1, max: 100 })) {
    errors.push('Invalid page size (must be between 1 and 100)')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validate user input before database operations
 */
export const validateUserInput = (input, schema) => {
  const errors = []
  
  for (const [key, rules] of Object.entries(schema)) {
    const value = input[key]
    
    if (rules.required && !isNotEmpty(value)) {
      errors.push(`${key} is required`)
      continue
    }
    
    if (value !== undefined && value !== null) {
      if (rules.type === 'email' && !isValidEmail(value)) {
        errors.push(`${key} must be a valid email`)
      }
      
      if (rules.type === 'uuid' && !isValidUUID(value)) {
        errors.push(`${key} must be a valid UUID`)
      }
      
      if (rules.type === 'number' && !isValidNumber(value, rules.numberOptions)) {
        errors.push(`${key} must be a valid number`)
      }
      
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${key} must be at least ${rules.minLength} characters`)
      }
      
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${key} must be at most ${rules.maxLength} characters`)
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

