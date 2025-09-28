import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Plan credit mapping
const PLAN_CREDITS = {
  'price_1S7HjfDaWkYYoAByjBQ4K5Qr': { name: 'Starter', credits: 60 },
  'price_1S7Hk2DaWkYYoAByJ6sj8xHK': { name: 'Creator', credits: 150 },
  'price_1S7HkHDaWkYYoAByhHMb2xZV': { name: 'Pro', credits: 300 },
  'price_1S7HkQDaWkYYoAByeEvQ7b0E': { name: 'Elite', credits: 750 },
  'price_1RxTVjDaWkYYoAByvUfEwWY9': { name: 'Credit Pack', credits: 10 } // One-time credit purchase
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
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // In production, verify Stripe webhook signature here
    const stripeSignature = req.headers.get('stripe-signature')
    
    const event = await req.json()
    
    console.log('Stripe webhook event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const customerId = session.customer
        const customerEmail = session.customer_details?.email
        
        // Find user by email
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('email', customerEmail)
          .single()

        if (userError || !user) {
          console.error('User not found for email:', customerEmail)
          break
        }

        // Update user with Stripe customer ID
        await supabase
          .from('users')
          .update({
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const customerId = subscription.customer
        const priceId = subscription.items.data[0]?.price?.id
        const status = subscription.status
        
        // Find user by Stripe customer ID
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('stripe_customer_id', customerId)
          .single()

        if (userError || !user) {
          console.error('User not found for customer ID:', customerId)
          break
        }

        const planInfo = PLAN_CREDITS[priceId]
        if (!planInfo) {
          console.error('Unknown price ID:', priceId)
          break
        }

        // Calculate new credits using the formula
        const newCredits = calculateNewCredits(
          user.credits || 0,
          user.current_plan || 'Free',
          planInfo.name
        )

        // Update user subscription
        await supabase
          .from('users')
          .update({
            current_plan: planInfo.name,
            credits: newCredits,
            subscription_status: status === 'active' ? 'active' : 'inactive',
            subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        const customerId = subscription.customer
        
        // Find user by Stripe customer ID
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('stripe_customer_id', customerId)
          .single()

        if (userError || !user) {
          console.error('User not found for customer ID:', customerId)
          break
        }

        // Downgrade to free plan
        await supabase
          .from('users')
          .update({
            current_plan: 'Free',
            credits: 20, // Reset to free tier credits
            subscription_status: 'inactive',
            subscription_period_end: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        break
      }

      case 'payment_intent.succeeded': {
        // Handle one-time credit purchases
        const paymentIntent = event.data.object
        const customerId = paymentIntent.customer
        
        if (!customerId) break

        // Find user by Stripe customer ID
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('stripe_customer_id', customerId)
          .single()

        if (userError || !user) {
          console.error('User not found for customer ID:', customerId)
          break
        }

        // Add 10 credits for one-time purchase
        const newCredits = (user.credits || 0) + 10

        await supabase
          .from('users')
          .update({
            credits: newCredits,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        break
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in stripe-webhook:', error)
    
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