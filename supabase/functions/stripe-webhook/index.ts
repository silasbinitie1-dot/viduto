import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@16.12.0'

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
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-06-20',
    })

    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify webhook signature
    const signature = req.headers.get('stripe-signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    
    if (!signature || !webhookSecret) {
      return new Response(
        JSON.stringify({ error: 'Missing webhook signature or secret' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.text()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing Stripe webhook event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const customerId = session.customer as string
        const customerEmail = session.customer_details?.email
        
        console.log('Checkout completed for customer:', customerId, customerEmail)

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

        // Update user with Stripe customer ID if not already set
        if (!user.stripe_customer_id) {
          await supabase
            .from('users')
            .update({
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString(),
              last_webhook_update: new Date().toISOString(),
              webhook_processed: true
            })
            .eq('id', user.id)
        }

        // Handle one-time credit purchases
        if (session.mode === 'payment') {
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id)
          const creditPurchase = lineItems.data.find(item => 
            item.price?.id === 'price_1RxTVjDaWkYYoAByvUfEwWY9'
          )
          
          if (creditPurchase) {
            const creditsToAdd = (creditPurchase.quantity || 1) * 10
            const newCredits = (user.credits || 0) + creditsToAdd

            await supabase
              .from('users')
              .update({
                credits: newCredits,
                updated_at: new Date().toISOString(),
                last_webhook_update: new Date().toISOString(),
                webhook_processed: true
              })
              .eq('id', user.id)

            console.log(`Added ${creditsToAdd} credits to user ${user.email}`)
          }
        }

        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price?.id
        const status = subscription.status
        
        console.log('Subscription event:', { customerId, priceId, status })

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
            updated_at: new Date().toISOString(),
            last_webhook_update: new Date().toISOString(),
            webhook_processed: true
          })
          .eq('id', user.id)

        console.log(`Updated user ${user.email} to ${planInfo.name} plan with ${newCredits} credits`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        
        console.log('Subscription cancelled for customer:', customerId)

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
            updated_at: new Date().toISOString(),
            last_webhook_update: new Date().toISOString(),
            webhook_processed: true
          })
          .eq('id', user.id)

        console.log(`Downgraded user ${user.email} to Free plan`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const subscriptionId = invoice.subscription as string
        
        console.log('Payment succeeded for subscription:', subscriptionId)

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

        // Reset credits to plan limit on successful payment (monthly reset)
        const planCredits = getCurrentPlanCredits(user.current_plan || 'Free')
        
        await supabase
          .from('users')
          .update({
            credits: planCredits,
            updated_at: new Date().toISOString(),
            last_webhook_update: new Date().toISOString(),
            webhook_processed: true
          })
          .eq('id', user.id)

        console.log(`Reset credits for user ${user.email} to ${planCredits}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        
        console.log('Payment failed for customer:', customerId)

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

        // Mark subscription as past due but don't immediately downgrade
        await supabase
          .from('users')
          .update({
            subscription_status: 'past_due',
            updated_at: new Date().toISOString(),
            last_webhook_update: new Date().toISOString(),
            webhook_processed: true
          })
          .eq('id', user.id)

        console.log(`Marked subscription as past due for user ${user.email}`)
        break
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
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