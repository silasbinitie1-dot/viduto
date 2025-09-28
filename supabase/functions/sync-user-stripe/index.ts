import { createClient } from 'npm:@supabase/supabase-js@2'

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

    // In production, this would sync with actual Stripe API
    // For now, we'll just ensure the user has the correct credits for their plan
    const currentPlan = userProfile.current_plan || 'Free'
    const expectedCredits = PLAN_CREDITS[currentPlan] || 20

    // Check if credits need to be reset (monthly reset logic)
    const now = new Date()
    const lastUpdate = new Date(userProfile.updated_at)
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))

    let shouldResetCredits = false
    
    // Reset credits if it's been more than 30 days since last update
    // In production, this would be based on actual subscription billing cycle
    if (daysSinceUpdate >= 30 && userProfile.subscription_status === 'active') {
      shouldResetCredits = true
    }

    let updatedCredits = userProfile.credits
    if (shouldResetCredits) {
      updatedCredits = expectedCredits
      
      await supabase
        .from('users')
        .update({
          credits: updatedCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          ...userProfile,
          credits: updatedCredits
        },
        credits_reset: shouldResetCredits
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