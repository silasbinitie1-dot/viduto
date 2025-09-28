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

    console.log('=== SYNC USER WITH STRIPE START ===', { email: user.email, ts: new Date().toISOString() })

    // Get user profile
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
    
    if (userError || !users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'User record not found in database' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const userRecord = users[0]

    // Check for recent webhook update (protection mechanism)
    if (userRecord.last_webhook_update) {
      const lastWebhookTime = new Date(userRecord.last_webhook_update).getTime()
      const tenMinutesAgo = Date.now() - (10 * 60 * 1000)
      
      if (lastWebhookTime > tenMinutesAgo) {
        console.log('ℹ️ Recent webhook update detected, skipping sync to avoid conflicts')
        return new Response(
          JSON.stringify({
            success: true,
            user: userRecord,
            message: 'Recent webhook update detected - sync skipped to avoid conflicts',
            last_webhook_update: userRecord.last_webhook_update
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    console.log('=== EXISTING USER RECORD FOUND ===')
    console.log('User ID:', userRecord.id)
    console.log('Current credits:', userRecord.credits)
    console.log('Subscription status:', userRecord.subscription_status)
    console.log('Current plan:', userRecord.current_plan)
    console.log('Stripe customer ID:', userRecord.stripe_customer_id)

    // Find or verify Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 })
    if (!customers || customers.data.length === 0) {
      console.log('ℹ️ No Stripe customer found for', user.email)
      // If DB indicates paid state but no Stripe customer, reset subscription metadata only (preserve credits)
      if (userRecord.subscription_status === 'active' || userRecord.current_plan) {
        const updateData = {
          subscription_status: 'inactive',
          stripe_customer_id: null,
          subscription_period_end: null,
          current_plan: 'Free',
          updated_at: new Date().toISOString()
        }
        
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', userRecord.id)
          .select()
          .single()
          
        if (updateError) {
          throw updateError
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            user: updatedUser,
            message: 'No Stripe customer found - reset subscription metadata only, credits preserved'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({
          success: true,
          user: userRecord,
          message: 'No Stripe customer found - user remains unchanged'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const customer = customers.data[0]

    // Try to get active subscription
    let activeSubscription = null

    if (userRecord.stripe_customer_id) {
      try {
        const subs = await stripe.subscriptions.list({
          customer: userRecord.stripe_customer_id,
          status: 'active',
          limit: 1
        })
        if (subs && subs.data.length > 0) {
          activeSubscription = subs.data[0]
        }
      } catch (e) {
        console.warn('Error fetching subscription by customer ID:', e.message)
      }
    }

    if (!activeSubscription) {
      const subs = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1
      })
      if (subs && subs.data.length > 0) {
        activeSubscription = subs.data[0]
      }
    }

    const planMapping = {
      'price_1S7HjfDaWkYYoAByjBQ4K5Qr': { name: 'Starter', credits: 60 },
      'price_1S7Hk2DaWkYYoAByJ6sj8xHK': { name: 'Creator', credits: 150 },
      'price_1S7HkHDaWkYYoAByhHMb2xZV': { name: 'Pro', credits: 300 },
      'price_1S7HkQDaWkYYoAByeEvQ7b0E': { name: 'Elite', credits: 750 }
    }

    if (activeSubscription) {
      const priceId = activeSubscription.items?.data?.[0]?.price?.id || null
      const plan = planMapping[priceId] || { name: 'Unknown', credits: 60 }

      const updateData = {
        subscription_status: 'active',
        stripe_customer_id: customer.id,
        subscription_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
        current_plan: plan.name,
        updated_at: new Date().toISOString()
      }

      // Reconciliation when webhook hasn't updated credits
      const currentCredits = Number(userRecord.credits || 0)
      const previousPlan = userRecord.current_plan
      const wasFree = (!previousPlan || previousPlan === 'Free' || userRecord.subscription_status === 'inactive' || !userRecord.subscription_status)

      let creditsUpdate = undefined

      if (wasFree && plan.name === 'Starter') {
        // Force exactly 60 for FREE → Starter, regardless of current credits
        if (currentCredits !== 60) {
          creditsUpdate = 60
          console.log('🔧 Reconciling FREE->STARTER to exactly 60 credits')
        }
      } else if (wasFree) {
        // Expect baseline (>=20) + plan credits (e.g., free->Creator: 20 + 150 = 170)
        const baseline = Math.max(currentCredits, 20)
        const expectedMin = baseline + plan.credits
        if (currentCredits < expectedMin) {
          creditsUpdate = expectedMin
          console.log('🔧 Reconciling FREE->PAID credits:', { baseline, planCredits: plan.credits, expectedMin, currentCredits })
        }
      } else if (previousPlan && previousPlan !== plan.name) {
        // Paid->Paid upgrade: add the positive difference; never decrease
        const previousPlanCredits = {
          'Starter': 60,
          'Creator': 150,
          'Pro': 300,
          'Elite': 750
        }[previousPlan] || 0
        const diff = plan.credits - previousPlanCredits
        if (diff > 0) {
          const expected = currentCredits + diff
          if (expected > currentCredits) {
            creditsUpdate = expected
            console.log('🔧 Reconciling PAID->PAID upgrade credits:', { previousPlan, previousPlanCredits, newPlan: plan.name, newPlanCredits: plan.credits, diff, currentCredits, expected })
          }
        }
      }

      // IMPORTANT: apply creditsUpdate even if it reduces credits for FREE->Starter case
      if (typeof creditsUpdate === 'number') {
        updateData.credits = creditsUpdate
        console.log('💾 Applying credits reconciliation to:', creditsUpdate)
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userRecord.id)
        .select()
        .single()
        
      if (updateError) {
        throw updateError
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: updatedUser,
          message: updateData.credits != null ? 'Subscription synced with credits reconciliation' : 'Subscription metadata synced; credits preserved',
          credits: updatedUser.credits
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No active subscription
    if (userRecord.subscription_status === 'active') {
      const updateData = {
        subscription_status: 'inactive',
        stripe_customer_id: customer.id,
        subscription_period_end: null,
        current_plan: 'Free',
        updated_at: new Date().toISOString()
        // Preserve credits
      }
      
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userRecord.id)
        .select()
        .single()
        
      if (updateError) {
        throw updateError
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          user: updatedUser,
          message: 'No active subscription - reset to free plan, credits preserved',
          credits_preserved: userRecord.credits
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: userRecord,
        message: 'No active subscription found - user remains unchanged',
        credits_preserved: userRecord.credits
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error in sync-user-stripe:', error)
    
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