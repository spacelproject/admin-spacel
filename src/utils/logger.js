/**
 * Logger utility that respects environment (dev vs production)
 * Removes sensitive data from logs in production
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development'

/**
 * Sanitize sensitive data from log messages
 */
const sanitizeData = (data) => {
  if (!data || typeof data !== 'object') return data
  
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'authorization', 'auth', 'anonKey', 'apiKey']
  const sanitized = { ...data }
  
  for (const key in sanitized) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeData(sanitized[key])
    }
  }
  
  return sanitized
}

/**
 * Log info messages (only in development)
 */
export const logInfo = (...args) => {
  if (isDevelopment) {
    const sanitized = args.map(arg => 
      typeof arg === 'object' ? sanitizeData(arg) : arg
    )
    console.log(...sanitized)
  }
}

/**
 * Log warnings (always, but sanitized in production)
 */
export const logWarn = (...args) => {
  const sanitized = args.map(arg => 
    typeof arg === 'object' ? sanitizeData(arg) : arg
  )
  console.warn(...sanitized)
}

/**
 * Log errors (always, but sanitized in production)
 */
export const logError = (...args) => {
  const sanitized = args.map(arg => 
    typeof arg === 'object' ? sanitizeData(arg) : arg
  )
  console.error(...sanitized)
}

/**
 * Log debug messages (only in development)
 */
export const logDebug = (...args) => {
  if (isDevelopment) {
    const sanitized = args.map(arg => 
      typeof arg === 'object' ? sanitizeData(arg) : arg
    )
    console.log('[DEBUG]', ...sanitized)
  }
}

/**
 * Log connection status (sanitized)
 */
export const logConnection = (service, status, details = {}) => {
  if (isDevelopment) {
    const sanitizedDetails = sanitizeData(details)
    console.log(`🔧 ${service}:`, status, sanitizedDetails)
  }
}

export default {
  info: logInfo,
  warn: logWarn,
  error: logError,
  debug: logDebug,
  connection: logConnection
}

