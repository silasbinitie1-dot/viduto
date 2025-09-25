import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface VideoStatusRequest {
  video_id: string
  chat_id: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight - ALWAYS return 200 for OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  // Wrap everything in try-catch to ensure CORS headers are always returned
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
        JSON.stringify({ success: false, error: `Authentication failed: ${authError?.message || 'Invalid token'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { video_id, chat_id }: VideoStatusRequest = await req.json()

    if (!video_id || !chat_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: video_id and chat_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user owns this chat
    const { data: chat, error: chatError } = await supabase
      .from('chat')
      .select('user_id')
      .eq('id', chat_id)
      .single()

    if (chatError || !chat || chat.user_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Chat not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get video status
    const { data: video, error: videoError } = await supabase
      .from('video')
      .select('*')
      .eq('id', video_id)
      .eq('chat_id', chat_id)
      .single()

    if (videoError || !video) {
      return new Response(
        JSON.stringify({ success: false, error: 'Video not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update last status check
    await supabase
      .from('video')
      .update({ last_status_check: new Date().toISOString() })
      .eq('id', video_id)

    // Check for timeout (15 minutes)
    const processingStarted = new Date(video.processing_started_at).getTime()
    const now = Date.now()
    const timeoutMs = 15 * 60 * 1000 // 15 minutes

    if (video.status === 'processing' && (now - processingStarted) > timeoutMs) {
      // Mark as failed due to timeout
      await supabase
        .from('video')
        .update({
          status: 'failed',
          error_message: 'Video generation timed out',
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', video_id)

      // Update chat state
      await supabase
        .from('chat')
        .update({
          workflow_state: 'failed',
          active_video_id: null
        })
        .eq('id', chat_id)

      // Refund credits
      const { data: userProfile } = await supabase
        .from('users')
        .select('credits')
        .eq('id', user.id)
        .single()

      if (userProfile) {
        await supabase
          .from('users')
          .update({ credits: userProfile.credits + video.credits_used })
          .eq('id', user.id)
      }

      // Create timeout message
      await supabase
        .from('message')
        .insert({
          chat_id: chat_id,
          message_type: 'assistant',
          content: '❌ Video generation timed out. Your credits have been refunded. Please try again or contact support if this issue persists.',
          metadata: {
            is_error: true,
            error_type: 'timeout',
            video_id: video_id,
            credits_refunded: video.credits_used
          }
        })

      return new Response(
        JSON.stringify({
          status: 'failed',
          error_message: 'Video generation timed out',
          credits_refunded: video.credits_used
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Calculate progress based on time elapsed
    let progress = 0
    if (video.status === 'processing') {
      const elapsed = now - processingStarted
      const estimatedTotal = video.is_revision ? 5 * 60 * 1000 : 12 * 60 * 1000 // 5 or 12 minutes
      progress = Math.min((elapsed / estimatedTotal) * 95, 95) // Cap at 95% until completion
    } else if (video.status === 'completed') {
      progress = 100
    }

    return new Response(
      JSON.stringify({
        status: video.status,
        progress: Math.round(progress),
        video_url: video.video_url,
        error_message: video.error_message,
        processing_started_at: video.processing_started_at,
        processing_completed_at: video.processing_completed_at,
        estimated_completion: video.status === 'processing' 
          ? new Date(processingStarted + (video.is_revision ? 5 : 12) * 60 * 1000).toISOString()
          : null
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in check-video-status:', error)
    
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