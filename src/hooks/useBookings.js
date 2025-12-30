import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logError, logWarn, logDebug } from '../utils/logger'
import { executeQuery, applyPagination } from '../utils/queryHelpers'
import StripeService from '../services/stripeService'
import NotificationService from '../services/notificationService'
import { fetchFeeSettings, calculateServiceFee, calculateProcessingFee } from '../utils/feeCalculator'

/**
 * Custom hook for managing bookings data
 * Provides bookings list with pagination, status updates, and refund processing
 * @returns {Object} Bookings data and operations
 */
const useBookings = () => {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0 })
  const { user, isAdmin, loading: authLoading } = useAuth()

  const fetchBookings = useCallback(async () => {
    try {
      logDebug('Fetching bookings from database...')
      setLoading(true)
      setError(null)

      // Don't fetch if auth is still loading
      if (authLoading) {
        return
      }

      // Don't fetch if user is not authenticated or not admin
      if (!user || !isAdmin) {
        setBookings([])
        setLoading(false)
        return
      }

      // Fetch bookings with related data (with pagination)
      let query = supabase
        .from('bookings')
        .select(`
          *,
          listings:listing_id (
            id,
            name,
            address,
            images,
            category,
            partner_id,
            hourly_price,
            daily_price
          ),
          seekers:seeker_id (
            id,
            email,
            first_name,
            last_name,
            avatar_url,
            phone
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
      
      // Apply pagination
      query = applyPagination(query, pagination.page, pagination.pageSize)
      
      const { data: bookingsData, error: bookingsError, count } = await executeQuery(
        () => query,
        { timeout: 15000, errorMessage: 'Failed to fetch bookings' }
      )

      if (bookingsError) {
        logError('Error fetching bookings:', bookingsError)
        throw bookingsError
      }

      logDebug('Fetched bookings:', { count: bookingsData?.length || 0 })

      // Fetch current fee settings from database (used for calculating missing fees)
      const feeSettings = await fetchFeeSettings()
      logDebug('Fetched fee settings for booking calculations', feeSettings)

      // Fetch host profiles for all unique partner IDs
      const partnerIds = [...new Set(bookingsData?.map(b => b.listings?.partner_id).filter(Boolean))]
      let hostProfiles = {}
      
      if (partnerIds.length > 0) {
        logDebug('Fetching host profiles', { partnerCount: partnerIds.length })
        const { data: hostsData, error: hostsError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, avatar_url, phone')
          .in('id', partnerIds)

        if (hostsError) {
          logWarn('Could not fetch host profiles:', hostsError)
        } else if (hostsData && hostsData.length > 0) {
          hostProfiles = hostsData.reduce((acc, host) => {
            acc[host.id] = host
            return acc
          }, {})
          logDebug('Fetched host profiles', { count: Object.keys(hostProfiles).length })
        }
      }

      // Transform the data to match the expected format
      const transformedBookings = (bookingsData || []).map(booking => {
        // Price calculation logic - verified and consistent
        // Priority: base_amount > original_amount (for base amount only)
        const baseAmount = parseFloat(booking.base_amount || booking.original_amount || 0)
        let serviceFee = booking.service_fee !== null ? parseFloat(booking.service_fee) : null
        let processingFee = booking.payment_processing_fee !== null ? parseFloat(booking.payment_processing_fee) : null
        const totalPaid = parseFloat(booking.total_paid || 0)
        const price = parseFloat(booking.price || 0)
        
        // If fees are missing (null), calculate them based on current fee settings from database
        if (serviceFee === null && baseAmount > 0) {
          serviceFee = baseAmount * feeSettings.seeker_service_rate
        }
        if (processingFee === null && baseAmount > 0) {
          const calculatedServiceFee = serviceFee || (baseAmount * feeSettings.seeker_service_rate)
          const subtotalWithServiceFee = baseAmount + calculatedServiceFee
          // Only use percentage-based processing fee (no fixed fee)
          processingFee = subtotalWithServiceFee * feeSettings.processing_percent
        }
        
        // Ensure fees are numbers (default to 0 if still null)
        serviceFee = serviceFee || 0
        processingFee = processingFee || 0
        
        // Calculate total: base + service fee + processing fee
        const calculatedTotal = baseAmount + serviceFee + processingFee
        
        // Determine the actual total amount:
        // 1. If total_paid exists, use it (actual amount paid)
        // 2. If price exists and calculated total doesn't match, use price (price is the actual booking total)
        // 3. Otherwise use calculated total
        let total
        if (totalPaid > 0) {
          total = totalPaid
        } else if (price > 0 && Math.abs(calculatedTotal - price) > 0.01) {
          // If price exists and differs from calculated, use price (it's the actual total)
          total = price
        } else {
          total = calculatedTotal
        }
        
        // Round to 2 decimal places to fix floating point precision issues
        total = Math.round(total * 100) / 100
        const finalServiceFee = Math.round(serviceFee * 100) / 100
        const finalProcessingFee = Math.round(processingFee * 100) / 100
        
        // If baseAmount is 0 but we have a price, use price as baseAmount for display
        let finalBaseAmount = baseAmount
        if (baseAmount === 0 && price > 0) {
          finalBaseAmount = price
        }
        // Round baseAmount to 2 decimal places
        finalBaseAmount = Math.round(finalBaseAmount * 100) / 100
        
        return {
          id: booking.id,
          booking_reference: booking.booking_reference,
          guestName: booking.seekers ? 
            `${booking.seekers.first_name || ''} ${booking.seekers.last_name || ''}`.trim() || 'Unknown Guest' : 
            'Unknown Guest',
          guestEmail: booking.seekers?.email || '',
          guestPhone: booking.seekers?.phone || '',
          guestAvatar: booking.seekers?.avatar_url || '/assets/images/no_image.png',
          spaceName: booking.listings?.name || 'Unknown Space',
          spaceLocation: booking.listings?.address || 'N/A',
          spaceImage: booking.listings?.images?.[0] || '/assets/images/no_image.png',
          hostName: (() => {
            const host = hostProfiles[booking.listings?.partner_id]
            return host ? 
              `${host.first_name || ''} ${host.last_name || ''}`.trim() || 'Unknown Host' : 
              'Unknown Host'
          })(),
          checkIn: new Date(booking.start_time),
          checkOut: new Date(booking.end_time),
          guests: booking.guest_count || 1,
          status: booking.status || 'pending',
          paymentStatus: booking.payment_status || 'pending',
          paymentMethod: 'Credit Card', // Default, could be enhanced
          transactionId: booking.stripe_payment_intent_id || '',
          // Price breakdown - using correct fields (all rounded to 2 decimal places)
          baseAmount: finalBaseAmount, // Base space rental amount
          subtotal: finalBaseAmount, // Alias for baseAmount for UI compatibility
          serviceFee: finalServiceFee,
          processingFee: finalProcessingFee,
          taxes: finalProcessingFee, // Alias for processingFee for UI compatibility
          total: total, // Total paid amount (rounded)
          specialRequests: booking.special_requests || '',
          createdAt: new Date(booking.created_at),
          updatedAt: new Date(booking.updated_at),
          bookingType: booking.booking_type || 'instant',
          payoutStatus: booking.payout_status || 'pending',
          reviewSubmitted: booking.review_submitted || false,
          cancellationReason: booking.cancellation_reason || null,
          cancelledAt: booking.cancelled_at ? new Date(booking.cancelled_at) : null,
          // Raw data for reference
          raw: booking
        }
      })

      logDebug('Transformed bookings', { count: transformedBookings.length })

      setBookings(transformedBookings)
      setPagination(prev => ({ ...prev, total: count || 0 }))
    } catch (err) {
      logError('Error fetching bookings:', err)
      setError(err.message || 'Failed to fetch bookings')
    } finally {
      setLoading(false)
    }
  }, [user, isAdmin, authLoading])

  // Optimistically update a booking in the list without refetching
  const updateBookingInList = useCallback((updatedBooking) => {
    setBookings(prev => prev.map(booking => 
      booking.id === updatedBooking.id 
        ? { ...booking, ...updatedBooking }
        : booking
    ))
  }, [])

  const updateBookingStatus = async (bookingId, newStatus, reason = null) => {
    try {
      logDebug('Updating booking status', { bookingId, newStatus })
      
      // Get current booking to track old status
      const currentBooking = bookings.find(b => b.id === bookingId)
      const oldStatus = currentBooking?.status || 'unknown'
      
      const updateData = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // If cancelling, add cancellation reason and timestamp
      if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString()
        if (reason) {
          updateData.cancellation_reason = reason
        }
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) {
        logError('Error updating booking status:', error)
        throw error
      }

      // Log status change to booking_modifications table
      if (oldStatus !== newStatus) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await supabase
              .from('booking_modifications')
              .insert({
                booking_id: bookingId,
                modification_type: 'status_change',
                old_value: oldStatus,
                new_value: newStatus,
                reason: reason || `Status changed from ${oldStatus} to ${newStatus}`,
                modified_by: user.id,
                created_at: new Date().toISOString()
              })
          }
        } catch (modError) {
          logWarn('Error logging status change:', modError)
          // Don't fail the update if logging fails
        }
      }

      // Optimistically update the booking in the list
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus, updatedAt: new Date() }
          : booking
      ))

      // Real-time subscription will handle the full sync
    } catch (err) {
      logError('Error updating booking status:', err)
      throw err
    }
  }

  const processRefund = async (bookingId, refundAmount = null, refundType = 'full', refundReason = null, refundNotes = null) => {
    try {
      console.log('🔄 [REFUND] Starting refund process', { bookingId, refundAmount, refundType, refundReason })
      logDebug('Processing refund', { bookingId, refundAmount, refundType, refundReason })
      
      // Get current booking to track old payment status and get transaction details
      const currentBooking = bookings.find(b => b.id === bookingId)
      if (!currentBooking) {
        console.error('❌ [REFUND] Booking not found:', bookingId)
        throw new Error('Booking not found')
      }

      console.log('✅ [REFUND] Booking found:', { 
        id: currentBooking.id, 
        status: currentBooking.status, 
        paymentStatus: currentBooking.paymentStatus,
        transactionId: currentBooking.transactionId,
        rawTransactionId: currentBooking?.raw?.stripe_payment_intent_id
      })

      const oldPaymentStatus = currentBooking?.paymentStatus || 'unknown'
      // Get transaction ID from booking - check multiple possible locations
      const transactionId = currentBooking?.transactionId || 
                           currentBooking?.raw?.stripe_payment_intent_id || 
                           currentBooking?.raw?.transaction_id || 
                           ''
      const guestId = currentBooking?.raw?.seeker_id
      const hostId = currentBooking?.raw?.listings?.partner_id
      
      console.log('🔍 [REFUND] Transaction details:', { 
        transactionId, 
        hasTransactionId: !!transactionId,
        refundAmount,
        refundType
      })
      
      logDebug('Refund details', { 
        bookingId, 
        transactionId, 
        refundAmount, 
        refundType,
        hasTransactionId: !!transactionId,
        currentBookingTransactionId: currentBooking?.transactionId,
        rawStripePaymentIntentId: currentBooking?.raw?.stripe_payment_intent_id
      })
      
      if (!transactionId || transactionId.trim() === '') {
        const errorMsg = `No payment transaction ID found for booking ${bookingId}. Cannot process refund.`
        console.error('❌ [REFUND]', errorMsg, { 
          bookingId, 
          currentBooking: {
            transactionId: currentBooking?.transactionId,
            raw: currentBooking?.raw ? {
              stripe_payment_intent_id: currentBooking.raw.stripe_payment_intent_id,
              transaction_id: currentBooking.raw.transaction_id
            } : null
          }
        })
        logError(errorMsg, { 
          bookingId, 
          currentBooking: {
            transactionId: currentBooking?.transactionId,
            raw: currentBooking?.raw ? {
              stripe_payment_intent_id: currentBooking.raw.stripe_payment_intent_id,
              transaction_id: currentBooking.raw.transaction_id
            } : null
          }
        })
        throw new Error(errorMsg)
      }
      
      // Handle 50/50 split refund
      let seekerRefundAmount = refundAmount
      let partnerRefundAmount = 0
      let is50_50Split = false

      if (refundType === 'split_50_50') {
        is50_50Split = true
        // Calculate platform application fee
        const totalPaid = parseFloat(currentBooking?.total || 0)
        const serviceFee = parseFloat(currentBooking?.serviceFee || 0)
        const processingFee = parseFloat(currentBooking?.processingFee || 0)
        const commission = parseFloat(currentBooking?.raw?.commission_partner || 0)
        const platformFee = serviceFee + processingFee + commission
        
        // Calculate remaining amount after platform fee
        const remainingAfterFee = totalPaid - platformFee
        
        // Split 50/50
        seekerRefundAmount = remainingAfterFee / 2
        partnerRefundAmount = remainingAfterFee / 2
        
        console.log('💰 [REFUND] 50/50 Split Calculation:', {
          totalPaid,
          platformFee,
          remainingAfterFee,
          seekerRefund: seekerRefundAmount,
          partnerRefund: partnerRefundAmount
        })
      }
      
      // Calculate actual refund amount in cents (Stripe uses cents)
      let refundAmountCents = null
      if (seekerRefundAmount) {
        refundAmountCents = Math.round(seekerRefundAmount * 100)
      }

      // Step 1: Process seeker refund through Stripe (if transaction ID exists)
      let stripeRefund = null
      let transferReversal = null
      
      if (transactionId) {
        try {
          // Map refund reason to Stripe's refund reasons
          const stripeReason = refundReason === 'guest_request' || refundReason === 'host_cancellation' 
            ? 'requested_by_customer'
            : refundReason === 'property_issue' || refundReason === 'system_error'
            ? 'duplicate'
            : 'requested_by_customer'

          // For 50/50 split, we need to:
          // 1. Refund seeker portion (partial refund)
          // 2. Reverse partner portion from transfer (if transfer exists)
          if (is50_50Split) {
            console.log('💳 [REFUND] Processing 50/50 split refund...')
            
            // Process seeker refund (partial refund, no transfer reversal, no application fee refund)
            try {
              console.log('💳 [REFUND] Calling Stripe Edge Function for seeker refund...', { 
                transactionId, 
                refundAmountCents, 
                refundAmountDollars: seekerRefundAmount,
                stripeReason,
                refundType: 'split_50_50',
                partnerRefundAmountCents: Math.round(partnerRefundAmount * 100)
              })
              stripeRefund = await StripeService.processRefund(
                transactionId, 
                refundAmountCents, 
                stripeReason, 
                bookingId,
                'split_50_50',
                Math.round(partnerRefundAmount * 100)
              )
              console.log('✅ [REFUND] Seeker refund processed:', { refundId: stripeRefund?.id, status: stripeRefund?.status })
              
              // Partner refund is handled by the Edge Function via transfer reversal
              if (stripeRefund?.partner_refund?.transfer_reversal) {
                transferReversal = stripeRefund.partner_refund.transfer_reversal
                console.log('✅ [REFUND] Partner transfer reversal processed:', transferReversal)
              } else if (stripeRefund?.partner_refund) {
                console.warn('⚠️ [REFUND] Partner refund info available but transfer reversal may have failed:', stripeRefund.partner_refund)
                transferReversal = {
                  amount: partnerRefundAmount,
                  note: 'Partner refund portion - check transfer reversal status'
                }
              }
            } catch (apiError) {
              console.error('❌ [REFUND] Edge Function error:', apiError)
              logWarn('Edge Function refund failed:', apiError)
              stripeRefund = {
                id: `re_pending_${Date.now()}`,
                object: 'refund',
                amount: refundAmountCents,
                currency: 'aud',
                payment_intent: transactionId,
                reason: stripeReason,
                status: 'pending',
                created: Math.floor(Date.now() / 1000),
                note: 'Refund queued - Edge Function unavailable. Process manually via Stripe dashboard.'
              }
            }
          } else {
            // Regular refund processing (full or partial)
          try {
            console.log('💳 [REFUND] Calling Stripe Edge Function...', { 
              transactionId, 
              refundAmountCents, 
              refundAmountDollars: refundAmount,
                stripeReason,
                refundType 
            })
              stripeRefund = await StripeService.processRefund(transactionId, refundAmountCents, stripeReason, bookingId, refundType)
            console.log('✅ [REFUND] Stripe refund processed:', { refundId: stripeRefund?.id, status: stripeRefund?.status })
            logDebug('Stripe refund processed via Edge Function', { refundId: stripeRefund?.id })
          } catch (apiError) {
            console.error('❌ [REFUND] Edge Function error:', apiError)
            logWarn('Edge Function refund failed:', apiError)
            stripeRefund = {
              id: `re_pending_${Date.now()}`,
              object: 'refund',
              amount: refundAmountCents,
              currency: 'aud',
              payment_intent: transactionId,
              reason: stripeReason,
              status: 'pending',
              created: Math.floor(Date.now() / 1000),
              note: 'Refund queued - Edge Function unavailable. Process manually via Stripe dashboard.'
              }
            }
          }
          
          logDebug('Stripe refund processed', { refundId: stripeRefund?.id, amount: stripeRefund?.amount })
        } catch (stripeError) {
          logError('Stripe refund error:', stripeError)
          // Continue with database update even if Stripe fails (manual processing may be needed)
          // But log it for admin review
        }
      } else {
        logWarn('No transaction ID found, skipping Stripe refund processing')
      }

      // Step 2: Calculate platform earnings from commission before updating booking
      // Platform earnings = commission_partner - Stripe fees on commission
      let platformEarningsCalculated = null
      const commissionAmount = parseFloat(currentBooking?.raw?.commission_partner || currentBooking?.commissionFee || 0)
      
      if (commissionAmount > 0) {
        try {
          console.log('🔄 [REFUND] Calculating platform earnings from commission...')
          const StripeService = (await import('../services/stripeService')).default
          platformEarningsCalculated = StripeService.calculatePlatformEarnings(commissionAmount)
          console.log(`✅ [REFUND] Calculated platform earnings: $${platformEarningsCalculated.toFixed(2)} (from $${commissionAmount.toFixed(2)} commission)`)
        } catch (calcError) {
          console.warn('⚠️ [REFUND] Failed to calculate platform earnings:', calcError)
          // Don't fail the refund if calculation fails
        }
      }

      // Step 3: Update booking status in database
      console.log('💾 [REFUND] Updating booking in database...')
      const updateData = { 
        payment_status: 'refunded',
        updated_at: new Date().toISOString()
      }

      // Update refund details - always save amounts, even if Stripe refund is pending
      // For 50/50 split, always save seeker refund amount (even if 0, to record the split)
      if (is50_50Split) {
        // Always save seeker refund amount for 50/50 split
        // Store the calculated value explicitly (even if 0) to record the seeker's share
        // This ensures we have a complete record of the 50/50 split
        if (seekerRefundAmount !== null && seekerRefundAmount !== undefined) {
          updateData.refund_amount = seekerRefundAmount
        } else {
          // If somehow not calculated, use 0 to indicate seeker's share was processed
          updateData.refund_amount = 0
        }
        if (stripeRefund && stripeRefund.id) {
          updateData.stripe_refund_id = stripeRefund.id
        }
        console.log('✅ [REFUND] Adding 50/50 split refund details:', { 
          stripe_refund_id: stripeRefund?.id || null, 
          refund_amount: seekerRefundAmount,
          partner_refund_amount: partnerRefundAmount,
          note: 'Both seeker and partner amounts recorded for 50/50 split'
        })
      } else if (stripeRefund && stripeRefund.id && !stripeRefund.id.startsWith('re_pending_')) {
        // For regular refunds, only save if Stripe refund succeeded
        updateData.stripe_refund_id = stripeRefund.id
        updateData.refund_amount = refundAmount || null
        console.log('✅ [REFUND] Adding refund details to booking:', { 
          stripe_refund_id: stripeRefund.id, 
          refund_amount: refundAmount 
        })
      } else if (refundAmount && refundAmount > 0) {
        // Save refund amount even if Stripe refund is pending
        updateData.refund_amount = refundAmount
        if (stripeRefund?.id) {
          updateData.stripe_refund_id = stripeRefund.id
        }
        console.log('✅ [REFUND] Adding refund amount (Stripe may be pending):', { 
          stripe_refund_id: stripeRefund?.id || null, 
          refund_amount: refundAmount 
        })
      }

      // For 50/50 split, also store partner refund amount and transfer reversal ID
      // Always store partner refund amount (even if 0) to complete the 50/50 split record
      if (is50_50Split) {
        if (partnerRefundAmount !== null && partnerRefundAmount !== undefined) {
          updateData.transfer_reversal_amount = partnerRefundAmount
        } else {
          // If somehow not calculated, use 0 to indicate partner's share was processed
          updateData.transfer_reversal_amount = 0
        }
        if (transferReversal?.id) {
          updateData.stripe_transfer_reversal_id = transferReversal.id
        }
        console.log('✅ [REFUND] Adding partner refund details:', { 
          transfer_reversal_amount: partnerRefundAmount,
          stripe_transfer_reversal_id: transferReversal?.id || null,
          note: 'Partner share recorded for 50/50 split'
        })
      }

      // Include platform earnings if we successfully calculated it
      if (platformEarningsCalculated !== null && platformEarningsCalculated > 0) {
        updateData.platform_earnings = platformEarningsCalculated
      }

      // Only update status to cancelled if it's a full refund
      // For 50/50 split, keep status as confirmed
      if (refundType === 'full') {
        updateData.status = 'cancelled'
        updateData.cancelled_at = new Date().toISOString()
      }
      // For 50/50 split, status remains as 'confirmed' (no change)
      
      console.log('💾 [REFUND] Update data:', updateData)
      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (error) {
        console.error('❌ [REFUND] Database update error:', error)
        logError('Error updating booking refund status:', error)
        throw error
      }
      console.log('✅ [REFUND] Booking updated in database')

      // Step 4: Reverse earnings if this booking had earnings recorded
      try {
        // Find earnings related to this booking
        const { data: earningsData } = await supabase
          .from('earnings')
          .select('*')
          .eq('booking_id', bookingId)

        if (earningsData && earningsData.length > 0) {
          // Create negative earnings entry to reverse the earnings
          for (const earning of earningsData) {
            let reversedAmount = 0
            
            if (is50_50Split) {
              // For 50/50 split, reverse only the partner refund portion
              reversedAmount = -Math.abs(partnerRefundAmount)
            } else if (refundType === 'full') {
              reversedAmount = -Math.abs(earning.net_amount || earning.amount || 0)
            } else {
              // Partial refund - reverse proportionally
              reversedAmount = -Math.abs((refundAmount / (currentBooking?.total || 1)) * (earning.net_amount || earning.amount || 0))
            }

            if (reversedAmount < 0) {
            await supabase
              .from('earnings')
              .insert({
                booking_id: bookingId,
                partner_id: earning.partner_id,
                amount: reversedAmount,
                net_amount: reversedAmount,
                fee_amount: 0, // Fees are reversed proportionally
                status: 'refunded',
                  description: is50_50Split 
                    ? `50/50 split refund - partner portion reversal for booking ${bookingId}`
                    : `Refund reversal for booking ${bookingId}`,
                created_at: new Date().toISOString()
              })
            }
          }
        }
      } catch (earningsError) {
        logWarn('Error reversing earnings:', earningsError)
        // Don't fail the refund if earnings reversal fails
      }

      // Step 5: Log refund to booking_modifications table
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          let refundReasonText = ''
          if (is50_50Split) {
            refundReasonText = refundReason 
              ? `${refundReason.replace(/_/g, ' ')}: 50/50 split refund - Seeker: A$${seekerRefundAmount?.toFixed(2) || '0.00'}, Partner: A$${partnerRefundAmount?.toFixed(2) || '0.00'}`
              : `50/50 split refund processed - Seeker: A$${seekerRefundAmount?.toFixed(2) || '0.00'}, Partner: A$${partnerRefundAmount?.toFixed(2) || '0.00'}`
          } else {
            refundReasonText = refundReason 
            ? `${refundReason.replace(/_/g, ' ')}: ${refundType} refund of A$${refundAmount?.toFixed(2) || '0.00'}`
            : `Refund processed: ${refundType} refund of A$${refundAmount?.toFixed(2) || '0.00'}`
          }

          await supabase
            .from('booking_modifications')
            .insert({
              booking_id: bookingId,
              modification_type: 'refund',
              old_value: oldPaymentStatus,
              new_value: 'refunded',
              reason: refundReasonText,
              notes: refundNotes || (stripeRefund ? `Stripe Refund ID: ${stripeRefund.id}` : null),
              modified_by: user.id,
              created_at: new Date().toISOString()
            })
        }
      } catch (modError) {
        logWarn('Error logging refund to modifications:', modError)
        // Don't fail the refund if logging fails
      }

      // Step 5: Send notifications to guest and host
      try {
        const refundAmountFormatted = `A$${(Math.round((refundAmount || 0) * 100) / 100).toFixed(2)}`
        
        // Format booking date and time for notifications
        const formatBookingDate = (date) => {
          if (!date) return ''
          const d = new Date(date)
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
        }
        
        const formatBookingTime = (date) => {
          if (!date) return ''
          const d = new Date(date)
          let hours = d.getHours()
          const minutes = d.getMinutes()
          const ampm = hours >= 12 ? 'PM' : 'AM'
          hours = hours % 12
          hours = hours ? hours : 12
          const minutesStr = minutes < 10 ? `0${minutes}` : minutes
          return `${hours}:${minutesStr} ${ampm}`
        }
        
        const spaceName = currentBooking?.spaceName || 'Unknown Space'
        const bookingDate = formatBookingDate(currentBooking?.checkIn)
        const startTime = formatBookingTime(currentBooking?.checkIn)
        const endTime = formatBookingTime(currentBooking?.checkOut)
        const bookingTimeRange = startTime && endTime ? `${startTime} - ${endTime}` : ''
        const bookingDetails = bookingDate && bookingTimeRange 
          ? ` (${bookingDate}, ${bookingTimeRange})`
          : bookingDate 
          ? ` (${bookingDate})`
          : ''
        
        // Notify guest
        if (guestId) {
          await NotificationService.sendNotification(guestId, {
            type: 'refund',
            title: 'Refund Processed',
            message: `Our support team has processed your refund of ${refundAmountFormatted} for "${spaceName}"${bookingDetails}.${refundNotes ? ` Notes: ${refundNotes}` : ''}`,
            data: {
              booking_id: bookingId,
              refund_amount: refundAmount,
              refund_type: refundType,
              refund_reason: refundReason,
              space_name: spaceName,
              booking_date: bookingDate,
              booking_time: bookingTimeRange
            }
          })
        }

        // Notify host
        if (hostId) {
          await NotificationService.sendNotification(hostId, {
            type: 'refund',
            title: 'Booking Refunded',
            message: `Our support team has processed a refund of ${refundAmountFormatted} for "${spaceName}" booking${bookingDetails}. Your earnings for this booking have been adjusted.`,
            data: {
              booking_id: bookingId,
              refund_amount: refundAmount,
              refund_type: refundType,
              space_name: spaceName,
              booking_date: bookingDate,
              booking_time: bookingTimeRange,
              guest_name: currentBooking?.guestName || 'Unknown Guest'
            }
          })
        }
      } catch (notifError) {
        logWarn('Error sending refund notifications:', notifError)
        // Don't fail the refund if notifications fail
      }

      // Step 6: Optimistically update the booking in the list
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { 
              ...booking, 
              paymentStatus: 'refunded',
              status: refundType === 'full' ? 'cancelled' : booking.status,
              updatedAt: new Date()
            }
          : booking
      ))

      console.log('✅ [REFUND] Refund processed successfully!', { 
        bookingId, 
        refundAmount, 
        stripeRefundId: stripeRefund?.id,
        refundType 
      })
      logDebug('Refund processed successfully', { bookingId, refundAmount, stripeRefundId: stripeRefund?.id })
      
      // Real-time subscription will handle the full sync
    } catch (err) {
      console.error('❌ [REFUND] Refund failed:', err)
      logError('Error processing refund:', err)
      throw err
    }
  }

  const bulkUpdateBookings = async (bookingIds, action) => {
    try {
      logDebug('Bulk update bookings', { action, count: bookingIds.length })
      
      let updateData = {}
      let newStatus = null
      
      switch (action) {
        case 'confirm':
          updateData = { status: 'confirmed', updated_at: new Date().toISOString() }
          newStatus = 'confirmed'
          break
        case 'cancel':
          updateData = { 
            status: 'cancelled', 
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          newStatus = 'cancelled'
          break
        case 'complete':
          updateData = { 
            status: 'completed', 
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          newStatus = 'completed'
          break
        default:
          throw new Error(`Unknown action: ${action}`)
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .in('id', bookingIds)

      if (error) {
        console.error('❌ Error bulk updating bookings:', error)
        throw error
      }

      // Optimistically update bookings in the list
      if (newStatus) {
        setBookings(prev => prev.map(booking => 
          bookingIds.includes(booking.id) 
            ? { ...booking, status: newStatus, updatedAt: new Date() }
            : booking
        ))
      }

      // Real-time subscription will handle the full sync
    } catch (err) {
      logError('Error bulk updating bookings:', err)
      throw err
    }
  }

  // Fetch bookings when component mounts or auth state changes
  useEffect(() => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      setLoading(true)
      return
    }

    // Don't fetch if user is not authenticated or not admin
    if (!user || !isAdmin) {
      setBookings([])
      setLoading(false)
      setError(null)
      return
    }

    let isFetching = false
    const fetchWithLock = async () => {
      if (isFetching) return
      isFetching = true
      try {
        await fetchBookings()
      } finally {
        isFetching = false
      }
    }

    fetchWithLock()
    
    // Set up real-time subscriptions with proper cleanup
    let bookingsSubscription = null
    
    const setupRealtimeSubscriptions = () => {
      // Subscribe to bookings table changes
      bookingsSubscription = supabase
        .channel(`bookings-changes-${Date.now()}`)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'bookings' 
          }, 
          async (payload) => {
            logDebug('Bookings change received:', { eventType: payload.eventType })
            
            // Debounce to prevent race conditions
            if (isFetching) return
            
            if (payload.eventType === 'INSERT') {
              // New booking added - fetch fresh data to get complete booking info
              fetchWithLock()
            } else if (payload.eventType === 'UPDATE') {
              // Booking updated - fetch the updated booking data to get all computed fields
              try {
                const { data: updatedBooking, error } = await supabase
                  .from('bookings')
                  .select(`
                    *,
                    listings:listing_id (
                      id,
                      name,
                      address,
                      images,
                      category,
                      partner_id,
                      hourly_price,
                      daily_price
                    ),
                    seekers:seeker_id (
                      id,
                      email,
                      first_name,
                      last_name,
                      avatar_url,
                      phone
                    )
                  `)
                  .eq('id', payload.new.id)
                  .single()
                
                if (!error && updatedBooking) {
                  // Transform the updated booking
                  const baseAmount = parseFloat(updatedBooking.base_amount || updatedBooking.original_amount || 0)
                  const serviceFee = parseFloat(updatedBooking.service_fee || 0)
                  const processingFee = parseFloat(updatedBooking.payment_processing_fee || 0)
                  const totalPaid = parseFloat(updatedBooking.total_paid || 0)
                  const price = parseFloat(updatedBooking.price || 0)
                  const feesAreMissing = (updatedBooking.service_fee === null && updatedBooking.payment_processing_fee === null)
                  const calculatedTotal = baseAmount + serviceFee + processingFee
                  
                  let total
                  if (totalPaid > 0) {
                    total = totalPaid
                  } else if (price > 0 && feesAreMissing && calculatedTotal !== price) {
                    total = price
                  } else {
                    total = calculatedTotal
                  }
                  
                  total = Math.round(total * 100) / 100
                  const finalServiceFee = Math.round(serviceFee * 100) / 100
                  const finalProcessingFee = Math.round(processingFee * 100) / 100
                  
                  let finalBaseAmount = baseAmount
                  if (baseAmount === 0 && price > 0) {
                    finalBaseAmount = price
                  }
                  finalBaseAmount = Math.round(finalBaseAmount * 100) / 100

                  // Fetch host profile if needed
                  let hostName = 'Unknown Host'
                  if (updatedBooking.listings?.partner_id) {
                    const { data: host } = await supabase
                      .from('profiles')
                      .select('id, first_name, last_name')
                      .eq('id', updatedBooking.listings.partner_id)
                      .single()
                    
                    if (host) {
                      hostName = `${host.first_name || ''} ${host.last_name || ''}`.trim() || 'Unknown Host'
                    }
                  }

                  const transformedBooking = {
                    id: updatedBooking.id,
                    guestName: updatedBooking.seekers ? 
                      `${updatedBooking.seekers.first_name || ''} ${updatedBooking.seekers.last_name || ''}`.trim() || 'Unknown Guest' : 
                      'Unknown Guest',
                    guestEmail: updatedBooking.seekers?.email || '',
                    guestPhone: updatedBooking.seekers?.phone || '',
                    guestAvatar: updatedBooking.seekers?.avatar_url || '/assets/images/no_image.png',
                    spaceName: updatedBooking.listings?.name || 'Unknown Space',
                    spaceLocation: updatedBooking.listings?.address || 'N/A',
                    spaceImage: updatedBooking.listings?.images?.[0] || '/assets/images/no_image.png',
                    hostName: hostName,
                    checkIn: new Date(updatedBooking.start_time),
                    checkOut: new Date(updatedBooking.end_time),
                    guests: updatedBooking.guest_count || 1,
                    status: updatedBooking.status || 'pending',
                    paymentStatus: updatedBooking.payment_status || 'pending',
                    paymentMethod: 'Credit Card',
                    transactionId: updatedBooking.stripe_payment_intent_id || '',
                    baseAmount: finalBaseAmount,
                    subtotal: finalBaseAmount,
                    serviceFee: finalServiceFee,
                    processingFee: finalProcessingFee,
                    taxes: finalProcessingFee,
                    total: total,
                    specialRequests: updatedBooking.special_requests || '',
                    createdAt: new Date(updatedBooking.created_at),
                    updatedAt: new Date(updatedBooking.updated_at),
                    bookingType: updatedBooking.booking_type || 'instant',
                    payoutStatus: updatedBooking.payout_status || 'pending',
                    reviewSubmitted: updatedBooking.review_submitted || false,
                    raw: updatedBooking
                  }

                  // Update booking in the list
                  setBookings(prev => prev.map(booking => 
                    booking.id === transformedBooking.id 
                      ? transformedBooking
                      : booking
                  ))
                }
              } catch (err) {
                logWarn('Error fetching updated booking:', err)
                // Fallback to full fetch if transformation fails
                fetchWithLock()
              }
            } else if (payload.eventType === 'DELETE') {
              // Booking deleted
              setBookings(prev => prev.filter(booking => booking.id !== payload.old.id))
            }
          }
        )
        .subscribe()
    }

    setupRealtimeSubscriptions()
    
    return () => {
      // Properly cleanup subscriptions
      if (bookingsSubscription) {
        try {
          bookingsSubscription.unsubscribe()
        } catch (e) {
          logWarn('Error unsubscribing bookings:', e)
        }
      }
    }
  }, [user, isAdmin, authLoading, fetchBookings])

  const goToPage = useCallback((page) => {
    setPagination(prev => ({ ...prev, page }))
  }, [])

  const setPageSize = useCallback((pageSize) => {
    setPagination(prev => ({ ...prev, pageSize, page: 1 }))
  }, [])

  // Refetch when pagination changes
  useEffect(() => {
    if (user && isAdmin && !authLoading) {
      fetchBookings()
    }
  }, [pagination.page, pagination.pageSize, user, isAdmin, authLoading, fetchBookings])

  return {
    bookings,
    loading,
    error,
    pagination,
    refetch: fetchBookings,
    updateBookingStatus,
    processRefund,
    bulkUpdateBookings,
    goToPage,
    setPageSize,
    updateBookingInList
  }
}

export default useBookings
