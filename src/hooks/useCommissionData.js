import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StripeService from '../services/stripeService'
import StripeCommissionTracking from '../services/stripeCommissionTracking'

const useCommissionData = () => {
  const [commissionData, setCommissionData] = useState({
    summary: {
      totalRevenue: 0,
      totalCommission: 0,
      totalPlatformEarnings: 0,
      totalHostPayouts: 0,
      averageCommissionRate: 0,
      totalTransactions: 0
    },
    bookings: [],
    monthlyData: [],
    hostEarnings: [],
    loading: true,
    error: null
  })
  
  const { user, isAdmin, loading: authLoading, authInitialized } = useAuth()

  const fetchCommissionData = useCallback(async () => {
    try {
      console.log('🔍 Fetching REAL commission data from database...')
      console.log('📊 Auth state in useCommissionData:', { 
        authLoading, 
        authInitialized,
        hasUser: !!user, 
        isAdmin, 
        userEmail: user?.email 
      })
      
      setCommissionData(prev => ({ ...prev, loading: true, error: null }))

      // Don't fetch if auth is not initialized yet
      if (!authInitialized || authLoading) {
        console.log('⏳ Auth not initialized or still loading, waiting...')
        return
      }

      // Don't fetch if user is not authenticated or not admin
      if (!user || !isAdmin) {
        console.log('⚠️ User not authenticated or not admin, clearing commission data')
        console.log('📊 Auth details:', { user: !!user, isAdmin, userEmail: user?.email })
        setCommissionData(prev => ({ ...prev, bookings: [], loading: false }))
        return
      }

      console.log('✅ User authenticated as admin, fetching REAL commission data...')

      // Fetch real bookings with commission data
      console.log('🔍 Fetching bookings with commission data...')
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          price,
          base_amount,
          original_amount,
          commission_partner,
          commission_seeker,
          platform_earnings,
          net_application_fee,
          service_fee,
          payment_processing_fee,
          total_paid,
          payment_status,
          status,
          refund_amount,
          transfer_reversal_amount,
          stripe_refund_id,
          stripe_transfer_reversal_id,
          created_at,
          start_time,
          end_time,
          listing_id,
          seeker_id,
          stripe_payment_intent_id
        `)
        .not('commission_partner', 'is', null)
        .gt('commission_partner', 0)
        .order('created_at', { ascending: false })

      if (bookingsError) {
        console.error('❌ Error fetching bookings:', bookingsError)
        throw bookingsError
      }

      console.log('✅ Fetched bookings:', bookingsData?.length, 'bookings with commission data')

      if (bookingsData && bookingsData.length > 0) {
        // Get listing data for host information
        const listingIds = [...new Set(bookingsData.map(b => b.listing_id).filter(Boolean))]
        let hostProfiles = {}
        
        if (listingIds.length > 0) {
          console.log('🔍 Fetching host information...')
          const { data: listings, error: listingsError } = await supabase
            .from('listings')
            .select('id, partner_id, name')
            .in('id', listingIds)

          if (!listingsError && listings && listings.length > 0) {
            const partnerIds = [...new Set(listings.map(l => l.partner_id).filter(Boolean))]
            
            if (partnerIds.length > 0) {
              const { data: hosts, error: hostsError } = await supabase
                .from('profiles')
                .select('id, first_name, last_name, email, avatar_url, stripe_account_id')
                .in('id', partnerIds)

              if (!hostsError && hosts && hosts.length > 0) {
                hostProfiles = hosts.reduce((acc, host) => {
                  acc[host.id] = host
                  return acc
                }, {})
                console.log('✅ Fetched host profiles:', Object.keys(hostProfiles).length)
              }
            }
          }
        }
        
        // Get listing data for space names
        const spaceListingIds = [...new Set(bookingsData.map(b => b.listing_id).filter(Boolean))]
        let listingData = {}
        
        if (spaceListingIds.length > 0) {
          console.log('🔍 Fetching listing data for space names...')
          const { data: listings, error: listingsError } = await supabase
            .from('listings')
            .select('id, name, category, partner_id')
            .in('id', spaceListingIds)

          if (!listingsError && listings && listings.length > 0) {
            listingData = listings.reduce((acc, listing) => {
              acc[listing.id] = listing
              return acc
            }, {})
            console.log('✅ Fetched listing data:', Object.keys(listingData).length)
          }
        }

        // Get seeker data for guest names
        const seekerIds = [...new Set(bookingsData.map(b => b.seeker_id).filter(Boolean))]
        let seekerData = {}
        
        if (seekerIds.length > 0) {
          console.log('🔍 Fetching seeker data for guest names...')
          const { data: seekers, error: seekersError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', seekerIds)

          if (!seekersError && seekers && seekers.length > 0) {
            seekerData = seekers.reduce((acc, seeker) => {
              acc[seeker.id] = seeker
              return acc
            }, {})
            console.log('✅ Fetched seeker data:', Object.keys(seekerData).length)
          }
        }

        // Calculate or sync platform earnings for bookings where it's missing
        // Platform earnings = commission_partner - Stripe fees on commission
        const bookingsNeedingSync = bookingsData.filter(
          b => !b.platform_earnings && b.commission_partner > 0
        )
        
        // Sync platform earnings and net application fee for missing ones (async, non-blocking)
        if (bookingsNeedingSync.length > 0) {
          console.log(`🔄 Found ${bookingsNeedingSync.length} bookings missing platform_earnings, calculating...`)
          const StripeService = (await import('../services/stripeService')).default
          
          // Sync in batches to avoid overwhelming the system
          bookingsNeedingSync.slice(0, 10).forEach(async (booking) => {
            try {
              const commissionAmount = parseFloat(booking.commission_partner || 0)
              await StripeService.syncPlatformEarningsFromStripe(
                booking.id,
                booking.stripe_payment_intent_id,
                commissionAmount
              )
              // This now syncs both platform_earnings and net_application_fee
            } catch (syncError) {
              console.warn(`Failed to sync platform earnings for booking ${booking.id}:`, syncError)
            }
          })
        }

        // Fetch Stripe data for bookings with payment intent IDs
        // This gives us accurate net application fees from Stripe
        const stripeDataMap = new Map()
        const bookingsWithPaymentIntent = bookingsData.filter(b => b.stripe_payment_intent_id)
        
        if (bookingsWithPaymentIntent.length > 0) {
          console.log(`🔄 Fetching Stripe data for ${bookingsWithPaymentIntent.length} bookings...`)
          
          // Fetch Stripe data in parallel (limit to avoid overwhelming the API)
          const stripePromises = bookingsWithPaymentIntent.slice(0, 20).map(async (booking) => {
            try {
              const paymentData = await StripeCommissionTracking.getPaymentDetails(booking.stripe_payment_intent_id)
              const breakdown = StripeCommissionTracking.calculateCommissionBreakdown(paymentData)
              return {
                bookingId: booking.id,
                breakdown,
                paymentData
              }
            } catch (error) {
              console.warn(`⚠️ Failed to fetch Stripe data for booking ${booking.id}:`, error.message)
              return {
                bookingId: booking.id,
                breakdown: null,
                paymentData: null
              }
            }
          })
          
          const stripeResults = await Promise.all(stripePromises)
          stripeResults.forEach(result => {
            if (result.breakdown) {
              stripeDataMap.set(result.bookingId, result.breakdown)
            }
          })
          
          console.log(`✅ Fetched Stripe data for ${stripeDataMap.size} bookings`)
        }

        // Fetch Connect account payouts (host withdrawals to bank)
        // Map Connect account IDs to their payouts
        const connectAccountPayoutsMap = new Map()
        const uniqueConnectAccounts = [...new Set(
          Object.values(hostProfiles)
            .map(host => host.stripe_account_id)
            .filter(Boolean)
        )]
        
        if (uniqueConnectAccounts.length > 0) {
          console.log(`🔄 Fetching Connect account payouts for ${uniqueConnectAccounts.length} accounts...`)
          
          // Get date range from bookings (last 90 days or all time)
          const bookingDates = bookingsData.map(b => new Date(b.created_at))
          const minDate = bookingDates.length > 0 
            ? new Date(Math.min(...bookingDates.map(d => d.getTime())))
            : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
          const maxDate = bookingDates.length > 0
            ? new Date(Math.max(...bookingDates.map(d => d.getTime())))
            : new Date()
          
          // Fetch payouts for each Connect account
          const payoutPromises = uniqueConnectAccounts.slice(0, 10).map(async (accountId) => {
            try {
              const payouts = await StripeCommissionTracking.getConnectAccountPayouts(
                accountId,
                minDate.toISOString(),
                maxDate.toISOString(),
                100
              )
              return { accountId, payouts }
            } catch (error) {
              console.warn(`⚠️ Failed to fetch payouts for Connect account ${accountId}:`, error.message)
              return { accountId, payouts: [] }
            }
          })
          
          const payoutResults = await Promise.all(payoutPromises)
          payoutResults.forEach(({ accountId, payouts }) => {
            if (payouts.length > 0) {
              connectAccountPayoutsMap.set(accountId, payouts)
            }
          })
          
          const totalPayouts = Array.from(connectAccountPayoutsMap.values())
            .reduce((sum, payouts) => sum + payouts.length, 0)
          
          // Calculate total paid payouts (actual withdrawals to bank accounts)
          const totalPaidPayouts = Array.from(connectAccountPayoutsMap.values())
            .reduce((sum, payouts) => {
              const paidPayouts = payouts.filter(p => p.status === 'paid')
              return sum + paidPayouts.reduce((accountSum, payout) => accountSum + payout.amount, 0)
            }, 0)
          
          console.log(`✅ Fetched ${totalPayouts} Connect account payouts`)
          console.log(`💰 Total paid payouts (withdrawn to bank): A$${totalPaidPayouts.toFixed(2)}`)
        }

        // Fetch payout requests from database (actual payouts processed)
        console.log('🔄 Fetching payout requests from database...')
        const { data: payoutRequestsData, error: payoutRequestsError } = await supabase
          .from('payout_requests')
          .select('id, partner_id, amount, status, requested_at, processed_at')
          .eq('status', 'successful') // Only count successful payouts
          .order('processed_at', { ascending: false })

        let totalPayoutRequests = 0
        if (payoutRequestsError) {
          console.warn('⚠️ Error fetching payout requests:', payoutRequestsError)
        } else if (payoutRequestsData && payoutRequestsData.length > 0) {
          totalPayoutRequests = payoutRequestsData.reduce((sum, pr) => {
            const amount = parseFloat(pr.amount || 0)
            console.log(`  - Payout Request: A$${amount.toFixed(2)} (ID: ${pr.id.substring(0, 8)})`)
            return sum + amount
          }, 0)
          console.log(`✅ Fetched ${payoutRequestsData.length} successful payout requests`)
          console.log(`💰 Total from payout requests: A$${totalPayoutRequests.toFixed(2)}`)
        } else {
          console.log('ℹ️ No successful payout requests found in database')
        }

        const transformedBookings = bookingsData.map(booking => {
          // Use base_amount for base price (correct), fallback to original_amount or price
          // Ensure values are in dollars (not cents)
          const baseAmount = parseFloat(booking.base_amount || booking.original_amount || booking.price || 0)
          const serviceFee = parseFloat(booking.service_fee || 0)
          const processingFee = parseFloat(booking.payment_processing_fee || 0)
          const totalPaid = parseFloat(booking.total_paid || 0)
          const commissionPartner = parseFloat(booking.commission_partner || 0)
          const commissionSeeker = parseFloat(booking.commission_seeker || 0)
          const stripePaymentIntentId = booking.stripe_payment_intent_id || null
          
          // Refund information
          // For 50/50 splits, refund_amount is the seeker's share, transfer_reversal_amount is partner's share
          const refundAmount = booking.refund_amount !== null && booking.refund_amount !== undefined 
            ? parseFloat(booking.refund_amount) 
            : 0
          const transferReversalAmount = booking.transfer_reversal_amount !== null && booking.transfer_reversal_amount !== undefined
            ? parseFloat(booking.transfer_reversal_amount)
            : 0
          const isRefunded = booking.payment_status === 'refunded'
          const isFullRefund = isRefunded && (
            (refundAmount > 0 && Math.abs(refundAmount - totalPaid) < 0.01) || // Refund equals total paid
            booking.status === 'cancelled' // Full refunds set status to cancelled
          )
          // 50/50 split is identified by:
          // 1. NOT being a full refund
          // 2. Having both refund_amount (seeker) AND transfer_reversal_amount (partner) explicitly set (not null)
          //    - Even if one is 0, if both fields are set, it's a 50/50 split
          // 3. The sum of both refunds is less than total_paid (platform keeps the fee)
          // 4. OR having stripe_transfer_reversal_id set (indicates a 50/50 split was processed)
          const totalRefunded = refundAmount + transferReversalAmount
          const hasBothRefundFields = booking.refund_amount !== null && booking.transfer_reversal_amount !== null
          const hasTransferReversalId = booking.stripe_transfer_reversal_id !== null && booking.stripe_transfer_reversal_id !== undefined
          const is50_50Split = isRefunded && !isFullRefund && 
            (hasBothRefundFields || hasTransferReversalId) && 
            totalRefunded < totalPaid // Platform keeps the application fee
          const isPartialRefund = isRefunded && !isFullRefund && !is50_50Split
          
          // Debug: Log first booking to verify values
          if (booking.id === bookingsData[0]?.id) {
            console.log('📊 Booking Data Parsed:', {
              bookingId: booking.id.substring(0, 8),
              baseAmount,
              serviceFee,
              processingFee,
              commissionPartner,
              totalPaid,
              rawBaseAmount: booking.base_amount,
              rawServiceFee: booking.service_fee,
              rawProcessingFee: booking.payment_processing_fee,
              rawCommissionPartner: booking.commission_partner
            })
          }
          
          // Try to get Net Application Fee from Stripe first (most accurate)
          const stripeBreakdown = stripeDataMap.get(booking.id)
          let netApplicationFee = null
          let applicationFeeGross = serviceFee + processingFee + commissionPartner
          
          // For partial refunds (including 50/50 splits), platform keeps FULL application fee
          // For full refunds, platform loses the application fee (set to 0)
          if (isFullRefund) {
            // Full refund: Platform loses all application fee
            netApplicationFee = 0
            applicationFeeGross = 0
            
            if (booking.id === bookingsData[0]?.id) {
              console.log('❌ Full refund - Platform loses application fee:', {
                bookingId: booking.id.substring(0, 8),
                refundAmount,
                totalPaid
              })
            }
          } else if (isPartialRefund || is50_50Split) {
            // Partial refund: Platform keeps FULL application fee
            // Calculate net application fee as if no refund happened
            if (stripeBreakdown && stripeBreakdown.netApplicationFee !== null && stripeBreakdown.netApplicationFee !== undefined) {
              // Use Stripe's calculated net application fee (most accurate)
              netApplicationFee = stripeBreakdown.netApplicationFee
              if (stripeBreakdown.applicationFeeGross) {
                applicationFeeGross = stripeBreakdown.applicationFeeGross
              }
            } else {
              // Calculate net application fee from original transaction
              const totalTransactionAmount = totalPaid || (baseAmount + serviceFee + processingFee)
              
              if (applicationFeeGross > 0 && totalTransactionAmount > 0) {
                // Calculate Stripe fees on full transaction
                const estimatedStripeFees = StripeService.calculateStripeFees(totalTransactionAmount)
                // Net application fee = Application Fee Gross - Stripe Fees
                netApplicationFee = Math.max(0, applicationFeeGross - estimatedStripeFees)
              } else if (applicationFeeGross > 0) {
                // Last fallback: estimate Stripe fees on application fee gross
                const estimatedStripeFees = (applicationFeeGross * 0.029) + 0.30
                netApplicationFee = Math.max(0, applicationFeeGross - estimatedStripeFees)
              } else {
                netApplicationFee = 0
              }
            }
            
            if (booking.id === bookingsData[0]?.id) {
              console.log('✅ Partial refund - Platform keeps full application fee:', {
                bookingId: booking.id.substring(0, 8),
                is50_50Split,
                refundAmount,
                transferReversalAmount,
                applicationFeeGross,
                netApplicationFee
              })
            }
          } else if (stripeBreakdown && stripeBreakdown.netApplicationFee !== null && stripeBreakdown.netApplicationFee !== undefined) {
            // Normal booking (no refund): Use Stripe's calculated net application fee (most accurate)
            netApplicationFee = stripeBreakdown.netApplicationFee
            // Also update applicationFeeGross from Stripe if available
            if (stripeBreakdown.applicationFeeGross) {
              applicationFeeGross = stripeBreakdown.applicationFeeGross
            }
            
            if (booking.id === bookingsData[0]?.id) {
              console.log('✅ Using Stripe data for Net Application Fee:', {
                bookingId: booking.id.substring(0, 8),
                netApplicationFee,
                applicationFeeGross: stripeBreakdown.applicationFeeGross,
                stripeFees: stripeBreakdown.stripeFees
              })
            }
          } else {
            // Fallback: Calculate from booking data if Stripe data unavailable
            const totalTransactionAmount = totalPaid || (baseAmount + serviceFee + processingFee)
            
            if (applicationFeeGross > 0 && totalTransactionAmount > 0) {
              // Calculate Stripe fees on full transaction
              const estimatedStripeFees = StripeService.calculateStripeFees(totalTransactionAmount)
              // Net application fee = Application Fee Gross - Stripe Fees
              netApplicationFee = Math.max(0, applicationFeeGross - estimatedStripeFees)
              
              if (booking.id === bookingsData[0]?.id) {
                console.log('⚠️ Using calculated Net Application Fee (Stripe data unavailable):', {
                  bookingId: booking.id.substring(0, 8),
                  baseAmount,
                  serviceFee,
                  processingFee,
                  commissionPartner,
                  applicationFeeGross,
                  totalTransactionAmount,
                  estimatedStripeFees,
                  netApplicationFee
                })
              }
            } else if (applicationFeeGross > 0) {
              // Last fallback: estimate Stripe fees on application fee gross
              const estimatedStripeFees = (applicationFeeGross * 0.029) + 0.30
              netApplicationFee = Math.max(0, applicationFeeGross - estimatedStripeFees)
            } else {
              netApplicationFee = 0
            }
          }
          
          // Platform earnings should be the Net Application Fee (what platform keeps after Stripe fees)
          // For partial refunds, this is the FULL application fee (platform keeps it)
          // For full refunds, this is 0 (platform loses it)
          const platformEarnings = netApplicationFee || 0
          
          // Commission rate should be calculated on base amount
          const commissionRate = baseAmount > 0 ? (commissionPartner / baseAmount) * 100 : 0

          // Get host's Connect account ID
          const spaceInfo = listingData[booking.listing_id]
          const partnerId = spaceInfo?.partner_id
          const hostId = partnerId ? hostProfiles[partnerId] : null
          const connectAccountId = hostId?.stripe_account_id || null
          
          // Host Payout: Use actual payout amount from Stripe Connect (what was withdrawn to bank)
          // First try to find matching payout from Connect account payouts
          let hostPayout = null
          let payoutStatus = 'pending' // pending, paid, or unavailable
          
          if (connectAccountId && connectAccountPayoutsMap.has(connectAccountId)) {
            // Try to match this booking's transfer to a payout
            const transferAmount = stripeBreakdown?.transferAmount || (baseAmount - commissionPartner)
            const bookingDate = new Date(booking.created_at)
            const payouts = connectAccountPayoutsMap.get(connectAccountId)
            
            // Find payouts that occurred after this booking and match the amount
            // Note: Payouts aggregate multiple transfers, so we look for payouts that include this amount
            const matchingPayout = payouts.find(payout => {
              const payoutDate = new Date(payout.created)
              // Payout should be after booking date
              const isAfterBooking = payoutDate >= bookingDate
              // Payout should be "paid" status (actually withdrawn)
              const isPaid = payout.status === 'paid'
              // Amount should be close (payouts can aggregate multiple transfers)
              const amountMatch = Math.abs(payout.amount - transferAmount) < 1 || payout.amount >= transferAmount
              
              return isAfterBooking && isPaid && amountMatch
            })
            
            if (matchingPayout) {
              // Use the payout amount (what was actually withdrawn)
              hostPayout = matchingPayout.amount
              payoutStatus = 'paid'
              
              if (booking.id === bookingsData[0]?.id) {
                console.log('✅ Using Connect account payout for Host Payout:', {
                  bookingId: booking.id.substring(0, 8),
                  payoutAmount: matchingPayout.amount,
                  transferAmount: transferAmount,
                  payoutId: matchingPayout.id,
                  payoutDate: matchingPayout.created
                })
              }
            } else {
              // Transfer exists but not yet paid out
              hostPayout = transferAmount
              payoutStatus = 'pending'
            }
          } else if (stripeBreakdown && stripeBreakdown.transferAmount !== null && stripeBreakdown.transferAmount !== undefined) {
            // Use transfer amount (sent to Connect account, but not yet withdrawn)
            hostPayout = stripeBreakdown.transferAmount
            payoutStatus = 'pending'
          } else {
            // Fallback: Calculate expected payout (base amount minus commission)
            hostPayout = baseAmount - commissionPartner
            payoutStatus = 'unavailable'
          }

          // Host info already retrieved above (spaceInfo, partnerId, hostId)
          const hostName = hostId ? 
            `${hostId.first_name || ''} ${hostId.last_name || ''}`.trim() || 'Unknown Host' : 
            'Unknown Host'

          // Get space info
          const spaceName = spaceInfo?.name || 'Unknown Space'
          const spaceCategory = spaceInfo?.category || 'Unknown'

          // Get guest info
          const guestInfo = seekerData[booking.seeker_id]
          const guestName = guestInfo ? 
            `${guestInfo.first_name || ''} ${guestInfo.last_name || ''}`.trim() || 'Unknown Guest' : 
            'Unknown Guest'
          const guestEmail = guestInfo?.email || ''

          return {
            id: booking.id,
            bookingId: booking.booking_reference,
            booking_reference: booking.booking_reference,
            stripePaymentIntentId: stripePaymentIntentId, // Stripe Payment Intent ID for fetching transaction details
            hostName: hostName,
            hostEmail: hostId?.email || '',
            hostAvatar: hostId?.avatar_url || '/assets/images/no_image.png',
            spaceName: spaceName,
            spaceCategory: spaceCategory,
            spaceId: booking.listing_id,
            guestName: guestName,
            guestEmail: guestEmail,
            bookingAmount: baseAmount, // Use baseAmount instead of price
            baseAmount: baseAmount,
            serviceFee: serviceFee,
            processingFee: processingFee,
            commissionRate: commissionRate,
            platformFee: commissionPartner, // Commission before Stripe fees (for display)
            hostPayout: hostPayout,
            hostPayoutStatus: payoutStatus, // 'paid', 'pending', or 'unavailable'
            connectAccountId: connectAccountId,
            partnerFee: 0,
            platformEarnings: platformEarnings, // Net earnings after Stripe fees (from database)
            netApplicationFee: netApplicationFee, // Net application fee after Stripe fees (total platform revenue)
            totalPaid: totalPaid || (baseAmount + serviceFee + processingFee), // Use total_paid if available
            paymentStatus: booking.payment_status || 'pending',
            bookingStatus: booking.status || 'pending',
            bookingDate: new Date(booking.created_at),
            startTime: new Date(booking.start_time || booking.created_at),
            endTime: new Date(booking.end_time || booking.created_at),
            // Refund information
            // For 50/50 splits: refundAmount = seeker's share, transferReversalAmount = partner's share
            refundAmount: refundAmount,
            transferReversalAmount: transferReversalAmount,
            isFullRefund: isFullRefund,
            isPartialRefund: isPartialRefund,
            is50_50Split: is50_50Split,
            // Store raw booking data with explicit refund information
            raw: {
              ...booking,
              // Ensure refund amounts are explicitly included (even if 0)
              refund_amount: refundAmount, // Seeker refund amount for 50/50 splits
              transfer_reversal_amount: transferReversalAmount, // Partner refund amount for 50/50 splits
              stripe_refund_id: booking.stripe_refund_id || null,
              stripe_transfer_reversal_id: booking.stripe_transfer_reversal_id || null
            }
          }
        })

        // Calculate summary stats
        // Filter out ONLY FULL refunds from revenue calculations
        // Partial refunds (including 50/50 splits) keep platform earnings, so include them
        const activeBookings = transformedBookings.filter(b => {
          // Exclude full refunds (platform loses all earnings)
          // Include partial refunds (platform keeps full application fee)
          if (b.isFullRefund) {
            return false // Exclude full refunds
          }
          return true // Include everything else (paid, partial refunds, etc.)
        })
        
        const totalRevenue = activeBookings.reduce((sum, b) => sum + b.bookingAmount, 0)
        const totalCommission = activeBookings.reduce((sum, b) => sum + b.platformFee, 0)
        // Calculate total net application fee (total platform revenue after Stripe fees)
        // This is the sum of all net application fees from Stripe
        const totalNetApplicationFee = activeBookings.reduce((sum, b) => {
          const netFee = b.netApplicationFee || b.platformEarnings || 0
          // Debug first booking
          if (b.id === activeBookings[0]?.id) {
            console.log('💰 Summary Calculation:', {
              bookingId: b.id.substring(0, 8),
              netApplicationFee: b.netApplicationFee,
              platformEarnings: b.platformEarnings,
              serviceFee: b.serviceFee,
              processingFee: b.processingFee,
              commissionPartner: b.platformFee,
              bookingAmount: b.bookingAmount,
              totalPaid: b.totalPaid,
              calculatedNetFee: netFee
            })
          }
          return sum + netFee
        }, 0)
        // Use net application fee as platform earnings (they should be the same)
        const totalPlatformEarnings = totalNetApplicationFee
        
        // Debug summary
        console.log('📊 Summary Totals:', {
          totalRevenue,
          totalCommission,
          totalNetApplicationFee,
          totalPlatformEarnings,
          bookingsCount: activeBookings.length
        })
        
        // Calculate total host payouts from actual payout requests only
        // Only count successful payout requests that were actually processed
        // This represents the actual amount withdrawn to hosts' bank accounts
        const totalHostPayouts = typeof totalPayoutRequests === 'number' ? totalPayoutRequests : 0
        
        console.log('💰 Host Payouts (from payout requests):', {
          actualPayoutRequests: totalHostPayouts,
          total: totalHostPayouts
        })
        const averageCommissionRate = totalRevenue > 0 ? (totalCommission / totalRevenue) * 100 : 0

        const summary = {
          totalRevenue,
          totalCommission, // Commission before Stripe fees
          totalPlatformEarnings, // Net earnings after Stripe fees
          totalNetApplicationFee, // Total net application fee (total platform revenue after Stripe fees)
          totalHostPayouts,
          averageCommissionRate,
          totalTransactions: activeBookings.length
        }

        // Calculate monthly data (excluding refunded bookings)
        const monthlyMap = new Map()
        activeBookings.forEach(booking => {
          const month = booking.bookingDate.toISOString().substring(0, 7) // YYYY-MM
          if (!monthlyMap.has(month)) {
            monthlyMap.set(month, { 
              month, 
              revenue: 0, 
              platformEarnings: 0, 
              hostPayouts: 0,
              transactions: 0,
              avgCommissionRate: 0
            })
          }
          const data = monthlyMap.get(month)
          data.revenue += booking.bookingAmount
          // Use platformEarnings (net after Stripe fees) for monthly data
          data.platformEarnings += booking.platformEarnings
          // Only count actual payouts (withdrawn to bank)
          if (booking.hostPayoutStatus === 'paid' && booking.hostPayout) {
          data.hostPayouts += booking.hostPayout
          }
          data.transactions += 1
        })

        // Calculate average commission rate for each month
        monthlyMap.forEach((data, month) => {
          // Calculate rate based on commission (before fees) for consistency
          const monthlyCommission = activeBookings
            .filter(b => b.bookingDate.toISOString().substring(0, 7) === month)
            .reduce((sum, b) => sum + b.platformFee, 0)
          data.avgCommissionRate = data.revenue > 0 ? (monthlyCommission / data.revenue) * 100 : 0
        })

        const monthlyData = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))

        // Calculate host earnings (excluding refunded bookings)
        const hostMap = new Map()
        activeBookings.forEach(booking => {
          const hostId = booking.hostEmail
          if (!hostId) return

          if (!hostMap.has(hostId)) {
            hostMap.set(hostId, {
              id: hostId,
              hostName: booking.hostName,
              hostEmail: booking.hostEmail,
              hostAvatar: booking.hostAvatar,
              totalRevenue: 0,
              totalCommission: 0,
              totalPayout: 0,
              bookings: 0
            })
          }
          
          const hostData = hostMap.get(hostId)
          hostData.totalRevenue += booking.bookingAmount
          hostData.totalCommission += booking.platformFee // Commission before Stripe fees
          // Only count actual payouts (withdrawn to bank)
          if (booking.hostPayoutStatus === 'paid' && booking.hostPayout) {
          hostData.totalPayout += booking.hostPayout
          }
          hostData.bookings += 1
        })

        const hostEarnings = Array.from(hostMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)

        setCommissionData({
          summary,
          bookings: transformedBookings,
          monthlyData,
          hostEarnings,
          loading: false,
          error: null
        })

        console.log('✅ REAL commission data loaded successfully:', {
          bookings: transformedBookings.length,
          totalRevenue: summary.totalRevenue,
          totalCommission: summary.totalCommission,
          totalPlatformEarnings: summary.totalPlatformEarnings,
          totalTransactions: summary.totalTransactions
        })
      } else {
        console.log('⚠️ No bookings with commission data found')
        setCommissionData({
          summary: {
            totalRevenue: 0,
            totalCommission: 0,
            totalPlatformEarnings: 0,
            totalHostPayouts: 0,
            averageCommissionRate: 0,
            totalTransactions: 0
          },
          bookings: [],
          monthlyData: [],
          hostEarnings: [],
          loading: false,
          error: null
        })
      }

    } catch (err) {
      console.error('❌ Error fetching commission data:', err)
      setCommissionData(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Failed to fetch commission data'
      }))
    }
  }, [user, isAdmin, authLoading, authInitialized])

  useEffect(() => {
    // Only fetch when auth is ready and user is admin
    if (!authInitialized || authLoading || !user || !isAdmin) {
      return
    }
    
    // Add a small delay to ensure auth state is fully settled
    const timeoutId = setTimeout(() => {
      fetchCommissionData()
    }, 100)
    
    return () => clearTimeout(timeoutId)
  }, [authInitialized, authLoading, user, isAdmin, fetchCommissionData])

  // Realtime: subscribe to bookings changes to keep charts live
  useEffect(() => {
    // Guard: only subscribe when admin and auth ready
    if (!authInitialized || authLoading || !user || !isAdmin) return

    const bookingsChannel = supabase
      .channel('commission_bookings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        console.log('📊 Bookings changed → refreshing commission data')
        fetchCommissionData()
      })
      .subscribe()

    // Optional: listings changes (host mapping etc.)
    const listingsChannel = supabase
      .channel('commission_listings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, () => {
        console.log('🏢 Listings changed → refreshing commission data')
        fetchCommissionData()
      })
      .subscribe()

    // Removed fallback auto-refresh interval to prevent unwanted reloads
    // Real-time subscriptions handle updates automatically

    return () => {
      try { bookingsChannel.unsubscribe() } catch {}
      try { listingsChannel.unsubscribe() } catch {}
    }
  }, [authInitialized, authLoading, user, isAdmin, fetchCommissionData])

  const updateCommissionRate = useCallback(async (bookingId, newRate) => {
    // Implementation for updating commission rate
    console.log('Updating commission rate for booking:', bookingId, 'to:', newRate)
  }, [])

  const exportCommissionData = useCallback(async () => {
    try {
      console.log('📊 Exporting commission data...')
      
      if (!commissionData.bookings || commissionData.bookings.length === 0) {
        throw new Error('No commission data available to export')
      }

      // Prepare export data - only include specified columns
      const exportRows = commissionData.bookings.map(booking => ({
        'Reference': booking.bookingId || booking.booking_reference || '',
        'Host': booking.hostName || '',
        'Space': booking.spaceName || '',
        'Booking Amount': booking.bookingAmount?.toFixed(2) || '0.00',
        'Platform Earnings': booking.platformEarnings?.toFixed(2) || '0.00',
        'Host Payout': booking.hostPayout?.toFixed(2) || '0.00',
        'Status': booking.paymentStatus === 'paid' ? 'Successful' : 
                 booking.paymentStatus === 'refunded' 
                   ? (booking.is50_50Split ? '50/50 Refund' : 
                      booking.isPartialRefund ? 'Partial Refund' : 'Full Refund')
                   : booking.paymentStatus === 'failed' ? 'Failed' :
                     booking.paymentStatus === 'pending' ? 'Pending' :
                     booking.paymentStatus?.charAt(0).toUpperCase() + booking.paymentStatus?.slice(1) || 'Pending',
        'Date': booking.bookingDate 
          ? (booking.bookingDate instanceof Date 
              ? booking.bookingDate.toLocaleDateString('en-US')
              : (() => {
                  const date = new Date(booking.bookingDate);
                  return isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US');
                })())
          : ''
      }))

      // Add summary row
      const summaryRow = {
        'Reference': 'SUMMARY',
        'Host': '',
        'Space': '',
        'Booking Amount': commissionData.summary.totalRevenue.toFixed(2),
        'Platform Earnings': commissionData.summary.totalPlatformEarnings.toFixed(2),
        'Host Payout': commissionData.summary.totalHostPayouts.toFixed(2),
        'Status': '',
        'Date': ''
      }

      // Combine data with summary
      const allRows = [...exportRows, summaryRow]

      // Generate CSV
      const headers = Object.keys(allRows[0])
      const csvContent = [
        headers.join(','),
        ...allRows.map(row => 
          headers.map(header => {
            const value = row[header] || ''
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`
          }).join(',')
        )
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const fileName = `spacel-commission-report-${new Date().toISOString().split('T')[0]}.csv`
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      console.log('✅ Commission data exported successfully')
      return { success: true, message: 'Commission report exported successfully' }
    } catch (error) {
      console.error('❌ Error exporting commission data:', error)
      throw error
    }
  }, [commissionData])

  return {
    ...commissionData,
    refetch: fetchCommissionData,
    updateCommissionRate,
    exportCommissionData
  }
}

export default useCommissionData