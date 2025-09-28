import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface VideoStatusRequest {
  videoId?: string
  video_id?: string
  chatId?: string
  chat_id?: string
}

async function logOperation(supabase: any, operation: string, entityType: string, entityId: string, userEmail: string, status: string, message: string, metadata = {}) {
    try {
        await supabase
            .from('system_log')
            .insert({
                operation,
                entity_type: entityType,
                entity_id: entityId,
                user_email: userEmail,
                status,
                message,
                metadata
            });
    } catch (error) {
        console.error('Failed to log operation:', error);
    }
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

    const body = await req.json().catch(() => ({}))
    const id = body.videoId || body.video_id
    const chatId = body.chatId || body.chat_id
    
    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Video ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate chat ownership using user-scoped call
    let targetChat = null
    if (chatId) {
      try {
        const { data: chat, error: chatError } = await supabase
          .from('chat')
          .select('*')
          .eq('id', chatId)
          .eq('user_id', user.id)
          .single()
        
        if (!chatError && chat) {
          targetChat = chat
        }
      } catch {
        targetChat = null
      }
    }

    // Get latest video row for this id (service role, ignoring RLS)
    const { data: videos, error: videoError } = await supabase
      .from('video')
      .select('*')
      .eq('video_id', String(id))
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (videoError || !videos || videos.length === 0) {
      return new Response(
        JSON.stringify({ status: 'processing' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const video = videos[0]

    // Update last status check timestamp
    await supabase
      .from('video')
      .update({ last_status_check: new Date().toISOString() })
      .eq('id', video.id)

    // Check for timeout condition - 15 minutes timeout
    if (video.processing_started_at && targetChat) {
      const startTime = new Date(video.processing_started_at).getTime()
      const now = Date.now()
      const elapsed = now - startTime
      const TIMEOUT_DURATION = 15 * 60 * 1000 // 15 minutes

      if (elapsed > TIMEOUT_DURATION && video.status === 'processing') {
        console.log(`Video ${id} has timed out after 15 minutes. Refunding credits.`)
        
        // Mark video as failed due to timeout
        await supabase
          .from('video')
          .update({
            status: 'failed',
            error_message: 'Video generation timed out after 15 minutes',
            processing_completed_at: new Date().toISOString()
          })
          .eq('id', video.id)

        // Refund credits if they were charged
        if (video.credits_used && targetChat.user_id) {
          try {
            const { data: userProfile, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', targetChat.user_id)
              .single()
            
            if (!userError && userProfile) {
              const currentCredits = Number(userProfile.credits || 0)
              const refundAmount = Number(video.credits_used || 10)
              const newCredits = currentCredits + refundAmount
              
              await supabase
                .from('users')
                .update({ credits: newCredits })
                .eq('id', userProfile.id)
              
              await logOperation(supabase, 'video_timeout_refund', 'User', targetChat.user_id, 'system', 'success', 
                `Credits refunded due to timeout: ${refundAmount}`, 
                { video_id: String(id), refund_amount: refundAmount, new_credits: newCredits })
              
              console.log(`Refunded ${refundAmount} credits to user ${targetChat.user_id}`)
            }
          } catch (refundError) {
            console.error('Error refunding credits:', refundError)
            await logOperation(supabase, 'video_timeout_refund_failed', 'Video', String(id), 'system', 'error', 
              'Failed to refund credits after timeout', { error: refundError.message })
          }
        }

        // Create timeout message
        await supabase
          .from('message')
          .insert({
            chat_id: targetChat.id,
            message_type: 'assistant',
            content: '❌ **Video generation timed out**\n\nThe video took longer than expected to generate. Your credits have been automatically refunded. Please try again.',
            metadata: { 
              timeout: true, 
              credits_refunded: video.credits_used || 10,
              timeout_after_minutes: 15,
              video_id: String(id)
            }
          })

        // Update chat status
        await supabase
          .from('chat')
          .update({
            workflow_state: 'completed',
            active_video_id: null,
            is_locked: false,
            locked_until: null,
            lock_reason: null
          })
          .eq('id', targetChat.id)

        await logOperation(supabase, 'video_timed_out', 'Video', String(id), targetChat.user_id || 'system', 'warning', 
          'Video generation timed out after 15 minutes', 
          { chat_id: targetChat.id, credits_refunded: video.credits_used || 10 })

        return new Response(
          JSON.stringify({ 
            status: 'failed', 
            error: 'Video generation timed out after 15 minutes. Credits have been refunded.' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // If completed, ensure messages exist in the user's chat
    if (video.status === 'completed' && video.video_url) {
      if (targetChat) {
        const { data: recent, error: messageError } = await supabase
          .from('message')
          .select('*')
          .eq('chat_id', targetChat.id)
          .order('created_at', { ascending: false })
          .limit(25)
        
        const hasVideoMsg = Array.isArray(recent) && recent.some(
          (m) => m?.metadata?.video_completed === true && m?.metadata?.video_id === String(id)
        )

        if (!hasVideoMsg) {
          // 1) Create the video message first
          await supabase
            .from('message')
            .insert({
              chat_id: targetChat.id,
              message_type: 'assistant',
              content: "",
              metadata: {
                video_completed: true,
                video_url: video.video_url,
                video_id: String(id),
                generation_id: `completion_${id}_${Date.now()}`,
                video_only: true
              }
            })

          // 2) Then the text message
          await supabase
            .from('message')
            .insert({
              chat_id: targetChat.id,
              message_type: 'assistant',
              content: "🎉 **Your video is ready!**\n\nHere's your professional 30-second video. You can download it or request changes if needed.",
              metadata: {
                notice_type: 'video_ready',
                video_id: String(id)
              }
            })

          // 3) Then the revision guidance message
          await supabase
            .from('message')
            .insert({
              chat_id: targetChat.id,
              message_type: 'assistant',
              content: "**Want to make changes?**\n\nDescribe any adjustments you'd like, and I'll create a revised version for you. It takes about 10 minutes to generate. Each revision costs 2.5 credits.",
              metadata: {
                revision_option: true,
                parent_video_id: String(id)
              }
            })

          await supabase
            .from('chat')
            .update({ 
              workflow_state: 'completed',
              is_locked: false,
              locked_until: null,
              lock_reason: null
            })
            .eq('id', targetChat.id)

          await logOperation(supabase, 'video_completed', 'Video', String(id), targetChat.user_id || 'system', 'success', 
            'Video completed successfully (video message followed by text)', { video_url: video.video_url, chat_id: targetChat.id })
        }
      }

      return new Response(
        JSON.stringify({ status: 'completed', videoUrl: video.video_url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (video.status === 'failed') {
      // Update chat status for failed videos
      if (targetChat) {
        await supabase
          .from('chat')
          .update({
            workflow_state: 'completed',
            active_video_id: null,
            is_locked: false,
            locked_until: null,
            lock_reason: null
          })
          .eq('id', targetChat.id)
      }

      return new Response(
        JSON.stringify({
          status: 'failed',
          error: video.error_message || 'An unknown error occurred during video generation.'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Default: still processing
    return new Response(
      JSON.stringify({ status: 'processing' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('checkVideoStatus error:', error)
    
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
          await logOperation(supabase, 'video_status_check_error', 'System', 'check_video_status', user.email, 'error', 
            'Error during video status check', { error: error.message })
        }
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Status check temporarily unavailable',
        error: error?.message || String(error || '')
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})