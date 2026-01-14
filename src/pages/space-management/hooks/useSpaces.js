import { useState, useEffect } from 'react'
import { db, supabase } from '../../../lib/supabase'
import { useAuth } from '../../../contexts/AuthContext'
import NotificationService from '../../../services/notificationService'

// Safe toast function that won't break if ToastProvider is not available
const safeToast = (message, type) => {
  try {
    // Try to use console for now, can be enhanced later
    console.log(`[${type.toUpperCase()}] ${message}`)
  } catch (error) {
    console.log(`Toast: ${message}`)
  }
}

// Custom hook for space management operations
export const useSpaces = () => {
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [updatingSpaceId, setUpdatingSpaceId] = useState(null)
  const { user, isAdmin, loading: authLoading } = useAuth()

  // Test database connection and table structure
  const testDatabaseConnection = async () => {
    try {
      console.log('🔍 Testing database connection...')
      
      // Test if spaces/listings table exists
      const { data: spacesTest, error: spacesError } = await supabase.from('listings').select('id').limit(1)
      console.log('Spaces/Listings table test:', { data: spacesTest, error: spacesError })
      
      // Test if users/profiles table exists
      const { data: usersTest, error: usersError } = await db.users.select('id').limit(1)
      console.log('Users/Profiles table test:', { data: usersTest, error: usersError })
      
      // Also test direct table access
      const { data: directListingsTest, error: directListingsError } = await supabase.from('listings').select('id').limit(1)
      console.log('Direct listings table test:', { data: directListingsTest, error: directListingsError })
      
      const { data: directProfilesTest, error: directProfilesError } = await supabase.from('profiles').select('id').limit(1)
      console.log('Direct profiles table test:', { data: directProfilesTest, error: directProfilesError })
      
      // Test full listings query
      const { data: fullListingsTest, error: fullListingsError } = await supabase.from('listings').select('id, name, partner_id').limit(10)
      console.log('Full listings test (10 records):', { data: fullListingsTest, error: fullListingsError })
      
      return { spacesError, usersError, directListingsError, directProfilesError }
    } catch (err) {
      console.error('Database connection test failed:', err)
      return { error: err }
    }
  }

  // Fetch all spaces with timeout
  const fetchSpaces = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Fetching spaces from database...')
      
      // Check authentication status
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      console.log('🔐 Current session:', { 
        user: session?.user?.email, 
        userId: session?.user?.id,
        hasSession: !!session,
        sessionError 
      })
      
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
      )
      
      const fetchPromise = async () => {
        // Test database connection first
        const connectionTest = await testDatabaseConnection()
        
        // First, try to fetch just the spaces without joins to see the structure
        let data, fetchError
        
        try {
          console.log('🔍 Fetching all listings from database...')
          // Use direct Supabase query to fetch all listings without limit
          // Fetch all spaces by using a high limit or removing limit entirely
          const result = await supabase.from('listings')
            .select(`
              id,
              name,
              description,
              category,
              subcategory,
              capacity,
              area,
              hourly_price,
              daily_price,
              status,
              address,
              amenities,
              images,
              available_dates,
              rules,
              admin_notes,
              partner_id,
              created_at,
              updated_at,
              submitted_at
            `)
            .neq('status', 'deleted') // Exclude deleted spaces
            .order('created_at', { ascending: false })
            // Remove limit to fetch all spaces, or use a very high limit
            .limit(1000)
          data = result.data
          fetchError = result.error
          console.log('✅ Direct listings query result:', { dataLength: data?.length, error: fetchError })
          
          if (fetchError) {
            console.error('❌ Error fetching listings:', fetchError)
            throw fetchError
          }
        } catch (err) {
          console.error('❌ Failed to fetch listings:', err)
          throw err
        }

      if (fetchError) {
          console.error('❌ Database error:', fetchError)
        throw fetchError
      }

      // Debug: Log raw data to see what we're getting
      if (data && data.length > 0) {
        console.log('📦 Raw space data sample:', {
          id: data[0].id,
          name: data[0].name,
          address: data[0].address,
          addressType: typeof data[0].address,
          hasLocation: !!data[0].location,
          allKeys: Object.keys(data[0])
        })
      }

        // Initialize profiles object
        let profiles = {}

        // Use only real data from database - no mock/sample data
        if (!data || data.length === 0) {
          console.log('ℹ️ No spaces found in database')
          data = []
        } else {
          console.log('✅ Found', data.length, 'space(s) in database')
        }

        console.log('✅ Fetched spaces:', data)
        console.log('📊 Total spaces fetched:', data?.length || 0)
        console.log('🔍 Sample space data:', data?.[0])
        console.log('🔍 Full space data structure:', JSON.stringify(data?.[0], null, 2))
        
        // Now try to fetch profiles separately and merge them
        // Helper function to validate UUID format
        const isValidUUID = (str) => {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          return str && typeof str === 'string' && uuidRegex.test(str)
        }
        
        const allPartnerIds = data?.map(space => space.partner_id).filter(Boolean) || []
        // Filter out invalid UUIDs (like 'sample-host-1', 'mock-host-1', etc.)
        const spaceIds = allPartnerIds.filter(id => isValidUUID(id))
        console.log('👥 Partner IDs found:', allPartnerIds)
        console.log('✅ Valid UUID partner IDs:', spaceIds)
        if (allPartnerIds.length !== spaceIds.length) {
          console.warn('⚠️ Filtered out', allPartnerIds.length - spaceIds.length, 'invalid partner IDs')
        }
        console.log('🔍 All partner_id values:', data?.map(space => ({ id: space.id, partner_id: space.partner_id })))
        
        if (spaceIds.length > 0) {
          try {
            console.log('🔍 Fetching profiles for partner IDs:', spaceIds)
            let profilesData, profilesError
            
            // Use direct Supabase access for profiles to avoid RLS issues
            console.log('🔍 Using direct profiles table access...')
            const result = await supabase.from('profiles')
              .select('id, email, first_name, last_name, avatar_url, phone')
              .in('id', spaceIds)
            profilesData = result.data
            profilesError = result.error
            console.log('✅ Direct profiles query result:', { dataLength: profilesData?.length, error: profilesError })
            
            if (profilesError) {
              console.warn('⚠️ Could not fetch profiles:', profilesError)
            } else if (profilesData && profilesData.length > 0) {
              profiles = profilesData.reduce((acc, profile) => {
                acc[profile.id] = profile
                return acc
              }, {})
              console.log('✅ Fetched profiles:', profiles)
              console.log('📊 Profiles lookup object keys:', Object.keys(profiles))
              console.log('📊 Profiles data details:', profilesData.map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name}`, email: p.email })))
            } else {
              console.warn('⚠️ No profiles data returned')
              console.log('🔍 Expected partner IDs:', spaceIds)
              console.log('🔍 Profiles query result:', { profilesData, profilesError })
            }
          } catch (profilesErr) {
            console.warn('⚠️ Profiles fetch failed:', profilesErr)
          }
        } else {
          console.warn('⚠️ No partner IDs found to fetch profiles for')
        }
        
        // Transform the data to match the expected format
        const transformedSpaces = (data || []).map(space => {
          console.log('🔄 Transforming space:', space.id, space.name)
          console.log('📍 Space address data:', { 
            address: space.address, 
            addressType: typeof space.address,
            location: space.location 
          })
          
          return {
            id: space.id,
            name: space.name || 'Untitled Space',
            description: space.description || '',
            category: space.category || 'general',
            sub_category: space.subcategory,
            capacity: space.capacity || 1,
            size: space.area || 0,
            price: space.hourly_price || 0,
            price_per_day: space.daily_price,
            status: space.status || 'pending',
            location: (() => {
              // Handle address - could be a string or JSONB object
              let address = ''
              let city = ''
              let state = ''
              let zipCode = ''
              let country = ''
              
              // Check if address exists and is not null/undefined
              if (space.address !== null && space.address !== undefined) {
                // If address is a string, use it as-is
                if (typeof space.address === 'string') {
                  address = space.address.trim()
                } 
                // If address is an object/JSONB, extract fields
                else if (typeof space.address === 'object' && space.address !== null) {
                  address = (space.address.address || space.address.street || '').trim()
                  city = (space.address.city || '').trim()
                  state = (space.address.state || '').trim()
                  zipCode = (space.address.zipCode || space.address.zip_code || '').trim()
                  country = (space.address.country || '').trim()
                }
              }
              
              // Fallback to existing location object if available
              if (space.location && typeof space.location === 'object') {
                address = address || (space.location.address || '').trim()
                city = city || (space.location.city || '').trim()
                state = state || (space.location.state || '').trim()
                zipCode = zipCode || (space.location.zipCode || '').trim()
                country = country || (space.location.country || '').trim()
              }
              
              console.log('📍 Transformed location:', { address, city, state, zipCode, country })
              
              return {
                address: address || '',
                city: city || '',
                state: state || '',
                zipCode: zipCode || '',
                country: country || ''
              }
            })(),
            amenities: space.amenities || [],
            images: space.images || [],
            availability: space.available_dates || [],
            moderation_notes: space.admin_notes || '',
            submitted_at: space.created_at,
            approved_at: space.status === 'active' ? space.created_at : null,
            created_at: space.created_at,
            updated_at: space.updated_at,
            host: (() => {
              const profile = profiles[space.partner_id]
              console.log(`🔍 Host lookup for space ${space.id}:`, { 
                partner_id: space.partner_id, 
                profile_found: !!profile,
                profile_data: profile 
              })
              return profile ? {
                id: profile.id,
                name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Host',
                email: profile.email || '',
                phone: profile.phone || '',
                avatar: profile.avatar_url || '/assets/images/no_image.png',
                joinedAt: profile.created_at || new Date().toISOString()
              } : {
                id: space.partner_id,
                name: 'Unknown Host',
                email: '',
                phone: '',
                avatar: '/assets/images/no_image.png',
                joinedAt: new Date().toISOString()
              }
            })()
          }
        })

        console.log('✅ Transformed spaces:', transformedSpaces.length)
        if (transformedSpaces.length > 0) {
        console.log('🔍 Sample transformed space:', transformedSpaces[0])
          console.log('📍 Sample location data:', transformedSpaces[0].location)
        }
        setSpaces(transformedSpaces)
      }
      
      // Race between timeout and actual fetch
      await Promise.race([fetchPromise(), timeoutPromise])
      
    } catch (err) {
      console.error('Error fetching spaces:', err)
      setError(err)
      safeToast('Failed to load spaces', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Update space status (approve, reject, suspend)
  const updateSpaceStatus = async (spaceId, status, notes = null) => {
    if (isUpdatingStatus) {
      return { success: false, error: 'Status update already in progress' }
    }

    try {
      setIsUpdatingStatus(true)
      setUpdatingSpaceId(spaceId)
      
      const nowIso = new Date().toISOString()
      // First, get the listing data with partner info for notifications
      const { data: listingData, error: fetchError } = await supabase
        .from('listings')
        .select('id, name, partner_id, status')
        .eq('id', spaceId)
        .single()

      if (fetchError) {
        throw fetchError
      }

      const updateData = {
        status,
        updated_at: nowIso
      }

      if (notes) {
        updateData.admin_notes = notes
      }

      if (status === 'active') {
        updateData.approved_at = nowIso
        updateData.approved_by = user?.id
      }

      // Suspension fields
      if (status === 'suspended') {
        updateData.suspended_at = nowIso
        updateData.suspended_by = user?.id || null
        updateData.suspension_reason = notes || null
      } else if (status === 'active' && listingData?.status === 'suspended') {
        // Unsuspending
        updateData.suspended_at = null
        updateData.suspended_by = null
        updateData.suspension_reason = null
      }

      const { data, error: updateError } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', spaceId)
        .select()

      if (updateError) {
        throw updateError
      }

      // Send suspension/reinstatement/approval email immediately
      try {
        if (status === 'suspended') {
          const { error: fnError } = await supabase.functions.invoke('send-suspension-email', {
            body: {
              listingId: spaceId,
              suspensionReason: notes || null,
              suspendedBy: user?.id || null,
              suspendedAt: nowIso
            }
          })
          if (fnError) {
            console.error('Error sending listing suspension email:', fnError)
            safeToast('Listing suspended, but email failed to send', 'warning')
          }
        } else if (status === 'active' && listingData?.status === 'suspended') {
          // Reinstating a suspended listing
          const { error: fnError } = await supabase.functions.invoke('send-reinstatement-email', {
            body: {
              listingId: spaceId,
              reinstatedAt: nowIso
            }
          })
          if (fnError) {
            console.error('Error sending listing reinstatement email:', fnError)
            safeToast('Listing reinstated, but email failed to send', 'warning')
          }
        } else if (status === 'active' && listingData?.status === 'pending') {
          // Approving a pending listing - send approval email
          console.log('📧 Sending approval email for pending listing:', spaceId)
          const { error: fnError, data: emailData } = await supabase.functions.invoke('send-approval-email', {
            body: {
              listingId: spaceId,
              adminNotes: notes || null,
              approvedAt: nowIso
            }
          })
          if (fnError) {
            console.error('❌ Error sending listing approval email:', fnError)
            safeToast('Listing approved, but email failed to send', 'warning')
          } else {
            console.log('✅ Approval email sent to partner successfully:', emailData)
          }
        } else if (status === 'active') {
          // If approving but status wasn't pending, still try to send email (might be reinstating or other case)
          // Only send if it's actually a new approval (has approved_at timestamp)
          if (updateData.approved_at) {
            console.log('📧 Sending approval email for listing (non-pending to active):', spaceId)
            const { error: fnError } = await supabase.functions.invoke('send-approval-email', {
              body: {
                listingId: spaceId,
                adminNotes: notes || null,
                approvedAt: nowIso
              }
            })
            if (fnError) {
              console.error('❌ Error sending listing approval email:', fnError)
              // Don't show warning for non-pending approvals as it might be expected
            } else {
              console.log('✅ Approval email sent to partner')
            }
          }
        } else if (status === 'rejected') {
          // Rejecting a listing - send rejection email
          console.log('📧 Sending rejection email for listing:', spaceId)
          const rejectionReason = notes || 'Your listing requires some changes before it can be approved.'
          const { error: fnError, data: emailData } = await supabase.functions.invoke('send-rejection-email', {
            body: {
              listingId: spaceId,
              rejectionReason: rejectionReason,
              rejectedAt: nowIso
            }
          })
          if (fnError) {
            console.error('❌ Error sending listing rejection email:', fnError)
            safeToast('Listing rejected, but email failed to send', 'warning')
          } else {
            console.log('✅ Rejection email sent to partner successfully:', emailData)
          }
        }
      } catch (emailErr) {
        console.error('Error invoking email function:', emailErr)
        safeToast('Status updated, but email failed to send', 'warning')
      }

      // Send notification to partner based on status
      if (listingData.partner_id) {
        try {
          if (status === 'active') {
            // Send approval notification
            const notificationResult = await NotificationService.sendListingApprovalNotification(
              listingData, 
              listingData.partner_id
            )
            
            if (!notificationResult.success) {
              console.warn('Failed to send approval notification:', notificationResult.error)
            } else {
              console.log('✅ Approval notification sent to partner:', listingData.partner_id)
            }
          } else if (status === 'rejected') {
            // Send rejection notification
            const rejectionReason = notes || 'Your listing requires some changes before it can be approved.'
            const notificationResult = await NotificationService.sendListingRejectionNotification(
              listingData, 
              listingData.partner_id, 
              rejectionReason
            )
            
            if (!notificationResult.success) {
              console.warn('Failed to send rejection notification:', notificationResult.error)
            } else {
              console.log('✅ Rejection notification sent to partner:', listingData.partner_id)
            }
          }
        } catch (notificationError) {
          console.error('Error sending notification:', notificationError)
          // Don't fail the entire operation if notification fails
        }
      }

      // Update local state
      setSpaces(prev => prev.map(space => 
        space.id === spaceId 
          ? { ...space, ...updateData }
          : space
      ))

      safeToast(`Space ${status} successfully`, 'success')

      return { success: true, data }
    } catch (err) {
      console.error('Error updating space status:', err)
      safeToast(`Failed to ${status} space`, 'error')
      return { success: false, error: err }
    } finally {
      setIsUpdatingStatus(false)
      setUpdatingSpaceId(null)
    }
  }

  // Bulk update multiple spaces
  const bulkUpdateSpaces = async (spaceIds, status, notes = null) => {
    try {
      // First, get the listing data with partner info for notifications
      const { data: listingsData, error: fetchError } = await supabase
        .from('listings')
        .select('id, name, partner_id')
        .in('id', spaceIds)

      if (fetchError) {
        throw fetchError
      }

      const updateData = {
        status,
        updated_at: new Date().toISOString()
      }

      if (notes) {
        updateData.admin_notes = notes
      }

      if (status === 'active') {
        updateData.approved_at = new Date().toISOString()
        updateData.approved_by = user?.id
      }

      const { data, error: updateError } = await supabase
        .from('listings')
        .update(updateData)
        .in('id', spaceIds)
        .select()

      if (updateError) {
        throw updateError
      }

      // Send emails and notifications to partners for each listing
      if (listingsData && listingsData.length > 0) {
        const notificationPromises = listingsData.map(async (listing) => {
          if (!listing.partner_id) return

          try {
            if (status === 'active') {
              // Send approval email
              try {
                const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
                  body: {
                    listingId: listing.id,
                    adminNotes: notes || null,
                    approvedAt: new Date().toISOString()
                  }
                })
                if (emailError) {
                  console.error(`Error sending approval email for listing ${listing.id}:`, emailError)
                } else {
                  console.log(`✅ Bulk approval email sent for listing: ${listing.id}`)
                }
              } catch (emailErr) {
                console.error(`Error invoking approval email for listing ${listing.id}:`, emailErr)
              }

              // Send approval notification
              const result = await NotificationService.sendListingApprovalNotification(
                listing, 
                listing.partner_id
              )
              if (result.success) {
                console.log(`✅ Bulk approval notification sent for listing: ${listing.id}`)
              }
            } else if (status === 'rejected') {
              // Send rejection email
              const rejectionReason = notes || 'Your listing requires some changes before it can be approved.'
              try {
                const { error: emailError } = await supabase.functions.invoke('send-rejection-email', {
                  body: {
                    listingId: listing.id,
                    rejectionReason: rejectionReason,
                    rejectedAt: new Date().toISOString()
                  }
                })
                if (emailError) {
                  console.error(`Error sending rejection email for listing ${listing.id}:`, emailError)
                } else {
                  console.log(`✅ Bulk rejection email sent for listing: ${listing.id}`)
                }
              } catch (emailErr) {
                console.error(`Error invoking rejection email for listing ${listing.id}:`, emailErr)
              }

              // Send rejection notification
              const result = await NotificationService.sendListingRejectionNotification(
                listing, 
                listing.partner_id, 
                rejectionReason
              )
              if (result.success) {
                console.log(`✅ Bulk rejection notification sent for listing: ${listing.id}`)
              }
            }
          } catch (notificationError) {
            console.error(`Error sending notification for listing ${listing.id}:`, notificationError)
          }
        })

        // Wait for all notifications to complete (but don't fail if some fail)
        await Promise.allSettled(notificationPromises)
      }

      // Update local state
      setSpaces(prev => prev.map(space => 
        spaceIds.includes(space.id)
          ? { ...space, ...updateData }
          : space
      ))

      safeToast(`${spaceIds.length} spaces ${status} successfully`, 'success')

      return { success: true, data }
    } catch (err) {
      console.error('Error bulk updating spaces:', err)
      safeToast(`Failed to ${status} spaces`, 'error')
      return { success: false, error: err }
    }
  }

  // Get space statistics - case-insensitive status matching
  const getSpaceStats = () => {
    const total = spaces.length
    const pending = spaces.filter(s => (s.status || '').toLowerCase() === 'pending').length
    const active = spaces.filter(s => (s.status || '').toLowerCase() === 'active').length
    const suspended = spaces.filter(s => (s.status || '').toLowerCase() === 'suspended').length
    const rejected = spaces.filter(s => (s.status || '').toLowerCase() === 'rejected').length

    return {
      total,
      pending,
      active,
      suspended,
      rejected
    }
  }

  // Filter spaces based on criteria
  const filterSpaces = (filters, categories = []) => {
    console.log('🔍 Filtering spaces with filters:', filters)
    console.log('📊 Total spaces before filtering:', spaces.length)
    console.log('📋 Available categories:', categories)
    
    let filtered = [...spaces]
    console.log('📊 Spaces after copying:', filtered.length)

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(space =>
        space.name?.toLowerCase().includes(searchTerm) ||
        space.host?.name?.toLowerCase().includes(searchTerm) ||
        space.host?.email?.toLowerCase().includes(searchTerm)
      )
    }

    // Status filter - case-insensitive matching
    if (filters.status && filters.status !== 'all') {
      const statusFilter = filters.status.toLowerCase().trim()
      const beforeCount = filtered.length
      
      filtered = filtered.filter(space => {
        // Normalize space status - handle null, undefined, and case variations
        const spaceStatus = (space.status || 'pending').toLowerCase().trim()
        const matches = spaceStatus === statusFilter
        
        return matches
      })
      
      console.log(`📊 Status filter: ${beforeCount} → ${filtered.length} spaces (filter: "${filters.status}")`)
    }

    // Category filter - match by main category
    if (filters.category && filters.category !== 'all') {
      // Find the selected category from the categories list
      const selectedCategory = categories.find(cat => 
        (cat.id === filters.category) || 
        (cat.name === filters.category) ||
        (cat.label === filters.category)
      )
      
      if (selectedCategory) {
        // Get all possible matches for this category
        const categoryMatches = [
          selectedCategory.name,           // e.g., "office"
          selectedCategory.label,          // e.g., "Office Space"
          selectedCategory.label.split(' ')[0], // e.g., "Office" from "Office Space"
          selectedCategory.id              // e.g., "office"
        ].filter(Boolean) // Remove any undefined/null values
        
        console.log('🎯 Filtering by category:', selectedCategory.label, 'Matches:', categoryMatches)
        
        filtered = filtered.filter(space => {
          const spaceCategory = space.category || ''
          const spaceSubCategory = space.sub_category || ''
          
          // Check if space category matches any of our category matches
          const matches = categoryMatches.some(match => {
            // Case-insensitive comparison
            const matchLower = match.toLowerCase()
            const spaceCategoryLower = spaceCategory.toLowerCase()
            const spaceSubCategoryLower = spaceSubCategory.toLowerCase()
            
            return spaceCategoryLower === matchLower ||
                   spaceCategoryLower.includes(matchLower) ||
                   matchLower.includes(spaceCategoryLower) ||
                   spaceSubCategoryLower === matchLower ||
                   spaceSubCategoryLower.includes(matchLower)
          })
          
          return matches
        })
        
        console.log('✅ Spaces after category filter:', filtered.length)
      } else {
        console.warn('⚠️ Selected category not found in categories list:', filters.category)
      }
    }


    // Price range filter
    if (filters.priceRange) {
      if (filters.priceRange.min) {
        filtered = filtered.filter(space => space.price >= parseInt(filters.priceRange.min))
      }
      if (filters.priceRange.max) {
        filtered = filtered.filter(space => space.price <= parseInt(filters.priceRange.max))
      }
    }

    // Amenities filter
    if (filters.amenities && filters.amenities.length > 0) {
      filtered = filtered.filter(space =>
        filters.amenities.every(amenity =>
          space.amenities?.some(spaceAmenity =>
            spaceAmenity.toLowerCase().includes(amenity.toLowerCase())
          )
        )
      )
    }

    console.log('📊 Final filtered spaces count:', filtered.length)
    console.log('🔍 Sample filtered space:', filtered[0])
    return filtered
  }

  // Helper function to add sample data to database (for testing)
  const addSampleDataToDatabase = async () => {
    try {
      console.log('🔧 Adding sample data to database...')
      
      // Get a valid partner_id (or use null if none exists)
      let partnerId = null
      try {
        const { data: partners } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'partner')
          .limit(1)
        
        if (partners && partners.length > 0) {
          partnerId = partners[0].id
          console.log('✅ Found partner ID for sample data:', partnerId)
        } else {
          console.warn('⚠️ No partner found, sample spaces will have null partner_id')
        }
      } catch (err) {
        console.warn('⚠️ Error fetching partner ID:', err)
      }
      
      // Sample data matching the actual listings table structure
      const sampleSpaces = [
        {
          name: 'Modern Coworking Space',
          description: 'A vibrant coworking environment with all amenities. Perfect for remote workers and small teams.',
          category: 'Office',
          subcategory: 'Coworking Space',
          capacity: 20,
          area: 800,
          hourly_price: 15,
          daily_price: 120,
          status: 'pending', // Start as pending so admin can approve
          address: '789 Innovation Blvd, San Francisco, CA 94105, USA',
          amenities: ['WiFi', 'Coffee', 'Printing', 'Parking'],
          images: [],
          partner_id: partnerId,
          booking_type: 'approval',
          pricing_period: 'Hourly',
          submitted_at: new Date().toISOString()
        },
        {
          name: 'Retail Storefront',
          description: 'Prime retail location in busy shopping district. Great visibility and foot traffic.',
          category: 'Retail',
          subcategory: 'Storefront',
          capacity: 50,
          area: 1200,
          hourly_price: 30,
          daily_price: 240,
          status: 'pending',
          address: '321 Commerce St, Chicago, IL 60601, USA',
          amenities: ['WiFi', 'Security', 'Storage'],
          images: [],
          partner_id: partnerId,
          booking_type: 'approval',
          pricing_period: 'Daily',
          submitted_at: new Date().toISOString()
        },
        {
          name: 'Warehouse Storage',
          description: 'Large warehouse space suitable for storage, events, or manufacturing. High ceilings and loading dock access.',
          category: 'Industrial',
          subcategory: 'Warehouse',
          capacity: 100,
          area: 5000,
          hourly_price: 50,
          daily_price: 400,
          status: 'pending',
          address: '456 Industrial Way, Los Angeles, CA 90001, USA',
          amenities: ['Loading Dock', 'Security', 'Parking', 'HVAC'],
          images: [],
          partner_id: partnerId,
          booking_type: 'approval',
          pricing_period: 'Daily',
          submitted_at: new Date().toISOString()
        }
      ]
      
      // Insert sample data using Supabase client
      const { data: insertedData, error: insertError } = await supabase
        .from('listings')
        .insert(sampleSpaces)
        .select()
      
      if (insertError) {
        console.error('❌ Error inserting sample data:', insertError)
        safeToast(`Failed to add sample data: ${insertError.message}`, 'error')
        return { success: false, error: insertError }
      }
      
      console.log('✅ Sample data inserted successfully:', insertedData)
      safeToast(`Successfully added ${insertedData?.length || 0} sample spaces`, 'success')
      
      // Refresh the spaces
      await fetchSpaces()
      
      return { success: true, data: insertedData }
    } catch (err) {
      console.error('Error adding sample data:', err)
      safeToast(`Failed to add sample data: ${err.message || 'Unknown error'}`, 'error')
      return { success: false, error: err }
    }
  }

  // Load spaces on component mount and when auth state changes
  useEffect(() => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...')
      setLoading(true)
      return
    }

    // Don't fetch if user is not authenticated or not admin
    if (!user || !isAdmin) {
      console.log('⚠️ User not authenticated or not admin, clearing spaces')
      setSpaces([])
      setLoading(false)
      setError(null)
      return
    }

    console.log('✅ User authenticated as admin, fetching spaces...')
    fetchSpaces()
  }, [user, isAdmin, authLoading])

  return {
    spaces,
    loading,
    error,
    refresh: fetchSpaces,
    updateSpaceStatus,
    bulkUpdateSpaces,
    getSpaceStats,
    filterSpaces,
    addSampleDataToDatabase,
    isUpdatingStatus,
    updatingSpaceId
  }
}

export default useSpaces
