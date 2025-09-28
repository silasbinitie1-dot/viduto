import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RateLimitRequest {
  action: string
  identifier?: string
  limit?: number
  window?: number
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

    const { action, identifier = user.email, limit = 10, window = 3600 }: RateLimitRequest = await req.json()

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Action is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Simple rate limiting implementation
    // In production, you might want to use Redis or a more sophisticated solution
    const now = new Date()
    const windowStart = new Date(now.getTime() - (window * 1000))

    // Check recent actions for this identifier and action type
    const { data: recentActions, error: logError } = await supabase
      .from('system_log')
      .select('created_at')
      .eq('operation', action)
      .eq('user_email', identifier)
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: false })

    if (logError) {
      console.error('Error checking rate limit:', logError)
      // If we can't check the rate limit, allow the action but log the error
      return new Response(
        JSON.stringify({
          success: true,
          allowed: true,
          message: 'Rate limit check failed, allowing action'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const actionCount = recentActions?.length || 0
    const allowed = actionCount < limit

    if (!allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          allowed: false,
          error: `Rate limit exceeded. Maximum ${limit} ${action} actions per ${window} seconds.`,
          retry_after: window
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log this action for future rate limiting
    await supabase
      .from('system_log')
      .insert({
        operation: action,
        entity_type: 'rate_limit',
        entity_id: crypto.randomUUID(),
        user_email: identifier,
        status: 'success',
        message: `Rate limit check passed for ${action}`,
        metadata: {
          action,
          identifier,
          limit,
          window,
          current_count: actionCount + 1
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        allowed: true,
        remaining: limit - actionCount - 1,
        reset_time: new Date(now.getTime() + (window * 1000)).toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in rate-limiter:', error)
    
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