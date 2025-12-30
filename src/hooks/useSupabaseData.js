import { useState, useEffect, useCallback } from 'react'
import { supabase, subscribeToTable } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { logDebug } from '../utils/logger'

// Generic hook for fetching data from Supabase
export const useSupabaseData = (tableName, options = {}) => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const { showToast } = useToast()

  const {
    select = '*',
    filters = {},
    orderBy = null,
    limit = null,
    realtime = false,
    onError = null
  } = options

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase.from(tableName).select(select)

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            query = query.in(key, value)
          } else if (typeof value === 'object' && value.operator) {
            query = query[key](value.column || key, value.value)
          } else {
            query = query.eq(key, value)
          }
        }
      })

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending })
      }

      // Apply limit
      if (limit) {
        query = query.limit(limit)
      }

      const { data: result, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setData(result || [])
    } catch (err) {
      console.error(`Error fetching ${tableName}:`, err)
      setError(err)
      if (onError) {
        onError(err)
      } else {
        showToast({
          title: 'Error',
          description: `Failed to load ${tableName}`,
          type: 'error'
        })
      }
    } finally {
      setLoading(false)
    }
  }, [tableName, select, filters, orderBy, limit, onError, showToast])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up real-time subscription
  useEffect(() => {
    if (!realtime) return

    const subscription = subscribeToTable(
      tableName,
      (payload) => {
        logDebug(`${tableName} real-time update`, { eventType: payload.eventType })
        
        switch (payload.eventType) {
          case 'INSERT':
            setData(prev => [...prev, payload.new])
            break
          case 'UPDATE':
            setData(prev => prev.map(item => 
              item.id === payload.new.id ? payload.new : item
            ))
            break
          case 'DELETE':
            setData(prev => prev.filter(item => item.id !== payload.old.id))
            break
          default:
            // Refresh data for other events
            refresh()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [tableName, realtime, refresh])

  return {
    data,
    loading,
    error,
    refreshing,
    refresh,
    refetch: fetchData
  }
}

// Hook for single record operations
export const useSupabaseRecord = (tableName, id, options = {}) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { showToast } = useToast()

  const {
    select = '*',
    realtime = false
  } = options

  const fetchRecord = useCallback(async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      let query = supabase.from(tableName).select(select).eq('id', id)
      const { data: result, error: fetchError } = await query.single()

      if (fetchError) {
        throw fetchError
      }

      setData(result)
    } catch (err) {
      console.error(`Error fetching ${tableName} record:`, err)
      setError(err)
      showToast({
        title: 'Error',
        description: `Failed to load ${tableName} record`,
        type: 'error'
      })
    } finally {
      setLoading(false)
    }
  }, [tableName, id, select, showToast])

  useEffect(() => {
    fetchRecord()
  }, [fetchRecord])

  // Real-time subscription for single record
  useEffect(() => {
    if (!realtime || !id) return

    const subscription = subscribeToTable(
      tableName,
      (payload) => {
        if (payload.new.id === id || payload.old.id === id) {
          if (payload.eventType === 'DELETE') {
            setData(null)
          } else {
            fetchRecord()
          }
        }
      },
      { id: `eq.${id}` }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [tableName, id, realtime, fetchRecord])

  return {
    data,
    loading,
    error,
    refetch: fetchRecord
  }
}

// Hook for mutations (insert, update, delete)
export const useSupabaseMutation = (tableName) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { showToast } = useToast()

  const insert = useCallback(async (data) => {
    try {
      setLoading(true)
      setError(null)

      const { data: result, error: insertError } = await supabase
        .from(tableName)
        .insert(data)
        .select()

      if (insertError) {
        throw insertError
      }

      showToast({
        title: 'Success',
        description: `${tableName} created successfully`,
        type: 'success'
      })

      return { success: true, data: result }
    } catch (err) {
      console.error(`Error inserting into ${tableName}:`, err)
      setError(err)
      showToast({
        title: 'Error',
        description: `Failed to create ${tableName}`,
        type: 'error'
      })
      return { success: false, error: err }
    } finally {
      setLoading(false)
    }
  }, [tableName, showToast])

  const update = useCallback(async (id, data) => {
    try {
      setLoading(true)
      setError(null)

      const { data: result, error: updateError } = await supabase
        .from(tableName)
        .update(data)
        .eq('id', id)
        .select()

      if (updateError) {
        throw updateError
      }

      showToast({
        title: 'Success',
        description: `${tableName} updated successfully`,
        type: 'success'
      })

      return { success: true, data: result }
    } catch (err) {
      console.error(`Error updating ${tableName}:`, err)
      setError(err)
      showToast({
        title: 'Error',
        description: `Failed to update ${tableName}`,
        type: 'error'
      })
      return { success: false, error: err }
    } finally {
      setLoading(false)
    }
  }, [tableName, showToast])

  const remove = useCallback(async (id) => {
    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (deleteError) {
        throw deleteError
      }

      showToast({
        title: 'Success',
        description: `${tableName} deleted successfully`,
        type: 'success'
      })

      return { success: true }
    } catch (err) {
      console.error(`Error deleting from ${tableName}:`, err)
      setError(err)
      showToast({
        title: 'Error',
        description: `Failed to delete ${tableName}`,
        type: 'error'
      })
      return { success: false, error: err }
    } finally {
      setLoading(false)
    }
  }, [tableName, showToast])

  return {
    insert,
    update,
    remove,
    loading,
    error
  }
}

export default useSupabaseData
