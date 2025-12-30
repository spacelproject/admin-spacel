import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentIntentRequest {
  payment_intent_id: string;
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Check if using service role key (for admin operations)
    const token = authHeader.replace('Bearer ', '');
    const isServiceRoleKey = token === supabaseServiceKey;
    
    let supabase;
    let user = null;
    if (isServiceRoleKey) {
      // Use service role key for admin access
      supabase = createClient(supabaseUrl, supabaseServiceKey);
    } else {
      // Use anon key with user session
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      // Verify user is authenticated
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      user = userData;
    }

    // Verify user is admin (skip if using service role key)
    if (!isServiceRoleKey && user) {
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!adminUser) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Admin access required' }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Parse request body
    const body: PaymentIntentRequest = await req.json();
    const { payment_intent_id } = body;

    if (!payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'Missing payment_intent_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Retrieve payment intent from Stripe
    const Stripe = (await import('npm:stripe@latest')).default;
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    });

    // Retrieve payment intent from Stripe, expanding related objects
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id, {
      expand: ['latest_charge', 'latest_charge.balance_transaction', 'latest_charge.balance_transaction.fee_details']
    });
    
    let chargeData = null;
    let balanceTransactionData = null;
    
    if (paymentIntent.latest_charge) {
      const chargeId = typeof paymentIntent.latest_charge === 'string' 
        ? paymentIntent.latest_charge 
        : paymentIntent.latest_charge.id;
      
      try {
        const charge = typeof paymentIntent.latest_charge === 'object' 
          ? paymentIntent.latest_charge 
          : await stripe.charges.retrieve(chargeId, {
              expand: ['balance_transaction', 'balance_transaction.fee_details']
            });
        
        chargeData = {
          id: charge.id,
          amount: charge.amount,
          amount_captured: charge.amount_captured,
          application_fee_amount: charge.application_fee_amount,
          fee: charge.fee,
          net: charge.net,
          currency: charge.currency
        };
        
        if (charge.balance_transaction) {
          const balanceTx = typeof charge.balance_transaction === 'string'
            ? await stripe.balanceTransactions.retrieve(charge.balance_transaction)
            : charge.balance_transaction;
          
          balanceTransactionData = {
            id: balanceTx.id,
            amount: balanceTx.amount, // Total amount in cents
            fee: balanceTx.fee, // Total fees in cents
            net: balanceTx.net, // Net amount that lands in account (in cents)
            currency: balanceTx.currency,
            fee_details: balanceTx.fee_details || []
          };
        }
      } catch (chargeError) {
        console.warn('Error fetching charge details:', chargeError);
      }
    }
    
    const paymentIntentData = {
      id: paymentIntent.id,
      amount: paymentIntent.amount, // Total payment amount in cents
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      metadata: paymentIntent.metadata,
      application_fee_amount: paymentIntent.application_fee_amount, // Application fee in cents
      created: paymentIntent.created,
      latest_charge: paymentIntent.latest_charge,
      charge: chargeData,
      balance_transaction: balanceTransactionData,
      on_behalf_of: paymentIntent.on_behalf_of,
      transfer_data: paymentIntent.transfer_data
    };
    
    return new Response(
      JSON.stringify(paymentIntentData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    console.error('Error retrieving payment intent:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to retrieve payment intent',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
