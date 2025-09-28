import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CheckoutRequest {
  priceId: string
  mode: 'subscription' | 'payment'
  quantity?: number
}

// Plan credit mapping
const PLAN_CREDITS = {
  'price_1S7HjfDaWkYYoAByjBQ4K5Qr': { name: 'Starter', credits: 60 },
  'price_1S7Hk2DaWkYYoAByJ6sj8xHK': { name: 'Creator', credits: 150 },
  'price_1S7HkHDaWkYYoAByhHMb2xZV': { name: 'Pro', credits: 300 },
  'price_1S7HkQDaWkYYoAByeEvQ7b0E': { name: 'Elite', credits: 750 }
}

const getCurrentPlanCredits = (currentPlan: string): number => {
  const planCreditsMap = {
    'Free': 20,
    'Starter': 60,
    'Creator': 150,
    'Pro': 300,
    'Elite': 750
  }
  return planCreditsMap[currentPlan] || 20
}

const calculateNewCredits = (currentCredits: number, currentPlan: string, newPlan: string): number => {
  const oldPlanCredits = getCurrentPlanCredits(currentPlan)
  const newPlanCredits = getCurrentPlanCredits(newPlan)
  
  // Formula: current credits + credits in new plan - credits in old plan
  const newCredits = currentCredits + newPlanCredits - oldPlanCredits
  
  // Ensure credits don't go below 0 or above new plan limit
  return Math.max(0, Math.min(newCredits, newPlanCredits))
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

    const { priceId, mode, quantity = 1 }: CheckoutRequest = await req.json()

    if (!priceId || !mode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: priceId and mode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // For subscription mode, check if this is an upgrade and calculate new credits
    if (mode === 'subscription') {
      const newPlanInfo = PLAN_CREDITS[priceId]
      if (!newPlanInfo) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid subscription plan' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // If user already has an active subscription, calculate prorated credits
      if (userProfile.subscription_status === 'active' && userProfile.current_plan !== 'Free') {
        const newCredits = calculateNewCredits(
          userProfile.credits || 0,
          userProfile.current_plan,
          newPlanInfo.name
        )

        // Update user with new plan and calculated credits immediately
        await supabase
          .from('users')
          .update({
            current_plan: newPlanInfo.name,
            credits: newCredits,
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        // Return success with redirect to dashboard
        return new Response(
          JSON.stringify({
            success: true,
            upgraded: true,
            redirect_url: '/dashboard',
            message: 'Plan upgraded successfully with prorated credits!'
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // For new subscriptions or one-time purchases, return mock Stripe URL
    // In production, this would create actual Stripe checkout sessions
    const checkoutUrl = `https://checkout.stripe.com/pay/mock-${priceId}-${mode}-${quantity}`
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: checkoutUrl
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in create-stripe-checkout:', error)
    
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