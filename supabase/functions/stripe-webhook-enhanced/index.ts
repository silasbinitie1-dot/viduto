import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@16.12.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Plan credit mapping
const PLAN_CREDITS = {
  'price_1S7HjfDaWkYYoAByjBQ4K5Qr': { name: 'Starter', credits: 60, monthlyPrice: 20 },
  'price_1S7Hk2DaWkYYoAByJ6sj8xHK': { name: 'Creator', credits: 150, monthlyPrice: 50 },
  'price_1S7HkHDaWkYYoAByhHMb2xZV': { name: 'Pro', credits: 300, monthlyPrice: 100 },
  'price_1S7HkQDaWkYYoAByeEvQ7b0E': { name: 'Elite', credits: 750, monthlyPrice: 200 },
  'price_1RxTVjDaWkYYoAByvUfEwWY9': { name: 'Credit Pack', credits: 10 }
}

// Helper function to safely create date from timestamp
function safeCreateDate(timestamp) {
    if (timestamp === null || timestamp === undefined) {
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

// Helper function to safely get current timestamp
function safeCurrentTimestamp() {
    try {
        return new Date().toISOString();
    } catch (error) {
        console.error('Error creating current timestamp:', error);
        return new Date(Date.now()).toISOString();
    }
}

// Helper function to convert a regular subscription to a subscription schedule
async function convertSubscriptionToSchedule(stripe: Stripe, subscription: Stripe.Subscription, supabase: any) {
    try {
        console.log('🔄 Converting subscription to schedule:', subscription.id);
        
        const schedule = await stripe.subscriptionSchedules.create({
            from_subscription: subscription.id,
            end_behavior: 'release'
        });
        
        console.log('✅ Subscription converted to schedule:', schedule.id);
        
        // Find user by stripe_subscription_id and update with schedule ID
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('stripe_subscription_id', subscription.id);
        
        if (userError) {
            console.error('❌ Error finding user by subscription ID:', userError.message);
            throw userError;
        }
        
        if (users && users.length > 0) {
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    stripe_subscription_schedule_id: schedule.id,
                    stripe_subscription_id: subscription.id,
                    updated_at: safeCurrentTimestamp()
                })
                .eq('id', users[0].id);
                
            if (updateError) {
                console.error('❌ Error updating user with schedule ID:', updateError.message);
                throw updateError;
            }
            
            console.log('✅ User updated with new schedule ID');
        }
        
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
    console.log('=== STRIPE WEBHOOK RECEIVED ===');
    
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) {
        console.error('❌ STRIPE_SECRET_KEY not found');
        return new Response(
          JSON.stringify({ error: 'Stripe API key not found. Please set STRIPE_SECRET_KEY environment variable.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
    
    if (!endpointSecret) {
        console.error('❌ STRIPE_WEBHOOK_SECRET not found');
        return new Response(
          JSON.stringify({ error: 'Stripe webhook secret not found. Please set STRIPE_WEBHOOK_SECRET environment variable.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' });
    
    // Validate signature
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    
    let stripeEvent;
    try {
        if (stripe.webhooks.constructEventAsync) {
            stripeEvent = await stripe.webhooks.constructEventAsync(body, sig || '', endpointSecret);
        } else {
            stripeEvent = stripe.webhooks.constructEvent(body, sig || '', endpointSecret);
        }
        console.log('✅ Webhook signature verified, event type:', stripeEvent.type);
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return new Response(
          JSON.stringify({ error: `Webhook Error: ${err.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    const eventType = stripeEvent.type;
    const eventData = stripeEvent.data.object;
    
    console.log('📥 Processing webhook event:', eventType);

    // Plan mapping for credit calculations
    const planMapping = {
        'price_1S7HjfDaWkYYoAByjBQ4K5Qr': { name: 'Starter', credits: 60 },
        'price_1S7Hk2DaWkYYoAByJ6sj8xHK': { name: 'Creator', credits: 150 },
        'price_1S7HkHDaWkYYoAByhHMb2xZV': { name: 'Pro', credits: 300 },
        'price_1S7HkQDaWkYYoAByeEvQ7b0E': { name: 'Elite', credits: 750 }
    };

    switch (eventType) {
        case 'checkout.session.completed':
            console.log('💳 === CHECKOUT SESSION COMPLETED ===');
            
            try {
                const session = eventData;
                console.log('📋 Session details:', {
                    id: session.id,
                    mode: session.mode,
                    customer: session.customer,
                    subscription: session.subscription,
                    metadata: session.metadata
                });

                const customerEmail = session.customer_details?.email || 
                                    (session.customer ? (await stripe.customers.retrieve(session.customer)).email : null) || 
                                    session.metadata?.user_email;
                
                if (!customerEmail) {
                    console.warn('❌ No customer email found in session', session.id);
                    return new Response(
                      JSON.stringify({ error: 'No customer email found' }),
                      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                console.log('👤 Processing for customer:', customerEmail);
                
                // Find user by email using Supabase
                const { data: users, error: userFindError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', customerEmail);
                
                if (userFindError || !users || users.length === 0) {
                    console.log('❌ User not found for checkout session:', customerEmail);
                    return new Response(
                      JSON.stringify({ error: 'User not found' }),
                      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                const user = users[0];
                
                // 🔍 CRITICAL DEBUG: Log exact user state from database BEFORE any changes
                console.log('📊 === USER STATE FROM DATABASE (BEFORE PROCESSING) ===');
                console.log('User ID:', user.id);
                console.log('Raw user.credits from DB:', user.credits, typeof user.credits);
                console.log('Raw user.current_plan from DB:', user.current_plan);
                console.log('Raw user.subscription_status from DB:', user.subscription_status);
                console.log('Raw user.stripe_subscription_id from DB:', user.stripe_subscription_id);

                if (session.mode === 'subscription') {
                    console.log('📋 Processing subscription checkout');
                    
                    const planName = session.metadata?.plan_name;

                    // Prepare IDs and flags
                    let stripeSubscriptionId = session.subscription;
                    let stripeSubscriptionScheduleId = null;
                    let subscriptionPeriodEnd = null;
                    const shouldConvertToSchedule = session.metadata?.convert_to_schedule === 'true';

                    // Retrieve subscription object first
                    let subscriptionObj = null;
                    if (stripeSubscriptionId) {
                        try {
                            subscriptionObj = await stripe.subscriptions.retrieve(stripeSubscriptionId);
                            subscriptionPeriodEnd = safeCreateDate(subscriptionObj.current_period_end);
                            console.log('🧾 Subscription retrieved:', {
                                id: subscriptionObj.id,
                                status: subscriptionObj.status,
                                schedule: subscriptionObj.schedule || null
                            });
                        } catch (subErr) {
                            console.warn('⚠️ Could not retrieve subscription before schedule handling:', subErr.message);
                        }
                    }

                    // Convert to schedule when requested
                    if (shouldConvertToSchedule && subscriptionObj) {
                        try {
                            const schedule = await convertSubscriptionToSchedule(stripe, subscriptionObj, supabase);
                            stripeSubscriptionScheduleId = schedule.id;
                            console.log('🗓️ Converted to schedule:', stripeSubscriptionScheduleId);
                        } catch (convErr) {
                            console.error('❌ Failed converting subscription to schedule:', convErr.message);
                        }
                    }

                    // If still no schedule ID, try to read it from the subscription object
                    if (!stripeSubscriptionScheduleId && subscriptionObj?.schedule) {
                        stripeSubscriptionScheduleId = typeof subscriptionObj.schedule === 'string'
                            ? subscriptionObj.schedule
                            : subscriptionObj.schedule.id;
                        console.log('🗓️ Found existing schedule on subscription:', stripeSubscriptionScheduleId);
                    }

                    // Fallback: list schedules by subscription
                    if (!stripeSubscriptionScheduleId && stripeSubscriptionId) {
                        try {
                            const schedules = await stripe.subscriptionSchedules.list({
                                subscription: stripeSubscriptionId,
                                limit: 1
                            });
                            if (schedules.data.length > 0) {
                                stripeSubscriptionScheduleId = schedules.data[0].id;
                                console.log('🗓️ Fallback found schedule via list:', stripeSubscriptionScheduleId);
                            }
                        } catch (listErr) {
                            console.warn('⚠️ Failed listing schedules for subscription:', listErr.message);
                        }
                    }
                    
                    // 🧮 === CREDIT CALCULATION ===
                    const rawCurrentCredits = user.credits;
                    const oldPlan = user.current_plan;
                    const newPlan = planName;
                    const isFreeBefore = (!oldPlan || oldPlan === 'Free' || oldPlan === '' || oldPlan === null || user.subscription_status === 'free');

                    console.log('🔎 Credits from DB (raw):', rawCurrentCredits, '| oldPlan:', oldPlan, '| newPlan:', newPlan, '| isFreeBefore:', isFreeBefore);

                    const newPlanData = Object.values(planMapping).find(p => p.name === newPlan);
                    const newPlanCredits = newPlanData ? newPlanData.credits : 60;
                    console.log('🎯 New plan credits resolved:', newPlanCredits);

                    const currentCredits = Number(rawCurrentCredits ?? 0);
                    console.log('🧱 Current credits used for calculation (from DB):', currentCredits); 

                    let newCredits;

                    if (isFreeBefore && newPlan === 'Starter') {
                        console.log('🆕 CASE: FREE -> STARTER | Force credits to 60');
                        newCredits = 60;
                    } else if (isFreeBefore) {
                        console.log('🆕 CASE: FREE -> PAID (non-Starter) | Formula: currentCredits + newPlanCredits');
                        newCredits = currentCredits + newPlanCredits;
                    } else {
                        console.log('🔄 CASE: PAID -> PAID | Formula: currentCredits + newPlanCredits - oldPlanCredits');
                        const oldPlanData = Object.values(planMapping).find(p => p.name === oldPlan);
                        const oldPlanCredits = oldPlanData ? oldPlanData.credits : 60;
                        newCredits = currentCredits + newPlanCredits - oldPlanCredits;
                        console.log('Old plan credits:', oldPlanCredits);
                    }

                    newCredits = Math.max(0, Number(newCredits || 0));
                    console.log('✅ Final calculated newCredits:', newCredits);

                    // Build update object and persist
                    const updateData = {
                        subscription_status: 'active',
                        credits: newCredits,
                        current_plan: newPlan,
                        stripe_customer_id: session.customer,
                        stripe_subscription_id: stripeSubscriptionId || null,
                        subscription_period_end: subscriptionPeriodEnd,
                        updated_at: safeCurrentTimestamp()
                    };

                    if (stripeSubscriptionScheduleId) {
                        updateData.stripe_subscription_schedule_id = stripeSubscriptionScheduleId;
                    }

                    console.log('💾 Update data to DB:', JSON.stringify(updateData, null, 2));

                    try {
                        const { data: updatedUser, error: updateError } = await supabase
                            .from('users')
                            .update(updateData)
                            .eq('id', user.id)
                            .select()
                            .single();

                        if (updateError) {
                            throw updateError;
                        }

                        console.log('✅ === DATABASE UPDATE SUCCESSFUL ===', {
                            credits: updatedUser.credits,
                            plan: updatedUser.current_plan,
                            status: updatedUser.subscription_status,
                            schedule_id: updatedUser.stripe_subscription_schedule_id
                        });

                        // HARD GUARANTEE: verify credits persisted
                        const persistedCredits = Number(updatedUser.credits ?? 0);
                        if (persistedCredits < newCredits) {
                            console.warn('⚠️ Persisted credits lower than calculated. Enforcing correct credits...', { persistedCredits, newCredits });
                            const { error: enforceError } = await supabase
                                .from('users')
                                .update({
                                    credits: newCredits,
                                    updated_at: safeCurrentTimestamp()
                                })
                                .eq('id', user.id);
                                
                            if (enforceError) {
                                console.error('❌ Failed to enforce credits:', enforceError.message);
                            } else {
                                console.log('✅ Credits enforced after verification:', newCredits);
                            }
                        }
                        
                    } catch (updateError) {
                        console.error('❌ === DATABASE UPDATE FAILED ===');
                        console.error('Update failed at:', new Date().toISOString());
                        console.error('Error message:', updateError.message);
                        console.error('Failed update data:', JSON.stringify(updateData, null, 2));
                        console.error('User ID that failed to update:', user.id);
                        throw updateError;
                    }
                    
                    console.log(`✅ === WEBHOOK PROCESSING COMPLETED ===`);
                    console.log(`User subscription updated for ${customerEmail}`);
                    console.log(`Plan: ${planName}, Credits: ${newCredits}`);
                    
                } else if (session.mode === 'payment') {
                    console.log('💰 Processing one-time payment (credits)');
                    
                    const additionalCredits = parseInt(session.metadata?.credits || '0'); 
                    
                    if (additionalCredits > 0) {
                        const currentCredits = Number(user.credits || 0);
                        const newCredits = currentCredits + additionalCredits;
                        
                        const updateData = {
                            credits: newCredits,
                            updated_at: safeCurrentTimestamp()
                        };
                        
                        console.log('💰 One-time payment update:', {
                            currentCredits,
                            additionalCredits,
                            newCredits,
                            updateData
                        });
                        
                        const { data: updatedUser, error: updateError } = await supabase
                            .from('users')
                            .update(updateData)
                            .eq('id', user.id)
                            .select()
                            .single();
                            
                        if (updateError) {
                            throw updateError;
                        }
                        
                        console.log(`✅ Added ${additionalCredits} credits to user ${customerEmail}. New total: ${updatedUser.credits}`);
                    }
                }
                
            } catch (error) {
                console.error('❌ === ERROR IN CHECKOUT.SESSION.COMPLETED ===');
                console.error('Error processing checkout.session.completed:', error);
                console.error('Error message:', error.message);
                console.error('Session ID:', eventData.id);
                return new Response(
                  JSON.stringify({ error: `Error processing checkout.session.completed: ${error.message}` }),
                  { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            break;

        case 'customer.subscription.deleted':
            console.log('❌ === SUBSCRIPTION CANCELED / DELETED ===');
            
            try {
                const subscription = eventData;
                const customer = await stripe.customers.retrieve(subscription.customer);
                
                if (!customer.email) {
                    console.error('❌ Customer email not found for subscription deletion:', subscription.customer);
                    return new Response(
                      JSON.stringify({ error: 'Customer email not found' }),
                      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
                const userEmail = customer.email;

                // Find user by email using Supabase
                const { data: users, error: userFindError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', userEmail);
                
                if (userFindError || !users || users.length === 0) {
                    console.error('❌ User not found for subscription deletion:', userEmail);
                    return new Response(
                      JSON.stringify({ error: 'User not found' }),
                      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }
                
                const user = users[0];
                
                const updateData = {
                    subscription_status: 'inactive',
                    current_plan: 'Free',
                    stripe_subscription_id: null,
                    stripe_subscription_schedule_id: null,
                    credits: 20, // Reset to free tier
                    subscription_period_end: null,
                    updated_at: safeCurrentTimestamp()
                };
                
                const { error: updateError } = await supabase
                    .from('users')
                    .update(updateData)
                    .eq('id', user.id);
                    
                if (updateError) {
                    throw updateError;
                }
                
                console.log(`✅ Subscription canceled for user: ${userEmail}, reset to free credits.`);
            } catch (error) {
                console.error('❌ Error processing subscription cancellation:', error);
                return new Response(
                  JSON.stringify({ error: `Error processing subscription cancellation: ${error.message}` }),
                  { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }
            break;

        default:
            console.log(`ℹ️ Unhandled event type: ${eventType}`);
    }

    return new Response(
      JSON.stringify({ message: 'Webhook processed successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('💥 === WEBHOOK PROCESSING ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return new Response(
      JSON.stringify({ error: 'Webhook processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})