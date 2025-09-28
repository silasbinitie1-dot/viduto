import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@16.12.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    console.log('🚀 create-stripe-portal function called')
    console.log('📥 Request method:', req.method)

    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      console.error('❌ Stripe API key not found')
      return new Response(
        JSON.stringify({ success: false, error: 'Stripe API key not found. Please set STRIPE_SECRET_KEY environment variable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-06-20',
    })
    console.log('✅ Stripe client initialized')

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('✅ Supabase client initialized')

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('❌ No authorization header found')
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '')
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.log('❌ Authentication failed:', authError?.message || 'No user')
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ User authenticated:', user.id, user.email)

    // Get user profile from Supabase
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single()

    if (userError || !userProfile) {
      console.log('❌ User profile not found:', userError?.message || 'No profile data')
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ User profile found:', { stripe_customer_id: userProfile.stripe_customer_id })

    // Find or create Stripe customer
    let customer
    
    if (userProfile.stripe_customer_id) {
      // Try to retrieve existing customer
      try {
        customer = await stripe.customers.retrieve(userProfile.stripe_customer_id)
        console.log('✅ Found existing customer:', customer.id)
      } catch (customerError) {
        console.warn('⚠️ Existing customer not found, will create new one:', customerError.message)
        customer = null
      }
    }

    if (!customer) {
      // Search for customer by email or create new one
      console.log('🔍 Searching for existing customer by email...')
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1
      })

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0]
        console.log('✅ Found existing customer by email:', customer.id)
        
        // Update user profile with the found customer ID
        await supabase
          .from('users')
          .update({ stripe_customer_id: customer.id })
          .eq('id', user.id)
      } else {
        console.log('🆕 Creating new customer...')
        customer = await stripe.customers.create({
          email: user.email,
          name: userProfile.full_name || user.email,
          metadata: { 
            user_id: user.id,
            user_email: user.email
          }
        })
        console.log('✅ Created new customer:', customer.id)
        
        // Update user profile with new customer ID
        await supabase
          .from('users')
          .update({ stripe_customer_id: customer.id })
          .eq('id', user.id)
      }
    }

    if (!customer.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'No Stripe customer found. Please subscribe first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Stripe customer portal session
    console.log('🔗 Creating customer portal session...')
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${req.headers.get('origin') || 'https://viduto-tsng.bolt.host'}/dashboard`,
    })
    console.log('✅ Portal session created:', portalSession.id)
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: portalSession.url
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in create-stripe-portal:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})