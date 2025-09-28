import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@16.12.0'

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

// Plan credit mapping (moved outside Deno.serve for global access)
const PLAN_CREDITS = {
  'price_1S7HjfDaWkYYoAByjBQ4K5Qr': { name: 'Starter', credits: 60 },
  'price_1S7Hk2DaWkYYoAByJ6sj8xHK': { name: 'Creator', credits: 150 },
  'price_1S7HkHDaWkYYoAByhHMb2xZV': { name: 'Pro', credits: 300 },
  'price_1S7HkQDaWkYYoAByeEvQ7b0E': { name: 'Elite', credits: 750 }
}

// Helper function to get current plan credits (moved outside Deno.serve)
function getCurrentPlanCredits(currentPlan: string): number {
  const planCreditsMap = {
    'Free': 20,
    'Starter': 60,
    'Creator': 150,
    'Pro': 300,
    'Elite': 750
  }
  return planCreditsMap[currentPlan] || 20
}
 
// Helper function to calculate new credits (moved outside Deno.serve)
function calculateNewCredits(currentCredits: number, currentPlan: string, newPlan: string): number {
  const oldPlanCredits = getCurrentPlanCredits(currentPlan)
  const newPlanCredits = getCurrentPlanCredits(newPlan)
  
  // Formula: current credits + credits in new plan - credits in old plan
  const newCredits = currentCredits + newPlanCredits - oldPlanCredits
  
  // Ensure credits don't go below 0 or above new plan limit
  return Math.max(0, Math.min(newCredits, newPlanCredits))
}

// Helper function for proration calculation (moved outside Deno.serve)
function calculateProration(currentPlan, newPlan) {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysInMonth = endOfMonth.getDate();
    
    const currentPlanDaily = currentPlan.monthlyPrice / daysInMonth;
    const newPlanDaily = newPlan.monthlyPrice / daysInMonth;
    
    return Math.round((newPlanDaily - currentPlanDaily) * daysRemaining * 100) / 100;
}

// Helper function to safely create date from timestamp (moved outside Deno.serve)
function safeCreateDate(timestamp) {
    if (!timestamp || timestamp == null || timestamp == undefined) {
        return null;
    }
    try {
        const date = new Date(timestamp * 1000);
        if (isNaN(date.getTime())) {
            return null;
        }
        return date.toISOString();
    } catch (error) {
        console.error('Error creating date from timestamp:', timestamp, error);
        return null;
    }
}

// Helper function to get current timestamp in ISO string for database updates (moved outside Deno.serve)
function safeCurrentTimestamp() {
    return new Date().toISOString();
}

// Function to create or update Subscription Schedule (moved outside Deno.serve)
async function createOrUpdateSubscriptionSchedule(stripe: Stripe, customer: Stripe.Customer, scheduleId: string | null, priceId: string, planName: string) {
    console.log('🗓️ === CREATING OR UPDATING SUBSCRIPTION SCHEDULE ===');
    console.log('Parameters:', { customerId: customer.id, scheduleId, priceId, planName });

    const now = Math.floor(Date.now() / 1000);

    try {
        if (scheduleId) {
            const existingSchedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
            const currentPhase = existingSchedule.phases.find(phase => 
                phase.start_date <= now && (!phase.end_date || phase.end_date > now)
            ) || existingSchedule.phases[existingSchedule.phases.length - 1];

            if (!currentPhase || !currentPhase.items || currentPhase.items.length === 0) {
                throw new Error('Could not determine current phase or its items from existing schedule.');
            }
            
            const currentPriceId = currentPhase.items[0]?.price?.id || currentPhase.items[0]?.price;
            
            if (currentPriceId === priceId) {
                console.log('⚠️ User is already on this plan, no upgrade needed');
                return {
                    success: false,
                    error: 'You are already subscribed to this plan',
                    scheduleId: scheduleId,
                    message: 'You are already subscribed to this plan'
                };
            }

            const cleanExistingPhases = existingSchedule.phases.slice(0, existingSchedule.phases.indexOf(currentPhase)).map(phase => ({
                items: phase.items.map(item => ({ price: item.price?.id || item.price, quantity: item.quantity || 1 })),
                start_date: phase.start_date,
                end_date: phase.end_date,
                collection_method: 'charge_automatically'
            }));
            
            const cleanCurrentPhase = {
                items: currentPhase.items.map(item => ({ price: item.price?.id || item.price, quantity: item.quantity || 1 })),
                start_date: currentPhase.start_date,
                end_date: now,
                collection_method: 'charge_automatically'
            };
            
            const newPhase = {
                items: [{ price: priceId, quantity: 1 }],
                start_date: now,
                collection_method: 'charge_automatically'
            };
            
            const updatedSchedule = await stripe.subscriptionSchedules.update(scheduleId, {
                phases: [...cleanExistingPhases, cleanCurrentPhase, newPhase],
                proration_behavior: 'always_invoice',
                end_behavior: 'release',
                metadata: { upgrade_initiated_at: new Date().toISOString(), old_plan: currentPriceId, new_plan: priceId, upgrade_type: 'proration' }
            });

            console.log('✅ Schedule updated successfully - webhook will handle database update');

            return { success: true, scheduleId: updatedSchedule.id, subscriptionId: updatedSchedule.subscription, isUpgrade: true, message: 'Plan upgrade initiated successfully. Payment is being processed and you will receive confirmation with new credits shortly.' };

        } else {
            console.log('🆕 Creating new subscription schedule for first-time subscriber');
            
            const newSchedule = await stripe.subscriptionSchedules.create({
                customer: customer.id,
                start_date: now,
                phases: [{ items: [{ price: priceId, quantity: 1 }], collection_method: 'charge_automatically' }],
                end_behavior: 'release',
                metadata: { plan_name: planName, created_via: 'viduto_checkout_direct_schedule', customer_email: customer.email }
            });

            console.log('✅ New subscription schedule created:', newSchedule.id);
            console.log('📋 Schedule subscription ID:', newSchedule.subscription);
            
            return { success: true, scheduleId: newSchedule.id, subscriptionId: newSchedule.subscription, isUpgrade: false, message: 'New subscription created successfully' };
        }

    } catch (error) {
        console.error('❌ Error in createOrUpdateSubscriptionSchedule:', error);
        let errorMessage = 'General subscription update error. Please try again or contact support.';
        if (error.type === 'StripeCardError') { errorMessage = error.message; } 
        else if (error.type === 'StripeInvalidRequestError') { errorMessage = `Request error: ${error.message}`; }
        
        return { success: false, error: errorMessage, scheduleId: scheduleId };
    }
}

// Function to convert existing subscription to schedule (moved outside Deno.serve)
async function convertSubscriptionToSchedule(stripe: Stripe, subscriptionId: string, supabase: any, userId: string) {
    try {
        console.log('🔄 Converting existing subscription to schedule:', subscriptionId);
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        if (subscription.status !== 'active') { throw new Error(`Subscription is not active: ${subscription.status}`); }

        const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscription.id, end_behavior: 'release' });

        console.log('✅ Successfully converted subscription to schedule:', schedule.id);

        await supabase.from('users').update({
            stripe_subscription_schedule_id: schedule.id,
            stripe_subscription_id: subscription.id
        }).eq('id', userId);

        console.log('✅ User updated with new schedule ID');
        return schedule;

    } catch (error) {
        console.error('❌ Failed to convert subscription to schedule:', error);
        throw error;
    }
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
    console.log('🚀 create-stripe-checkout function called')
    console.log('📥 Request method:', req.method)

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2024-06-20',
    })
    console.log('✅ Stripe client initialized')

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('✅ Supabase client initialized')

    // Handle CORS preflight - ALWAYS return 200 for OPTIONS
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders })
    }

    // Get authorization header and verify user
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // Ensure CORS headers are always returned
      )
    }

    const { priceId, mode, quantity = 1 }: CheckoutRequest = await req.json()

    if (!priceId || !mode) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: priceId and mode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      ) // Ensure CORS headers are always returned
    }

    // Get user profile from Supabase
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }), // Ensure CORS headers are always returned
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For subscription mode, check if this is an upgrade and calculate new credits
    if (mode === 'subscription') {
      const newPlanInfo = PLAN_CREDITS[priceId]
      if (!newPlanInfo) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid subscription plan' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // Ensure CORS headers are always returned
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
            status: 200, // Ensure CORS headers are always returned
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Create or get Stripe customer
    let customerId = userProfile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: userProfile.full_name || user.email,
        metadata: {
          supabase_user_id: user.id
        }
      })
      
      customerId = customer.id
      
      // Update user with Stripe customer ID
      await supabase
        .from('users') // Use Supabase client
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Create Stripe checkout session
    const sessionConfig: any = {
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: quantity,
        },
      ],
      mode: mode,
      success_url: `${req.headers.get('origin') || 'https://viduto-tsng.bolt.host'}/dashboard?success=true`,
      cancel_url: `${req.headers.get('origin') || 'https://viduto-tsng.bolt.host'}/dashboard`,
      metadata: {
        user_id: user.id,
        user_email: user.email
      }
    }

    // Add subscription-specific configuration
    if (mode === 'subscription') {
      sessionConfig.subscription_data = {
        metadata: {
          user_id: user.id,
          user_email: user.email
        }
      }
    }

    const session = await stripe.checkout.sessions.create(sessionConfig)
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          url: session.url
        }
      }),
      { // Ensure CORS headers are always returned
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
        status: 500, // Ensure CORS headers are always returned
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})