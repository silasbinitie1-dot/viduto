import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@16.12.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Plan credit mapping
const PLAN_CREDITS = {
  'Free': 20,
  'Starter': 60,
  'Creator': 150,
  'Pro': 300,
  'Elite': 750
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
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-06-20',
    })

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
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
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let updatedUser = { ...userProfile }

    // If user has Stripe customer ID, sync with Stripe
    if (userProfile.stripe_customer_id) {
      try {
        // Get customer from Stripe
        const customer = await stripe.customers.retrieve(userProfile.stripe_customer_id)
        
        if (customer.deleted) {
          // Customer was deleted in Stripe, reset to free plan
          updatedUser = {
            ...userProfile,
            current_plan: 'Free',
            credits: 20,
            subscription_status: 'inactive',
            subscription_period_end: null,
            stripe_customer_id: null
          }
        } else {
          // Get active subscriptions
          const subscriptions = await stripe.subscriptions.list({
            customer: userProfile.stripe_customer_id,
            status: 'active',
            limit: 1
          })

          if (subscriptions.data.length > 0) {
            const subscription = subscriptions.data[0]
            const priceId = subscription.items.data[0]?.price?.id
            
            // Map price ID to plan
            const planMapping = {
              'price_1S7HjfDaWkYYoAByjBQ4K5Qr': 'Starter',
              'price_1S7Hk2DaWkYYoAByJ6sj8xHK': 'Creator',
              'price_1S7HkHDaWkYYoAByhHMb2xZV': 'Pro',
              'price_1S7HkQDaWkYYoAByeEvQ7b0E': 'Elite'
            }

            const planName = planMapping[priceId] || 'Free'
            const planCredits = PLAN_CREDITS[planName] || 20

            // Check if credits need monthly reset
            const now = new Date()
            const periodEnd = new Date(subscription.current_period_end * 1000)
            const lastUpdate = new Date(userProfile.updated_at)
            
            // Reset credits if we're in a new billing period
            const shouldResetCredits = lastUpdate < new Date(subscription.current_period_start * 1000)

            updatedUser = {
              ...userProfile,
              current_plan: planName,
              credits: shouldResetCredits ? planCredits : userProfile.credits,
              subscription_status: 'active',
              subscription_period_end: periodEnd.toISOString()
            }
          } else {
            // No active subscription, check for past due or cancelled
            const allSubscriptions = await stripe.subscriptions.list({
              customer: userProfile.stripe_customer_id,
              limit: 1
            })

            if (allSubscriptions.data.length > 0) {
              const subscription = allSubscriptions.data[0]
              
              if (subscription.status === 'past_due') {
                updatedUser = {
                  ...userProfile,
                  subscription_status: 'past_due'
                }
              } else {
                // Subscription was cancelled, downgrade to free
                updatedUser = {
                  ...userProfile,
                  current_plan: 'Free',
                  credits: 20,
                  subscription_status: 'inactive',
                  subscription_period_end: null
                }
              }
            }
          }
        }

        // Update user in database if changes were made
        if (JSON.stringify(updatedUser) !== JSON.stringify(userProfile)) {
          await supabase
            .from('users')
            .update({
              ...updatedUser,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
        }

      } catch (stripeError) {
        console.error('Error syncing with Stripe:', stripeError)
        // Continue with existing user data if Stripe sync fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: updatedUser
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in sync-user-stripe:', error)
    
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