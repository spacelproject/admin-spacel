/**
 * Query helper utilities for Supabase queries
 */

/**
 * Add timeout to a promise
 * @param {Promise} promise - The promise to add timeout to
 * @param {number} timeoutMs - Timeout in milliseconds (default: 10000)
 * @returns {Promise} Promise that rejects on timeout
 */
export const withTimeout = (promise, timeoutMs = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Query timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ])
}

/**
 * Execute a Supabase query with timeout and error handling
 * @param {Function} queryFn - Function that returns a Supabase query promise
 * @param {Object} options - Options object
 * @param {number} options.timeout - Timeout in milliseconds
 * @param {string} options.errorMessage - Custom error message
 * @returns {Promise} Query result
 */
export const executeQuery = async (queryFn, options = {}) => {
  const { timeout = 10000, errorMessage = 'Query failed' } = options
  
  try {
    const result = await withTimeout(queryFn(), timeout)
    return result
  } catch (error) {
    if (error.message.includes('timeout')) {
      throw new Error(`${errorMessage}: Request timed out after ${timeout}ms`)
    }
    throw error
  }
}

/**
 * Pagination helper for Supabase queries
 * @param {Object} query - Supabase query builder
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Number of items per page
 * @returns {Object} Query with pagination applied
 */
export const applyPagination = (query, page = 1, pageSize = 50) => {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  return query.range(from, to)
}

