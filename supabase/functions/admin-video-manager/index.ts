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

interface AdminRequest {
  action: string
  videoId?: string
  chatId?: string
  reason?: string
  forceUnlock?: boolean
  video_url?: string
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

    // Get user profile to check admin status
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('role, email')
      .eq('id', user.id)
      .single()

    if (userError || !userProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Simple admin check - you can modify this logic
    const isAdmin = userProfile.role === 'admin' || userProfile.email.includes('@viduto.com')
    if (!isAdmin) {
      await logOperation(supabase, 'admin_access_denied', 'System', 'admin_manager', userProfile.email, 'warning', 
        'Unauthorized admin access attempt', {}, startTime)
      return new Response(
        JSON.stringify({ success: false, error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, videoId, chatId, reason, forceUnlock, video_url }: AdminRequest = await req.json()

    console.log(`🛠️ Admin Video Manager - User: ${userProfile.email}, Action: ${action}, Video: ${videoId}, Chat: ${chatId}`)

    switch (action) {
      case 'list_stuck_videos': {
        const cutoffTime = new Date(Date.now() - (20 * 60 * 1000)) // 20 minutes ago
        
        const { data: stuckVideos, error: videoError } = await supabase
          .from('video')
          .select('*')
          .eq('status', 'processing')
          .lt('processing_started_at', cutoffTime.toISOString())
          .order('processing_started_at', { ascending: true })
          .limit(50)

        if (videoError) {
          throw new Error(`Failed to fetch stuck videos: ${videoError.message}`)
        }

        await logOperation(supabase, 'admin_list_stuck_videos', 'System', 'admin_manager', userProfile.email, 'info', 
          `Found ${stuckVideos?.length || 0} stuck videos`, {}, startTime)

        return new Response(
          JSON.stringify({
            success: true,
            stuck_videos: stuckVideos || [],
            count: stuckVideos?.length || 0
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'cancel_video': {
        if (!videoId) {
          return new Response(
            JSON.stringify({ success: false, error: 'videoId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: videos, error: videoFindError } = await supabase
          .from('video')
          .select('*')
          .eq('video_id', videoId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (videoFindError || !videos || videos.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Video not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const video = videos[0]
        
        // Update video status
        const { error: videoUpdateError } = await supabase
          .from('video')
          .update({
            status: 'cancelled',
            cancelled_by: user.id,
            cancellation_reason: reason || 'Admin cancellation',
            processing_completed_at: new Date().toISOString()
          })
          .eq('id', video.id)

        if (videoUpdateError) {
          throw new Error(`Failed to cancel video: ${videoUpdateError.message}`)
        }

        // Release chat lock if exists
        if (video.chat_id) {
          await supabase
            .from('chat')
            .update({
              workflow_state: 'completed',
              active_video_id: null,
              is_locked: false,
              locked_until: null,
              lock_reason: null
            })
            .eq('id', video.chat_id)

          // Add system message to chat
          await supabase
            .from('message')
            .insert({
              chat_id: video.chat_id,
              message_type: 'assistant',
              content: `❌ **Video production cancelled**\n\n${reason || 'Video production was cancelled due to technical issues.'}\n\nYour credits have been automatically refunded.`,
              metadata: { 
                admin_cancelled: true,
                cancelled_by: user.id,
                video_id: videoId,
                credits_refunded: video.credits_used || 10
              }
            })
        }

        // Refund credits if they were charged
        if (video.credits_used && video.chat_id) {
          try {
            const { data: chat, error: chatError } = await supabase
              .from('chat')
              .select('user_id')
              .eq('id', video.chat_id)
              .single()

            if (!chatError && chat?.user_id) {
              const { data: videoUser, error: userFindError } = await supabase
                .from('users')
                .select('*')
                .eq('id', chat.user_id)
                .single()

              if (!userFindError && videoUser) {
                const currentCredits = Number(videoUser.credits || 0)
                const refundAmount = Number(video.credits_used || 10)
                const newCredits = currentCredits + refundAmount
                
                await supabase
                  .from('users')
                  .update({ credits: newCredits })
                  .eq('id', videoUser.id)
                
                await logOperation(supabase, 'admin_credits_refunded', 'User', chat.user_id, userProfile.email, 'success', 
                  `Credits refunded due to admin cancellation: ${refundAmount}`, 
                  { video_id: videoId, refund_amount: refundAmount, new_credits: newCredits }, startTime)
                
                console.log(`💰 Refunded ${refundAmount} credits to user ${chat.user_id}`)
              }
            }
          } catch (refundError) {
            console.error('Error refunding credits:', refundError)
            await logOperation(supabase, 'admin_refund_failed', 'Video', videoId, userProfile.email, 'error', 
              'Failed to refund credits after admin cancellation', { error: refundError.message }, startTime)
          }
        }

        await logOperation(supabase, 'admin_video_cancelled', 'Video', videoId, userProfile.email, 'warning', 
          `Video cancelled by admin`, { reason, chat_id: video.chat_id }, startTime)

        console.log(`❌ Admin cancelled video ${videoId}`)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Video cancelled successfully',
            video_id: videoId
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'force_complete': {
        if (!videoId || !video_url) {
          return new Response(
            JSON.stringify({ success: false, error: 'videoId and video_url required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: videos, error: videoFindError } = await supabase
          .from('video')
          .select('*')
          .eq('video_id', videoId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (videoFindError || !videos || videos.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Video not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const video = videos[0]
        
        // Update video as completed
        const { error: videoUpdateError } = await supabase
          .from('video')
          .update({
            status: 'completed',
            video_url: video_url,
            processing_completed_at: new Date().toISOString()
          })
          .eq('id', video.id)

        if (videoUpdateError) {
          throw new Error(`Failed to complete video: ${videoUpdateError.message}`)
        }

        // Update chat state
        if (video.chat_id) {
          await supabase
            .from('chat')
            .update({
              workflow_state: 'completed',
              active_video_id: video.id,
              is_locked: false,
              locked_until: null,
              lock_reason: null
            })
            .eq('id', video.chat_id)

          // Add completion messages
          await supabase
            .from('message')
            .insert({
              chat_id: video.chat_id,
              message_type: 'assistant',
              content: "",
              metadata: {
                video_completed: true,
                video_url: video_url,
                video_id: videoId,
                admin_completed: true,
                video_only: true
              }
            })

          await supabase
            .from('message')
            .insert({
              chat_id: video.chat_id,
              message_type: 'assistant',
              content: "🎉 **Your video is ready!**\n\nHere's your professional 30-second video. You can download it or request changes if needed.",
              metadata: {
                notice_type: 'video_ready',
                video_id: videoId,
                admin_completed: true
              }
            })
        }

        await logOperation(supabase, 'admin_video_force_completed', 'Video', videoId, userProfile.email, 'info', 
          `Video force completed by admin`, { video_url, chat_id: video.chat_id }, startTime)

        console.log(`✅ Admin force completed video ${videoId}`)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Video marked as completed',
            video_id: videoId
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_video_logs': {
        if (!videoId && !chatId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Either videoId or chatId required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        let logs
        if (videoId) {
          const { data: videoLogs, error: logError } = await supabase
            .from('system_log')
            .select('*')
            .eq('entity_id', videoId)
            .order('created_at', { ascending: false })
            .limit(50)

          if (logError) {
            throw new Error(`Failed to fetch video logs: ${logError.message}`)
          }
          logs = videoLogs
        } else {
          const { data: chatLogs, error: logError } = await supabase
            .from('system_log')
            .select('*')
            .eq('entity_id', chatId)
            .order('created_at', { ascending: false })
            .limit(50)

          if (logError) {
            throw new Error(`Failed to fetch chat logs: ${logError.message}`)
          }
          logs = chatLogs
        }

        return new Response(
          JSON.stringify({
            success: true,
            logs: logs || [],
            count: (logs || []).length
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Invalid action. Supported: list_stuck_videos, cancel_video, force_complete, get_video_logs' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Admin Video Manager error:', error)
    
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
          await logOperation(supabase, 'admin_manager_error', 'System', 'admin_manager', user.email, 'error', 
            'Admin manager operation failed', { error: error.message }, startTime)
        }
      }
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Admin operation failed',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})