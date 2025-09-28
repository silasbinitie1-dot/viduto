import { createClient } from 'npm:@supabase/supabase-js@2'

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

    console.log(`=== ENSURE USER CREDITS START ===`)
    console.log(`User: ${user.email}`)
    console.log('Timestamp:', new Date().toISOString())

    // Get user profile
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
    
    if (userError) {
      console.error('Error fetching user:', userError.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (users && users.length > 0) {
      const userRecord = users[0]
      
      console.log(`=== USER RECORD ANALYSIS ===`)
      console.log('User ID:', userRecord.id)
      console.log('Current credits:', userRecord.credits)
      console.log('Subscription status:', userRecord.subscription_status)
      console.log('Current plan:', userRecord.current_plan)
      console.log('Stripe customer ID:', userRecord.stripe_customer_id)
      
      // Strong paid indicators
      const hasActiveSubscription = userRecord.subscription_status === 'active'
      const hasAnyPaidPlan = !!(userRecord.current_plan && userRecord.current_plan !== 'Free')
      const hasStripeCustomerId = !!(userRecord.stripe_customer_id)

      // ABSOLUTE PROTECTION: never touch credits when any paid indicator is present
      if (hasActiveSubscription || hasAnyPaidPlan || hasStripeCustomerId) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Paid subscription indicators present - credits preserved', 
            credits: userRecord.credits,
            user: userRecord,
            protection_reason: 'paid_subscription_detected'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Only clearly free users with no credits get baseline 20
      const isClearlyFreeUser = (
        (!userRecord.subscription_status || userRecord.subscription_status === 'inactive') &&
        (!userRecord.current_plan || userRecord.current_plan === '' || userRecord.current_plan === null || userRecord.current_plan === 'Free') &&
        !userRecord.stripe_customer_id &&
        (userRecord.credits == null || userRecord.credits === 0 || userRecord.credits === undefined)
      )

      if (isClearlyFreeUser) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ 
            credits: 20,
            subscription_status: 'inactive',
            current_plan: 'Free',
            updated_at: new Date().toISOString()
          })
          .eq('id', userRecord.id)
          .select()
          .single()
        
        if (updateError) {
          console.error('Error updating user credits:', updateError.message)
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to update user credits' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Added 20 free credits for clearly free user', 
            credits: 20,
            user: updatedUser,
            was_free_user: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Preserve for all other cases
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No changes needed - credits preserved', 
          credits: userRecord.credits,
          user: userRecord,
          was_free_user: false
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Create user record with 20 credits if it doesn't exist
      console.log('🆕 === CREATING NEW USER RECORD ===')
      console.log('Creating new user record with 20 credits')
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          credits: 20,
          subscription_status: 'inactive',
          current_plan: 'Free'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('Error creating user:', createError.message)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log(`✅ Created new user record for ${user.email} with 20 credits`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'User record created with 20 credits', 
          credits: 20,
          user: newUser,
          was_new_user: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ === ERROR IN ENSURE USER CREDITS ===')
    console.error('Error ensuring user credits:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})