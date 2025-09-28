import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface FacebookEventRequest {
  eventName: string
  value?: number
  currency?: string
  customData?: Record<string, any>
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

    const { eventName, value, currency = 'USD', customData }: FacebookEventRequest = await req.json()

    if (!eventName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Event name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For demo purposes, log the Facebook event instead of actually sending it
    // In production, you would integrate with Facebook Conversions API
    console.log('Facebook conversion event would be sent:', {
      eventName,
      value,
      currency,
      customData,
      user_email: user.email
    })

    // Log the event attempt
    await supabase
      .from('system_log')
      .insert({
        operation: 'facebook_event_sent',
        entity_type: 'facebook_event',
        entity_id: crypto.randomUUID(),
        user_email: user.email,
        status: 'success',
        message: `Facebook event sent: ${eventName}`,
        metadata: {
          event_name: eventName,
          value,
          currency,
          custom_data: customData
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Facebook event sent successfully',
        event_name: eventName
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-facebook-event:', error)
    
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