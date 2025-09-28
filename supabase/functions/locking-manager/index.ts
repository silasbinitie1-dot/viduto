import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const LOCK_DURATION_MINUTES = 20 // Maximum lock duration

async function logOperation(supabase: any, operation: string, entityType: string, entityId: string, userEmail: string, status: string, message: string, metadata = {}, startTime: number | null = null) {
    try {
        const executionTime = startTime ? Date.now() - startTime : null
        await supabase
            .from('system_log')
            .insert({
                operation,
                entity_type: entityType,
                entity_id: entityId,
                user_email: userEmail,
                status,
                message,
                metadata,
                execution_time_ms: executionTime
            })
    } catch (error) {
        console.error('Failed to log operation:', error)
    }
}

interface LockRequest {
  action: string
  chatId: string
  reason?: string
  forceUnlock?: boolean
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  const startTime = Date.now()
  
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

    const { action, chatId, reason, forceUnlock }: LockRequest = await req.json()

    if (!action || !chatId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required parameters: action, chatId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`🔒 Lock Manager - User: ${user.email}, Action: ${action}, Chat: ${chatId}`)

    switch (action) {
      case 'acquire': {
        // Get chat using service role to bypass RLS
        const { data: chat, error: chatError } = await supabase
          .from('chat')
          .select('*')
          .eq('id', chatId)
          .single()

        if (chatError || !chat) {
          return new Response(
            JSON.stringify({ success: false, error: 'Chat not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const now = new Date()
        
        // Check if already locked and lock hasn't expired
        if (chat.is_locked && chat.locked_until && new Date(chat.locked_until) > now) {
          await logOperation(supabase, 'lock_acquire_failed', 'Chat', chatId, user.email, 'warning', 
            `Lock acquisition failed - already locked until ${chat.locked_until}`, 
            { lock_reason: chat.lock_reason }, startTime)
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'CHAT_LOCKED',
              message: `Chat is currently locked: ${chat.lock_reason}`,
              locked_until: chat.locked_until,
              lock_reason: chat.lock_reason
            }),
            { status: 423, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Acquire lock
        const lockUntil = new Date(now.getTime() + (LOCK_DURATION_MINUTES * 60 * 1000))
        const { error: updateError } = await supabase
          .from('chat')
          .update({
            is_locked: true,
            locked_until: lockUntil.toISOString(),
            lock_reason: reason || 'Video production in progress',
            last_activity_at: now.toISOString()
          })
          .eq('id', chatId)

        if (updateError) {
          await logOperation(supabase, 'lock_acquire_failed', 'Chat', chatId, user.email, 'error', 
            `Failed to acquire lock: ${updateError.message}`, {}, startTime)
          
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to acquire lock' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        await logOperation(supabase, 'lock_acquired', 'Chat', chatId, user.email, 'success', 
          `Lock acquired successfully`, 
          { lock_reason: reason, locked_until: lockUntil.toISOString() }, startTime)

        console.log(`🔒 Lock acquired for chat ${chatId} until ${lockUntil.toISOString()}`)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Lock acquired successfully',
            locked_until: lockUntil.toISOString()
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'release': {
        const { error: updateError } = await supabase
          .from('chat')
          .update({
            is_locked: false,
            locked_until: null,
            lock_reason: null,
            last_activity_at: new Date().toISOString()
          })
          .eq('id', chatId)

        if (updateError) {
          await logOperation(supabase, 'lock_release_failed', 'Chat', chatId, user.email, 'error', 
            `Failed to release lock: ${updateError.message}`, {}, startTime)
          
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to release lock' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        await logOperation(supabase, 'lock_released', 'Chat', chatId, user.email, 'success', 
          `Lock released successfully`, {}, startTime)

        console.log(`🔓 Lock released for chat ${chatId}`)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Lock released successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'status': {
        const { data: chat, error: chatError } = await supabase
          .from('chat')
          .select('is_locked, locked_until, lock_reason, last_activity_at')
          .eq('id', chatId)
          .single()

        if (chatError || !chat) {
          return new Response(
            JSON.stringify({ success: false, error: 'Chat not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const now = new Date()
        const isLocked = chat.is_locked && chat.locked_until && new Date(chat.locked_until) > now

        return new Response(
          JSON.stringify({
            is_locked: isLocked,
            locked_until: chat.locked_until,
            lock_reason: chat.lock_reason,
            last_activity_at: chat.last_activity_at
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'force_release': {
        if (!forceUnlock) {
          return new Response(
            JSON.stringify({ success: false, error: 'forceUnlock parameter required for force release' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: updateError } = await supabase
          .from('chat')
          .update({
            is_locked: false,
            locked_until: null,
            lock_reason: null,
            last_activity_at: new Date().toISOString()
          })
          .eq('id', chatId)

        if (updateError) {
          await logOperation(supabase, 'lock_force_release_failed', 'Chat', chatId, user.email, 'error', 
            `Failed to force release lock: ${updateError.message}`, {}, startTime)
          
          return new Response(
            JSON.stringify({ success: false, error: 'Failed to force release lock' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        await logOperation(supabase, 'lock_force_released', 'Chat', chatId, user.email, 'warning', 
          `Lock force released by user`, { reason }, startTime)

        console.log(`🔓 Lock force released for chat ${chatId} by ${user.email}`)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Lock force released successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action. Supported: acquire, release, status, force_release' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Lock Manager error:', error)
    
    try {
      // Initialize Supabase client for logging
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      // Get user from auth header if available
      const authHeader = req.headers.get('Authorization')
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '')
        const { data: { user } } = await supabase.auth.getUser(token)
        
        if (user) {
          await logOperation(supabase, 'lock_manager_error', 'System', 'lock_manager', user.email, 'error', 
            'Lock manager operation failed', { error: error.message }, startTime)
        }
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Lock manager operation failed',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})