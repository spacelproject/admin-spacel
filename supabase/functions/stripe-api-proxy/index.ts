/**
 * Unified Stripe API Proxy Edge Function
 * Handles all Stripe API calls securely using Stripe SDK
 * 
 * Setup:
 * 1. Set STRIPE_SECRET_KEY in Supabase secrets:
 *    supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
 * 
 * 2. Deploy:
 *    supabase functions deploy stripe-api-proxy
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify admin authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin status
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (adminError || !adminCheck) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { action, ...params } = await req.json();

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    // Route to appropriate Stripe API call
    switch (action) {
      case 'get_payment_intent':
        // Expand all related objects for comprehensive transaction data
        // Note: application_fee cannot be expanded directly on PaymentIntent
        // It must be fetched separately if needed using the application_fee_id
        const expandParams = params.expand || [
          'latest_charge',
          'latest_charge.balance_transaction',
          'latest_charge.balance_transaction.fee_details',
          'latest_charge.refunds',
          'latest_charge.dispute',
          'latest_charge.destination',
          'latest_charge.transfer',
          'latest_charge.transfer.destination'
        ];
        result = await stripe.paymentIntents.retrieve(
          params.payment_intent_id,
          { expand: expandParams }
        );
        break;

      case 'get_balance_transaction':
        result = await stripe.balanceTransactions.retrieve(params.balance_transaction_id);
        break;

      case 'list_balance_transactions':
        result = await stripe.balanceTransactions.list({
          created: params.created,
          limit: params.limit || 100,
        });
        break;

      case 'get_charge':
        result = await stripe.charges.retrieve(
          params.charge_id,
          { expand: params.expand || [] }
        );
        break;

      case 'get_transfer':
        result = await stripe.transfers.retrieve(params.transfer_id);
        break;

      case 'get_payout':
        result = await stripe.payouts.retrieve(params.payout_id);
        break;

      case 'list_payouts':
        result = await stripe.payouts.list({
          created: params.created,
          limit: params.limit || 100,
        });
        break;

      case 'list_connect_payouts':
        // List payouts from a Stripe Connect account
        // Requires stripe_account_id in params
        if (!params.stripe_account_id) {
          throw new Error('stripe_account_id is required for list_connect_payouts');
        }
        result = await stripe.payouts.list(
          {
            created: params.created,
            limit: params.limit || 100,
          },
          {
            stripeAccount: params.stripe_account_id
          }
        );
        break;

      case 'list_disputes':
        result = await stripe.disputes.list({
          created: params.created,
          limit: params.limit || 100,
        });
        break;

      case 'delete_account':
        // Delete a Stripe Connect account
        result = await stripe.accounts.del(params.account_id);
        break;

      case 'list_accounts':
        // List all connected accounts
        result = await stripe.accounts.list({
          limit: params.limit || 100,
        });
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Stripe API Proxy Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

