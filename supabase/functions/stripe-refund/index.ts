import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefundRequest {
  payment_intent: string;
  amount?: number | null;
  reason?: string;
  booking_id?: string;
  refund_type?: string; // 'full', 'partial', 'split_50_50'
  partner_refund_amount?: number; // For 50/50 split, the partner portion
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminUser) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const refundRequest: RefundRequest = await req.json();
    const { payment_intent, amount, reason = 'requested_by_customer', refund_type, partner_refund_amount } = refundRequest;

    if (!payment_intent) {
      return new Response(
        JSON.stringify({ error: 'Payment intent ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process refund using Stripe SDK
    let refundData = null;

    try {
      // Use Stripe SDK to process the refund
      // Note: Edge Functions use Stripe SDK (not MCP) for production
      // MCP tools are available in AI context for testing/development
      
      const Stripe = (await import('npm:stripe@latest')).default;
      const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
      
      if (!stripeSecretKey) {
        throw new Error('STRIPE_SECRET_KEY not configured. Please set it in Supabase secrets.');
      }
      
      const stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2024-12-18.acacia',
      });

      // Get payment intent to find the charge
      const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent);
      
      if (!paymentIntent.latest_charge) {
        throw new Error('Payment intent has no charge to refund');
      }

      // Calculate platform earnings from commission and get net application fee
      // Platform earnings = commission_partner - Stripe fees on commission
      // Stripe fees: 2.9% + $0.30 per transaction
      let platformEarnings = null;
      let netApplicationFee = null;
      
      if (refundRequest.booking_id) {
        try {
          // Fetch booking to get commission_partner
          const { data: bookingData, error: bookingError } = await supabase
            .from('bookings')
            .select('commission_partner')
            .eq('id', refundRequest.booking_id)
            .single();
          
          if (!bookingError && bookingData?.commission_partner) {
            const commissionAmount = parseFloat(bookingData.commission_partner);
            if (commissionAmount > 0) {
              // Calculate Stripe fees: 2.9% + $0.30
              const stripeFees = (commissionAmount * 0.029) + 0.30;
              platformEarnings = Math.max(0, commissionAmount - stripeFees);
              console.log(`✅ Calculated platform earnings: $${platformEarnings.toFixed(2)} (from $${commissionAmount.toFixed(2)} commission)`);
            }
          }
          
          // Try to get net application fee from balance transaction
          if (paymentIntent.latest_charge) {
            try {
              const chargeId = typeof paymentIntent.latest_charge === 'string' 
                ? paymentIntent.latest_charge 
                : paymentIntent.latest_charge.id;
              
              const charge = typeof paymentIntent.latest_charge === 'object'
                ? paymentIntent.latest_charge
                : await stripe.charges.retrieve(chargeId, {
                    expand: ['balance_transaction']
                  });
              
              if (charge.balance_transaction) {
                const balanceTx = typeof charge.balance_transaction === 'string'
                  ? await stripe.balanceTransactions.retrieve(charge.balance_transaction)
                  : charge.balance_transaction;
                
                if (balanceTx.net) {
                  netApplicationFee = balanceTx.net / 100; // Convert from cents to dollars
                  console.log(`✅ Retrieved net application fee: $${netApplicationFee.toFixed(2)}`);
                }
              }
            } catch (balanceTxError) {
              console.warn('⚠️ Failed to fetch balance transaction for net application fee:', balanceTxError);
            }
          }
        } catch (calcError) {
          console.warn('⚠️ Failed to calculate platform earnings:', calcError);
        }
      }

      // Check if this is a destination charge (Stripe Connect)
      // Destination charges have `on_behalf_of` or `transfer_data` set
      const isDestinationCharge = !!(paymentIntent.on_behalf_of || paymentIntent.transfer_data?.destination);
      
      // Prepare refund parameters
      const refundParams: any = {
        charge: paymentIntent.latest_charge as string,
        amount: amount || undefined, // undefined = full refund
        reason: reason as 'duplicate' | 'fraudulent' | 'requested_by_customer',
        metadata: {
          processed_by: user.id,
          admin_role: adminUser.role,
          booking_id: refundRequest.booking_id || '',
          refund_type: refund_type || 'full',
        }
      };

      // For 50/50 split refunds:
      // - Refund seeker portion (partial refund)
      // - Do NOT reverse transfer (partner portion handled separately)
      // - Do NOT refund application fee (platform keeps it)
      if (refund_type === 'split_50_50') {
        // Partial refund to seeker only, no transfer reversal, no application fee refund
        refundParams.reverse_transfer = false;
        refundParams.refund_application_fee = false;
        console.log('💰 Processing 50/50 split refund - seeker portion only, keeping platform fee');
      } else if (isDestinationCharge) {
        // For regular full/partial refunds on destination charges:
        // Reverse the transfer and refund the application fee
        // This ensures:
        // 1. Partner's share (e.g., A$96) is reversed from their Connect account
        // 2. Platform's application fee (e.g., A$18.26) is refunded
        // 3. Customer receives the full refund amount
        refundParams.reverse_transfer = true;
        refundParams.refund_application_fee = true;
      }

      // Create refund on the charge
      const refund = await stripe.refunds.create(refundParams);

      // For 50/50 split, process partner refund via transfer reversal
      let transferReversalData = null;
      if (refund_type === 'split_50_50' && partner_refund_amount && partner_refund_amount > 0 && isDestinationCharge) {
        try {
          console.log('🔄 Processing partner refund via transfer reversal...', { partner_refund_amount });
          
          // Get the charge to find the transfer
          const chargeId = typeof paymentIntent.latest_charge === 'string' 
            ? paymentIntent.latest_charge 
            : paymentIntent.latest_charge.id;
          
          const charge = typeof paymentIntent.latest_charge === 'object'
            ? paymentIntent.latest_charge
            : await stripe.charges.retrieve(chargeId, {
                expand: ['transfer']
              });
          
          // Get transfer ID from charge
          const transferId = charge.transfer;
          
          if (transferId && typeof transferId === 'string') {
            // Create partial transfer reversal for partner refund amount
            const transferReversal = await stripe.transfers.createReversal(
              transferId,
              {
                amount: partner_refund_amount, // Amount in cents
                metadata: {
                  processed_by: user.id,
                  admin_role: adminUser.role,
                  booking_id: refundRequest.booking_id || '',
                  refund_type: 'split_50_50_partner_portion'
                }
              }
            );
            
            transferReversalData = {
              id: transferReversal.id,
              amount: transferReversal.amount,
              transfer: transferReversal.transfer,
              status: transferReversal.status
            };
            
            console.log('✅ Partner transfer reversal created:', transferReversalData);
          } else {
            console.warn('⚠️ No transfer found for partner refund - transfer may not exist yet');
          }
        } catch (transferError: any) {
          console.error('❌ Error creating transfer reversal for partner refund:', transferError);
          // Don't fail the entire refund if transfer reversal fails
          // Log it for manual processing
          transferReversalData = {
            error: transferError.message,
            note: 'Transfer reversal failed - requires manual processing'
          };
        }
      }

      refundData = {
        id: refund.id,
        object: refund.object,
        amount: refund.amount,
        currency: refund.currency,
        payment_intent: refund.payment_intent,
        reason: refund.reason,
        status: refund.status,
        created: refund.created,
        metadata: refund.metadata,
        // Include transfer reversal information to verify where funds were taken from
        transfer_reversal: (refund as any).transfer_reversal || transferReversalData?.id || null,
        reverse_transfer: refund_type === 'split_50_50' ? false : (isDestinationCharge ? true : false),
        refund_application_fee: refund_type === 'split_50_50' ? false : (isDestinationCharge ? true : false),
        // For 50/50 split, include partner refund information
        partner_refund: refund_type === 'split_50_50' ? {
          amount: partner_refund_amount,
          transfer_reversal: transferReversalData
        } : null
      };
      
    } catch (stripeError: any) {
      console.error('Stripe refund processing error:', stripeError);
      
      // If Stripe SDK fails, return a pending status
      // This allows the database update to proceed even if Stripe fails
      refundData = {
        id: `re_pending_${Date.now()}`,
        object: 'refund',
        amount: amount || null,
        currency: 'aud',
        payment_intent: payment_intent,
        reason: reason,
        status: 'pending',
        created: Math.floor(Date.now() / 1000),
        error: stripeError?.message || 'Unknown error',
        metadata: {
          processed_by: user.id,
          admin_role: adminUser.role,
          booking_id: refundRequest.booking_id || null,
          note: 'Refund queued - Stripe processing failed. Requires manual processing via Stripe dashboard.',
          error_details: stripeError?.message
        }
      };
    }

    // Update booking with platform earnings and net application fee if available
    // This ensures we have platform earnings and net application fee for refunded bookings
    if (refundRequest.booking_id && (platformEarnings !== null || netApplicationFee !== null)) {
      try {
        const updateData: any = {
          updated_at: new Date().toISOString()
        };
        
        if (platformEarnings !== null) {
          updateData.platform_earnings = platformEarnings;
        }
        
        if (netApplicationFee !== null) {
          updateData.net_application_fee = netApplicationFee;
        }
        
        await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', refundRequest.booking_id);
        
        if (platformEarnings !== null) {
          console.log(`✅ Updated platform_earnings for booking ${refundRequest.booking_id}: ${platformEarnings}`);
        }
        if (netApplicationFee !== null) {
          console.log(`✅ Updated net_application_fee for booking ${refundRequest.booking_id}: ${netApplicationFee}`);
        }
      } catch (updateError) {
        console.error('Error updating booking with Stripe data:', updateError);
        // Don't fail the refund if this update fails
      }
    }

    // Log the refund request to payment_logs table
    if (refundRequest.booking_id) {
      await supabase
        .from('payment_logs')
        .insert({
          booking_id: refundRequest.booking_id,
          stripe_payment_intent_id: payment_intent,
          stripe_refund_id: refundData.id,
          amount: amount ? -Math.abs(amount) : null, // Negative for refund
          currency: 'aud',
          status: refundData.status === 'succeeded' ? 'refunded' : 'pending',
          event_type: 'refund.created',
          metadata: {
            reason: reason,
            processed_by: user.id,
            stripe_refund_id: refundData.id,
            refund_amount: amount,
            refund_type: amount ? 'partial' : 'full'
          },
          created_at: new Date().toISOString()
        });
    }

    return new Response(
      JSON.stringify(refundData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error processing refund:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
