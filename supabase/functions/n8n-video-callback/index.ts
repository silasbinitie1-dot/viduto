import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface N8NCallbackPayload {
  video_id: string
  chat_id: string
  video_url: string
  status?: 'completed' | 'failed'
  error_message?: string
  processing_time?: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { video_id, chat_id, video_url, status = 'completed', error_message, processing_time }: N8NCallbackPayload = await req.json()

    if (!video_id || !chat_id) {
      throw new Error('Missing required fields: video_id and chat_id')
    }

    // Find the video record
    const { data: video, error: videoFindError } = await supabase
      .from('video')
      .select('*')
      .eq('id', video_id)
      .single()

    if (videoFindError || !video) {
      throw new Error(`Video record not found: ${video_id}`)
    }

    if (status === 'completed' && video_url) {
      // Update video record with completion data
      const { error: videoUpdateError } = await supabase
        .from('video')
        .update({
          status: 'completed',
          video_url: video_url,
          processing_completed_at: new Date().toISOString(),
          processing_time_seconds: processing_time
        })
        .eq('id', video_id)

      if (videoUpdateError) {
        throw new Error(`Failed to update video record: ${videoUpdateError.message}`)
      }

      // Update chat state
      const { error: chatUpdateError } = await supabase
        .from('chat')
        .update({
          workflow_state: 'completed',
          active_video_id: null,
          last_video_url: video_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', chat_id)

      if (chatUpdateError) {
        throw new Error(`Failed to update chat state: ${chatUpdateError.message}`)
      }

      // Create completion message for the chat
      const { error: messageError } = await supabase
        .from('message')
        .insert({
          chat_id: chat_id,
          message_type: 'assistant',
          content: '🎬 Your video is ready! You can download it, share it, or request revisions.',
          metadata: {
            video_completed: true,
            video_url: video_url,
            video_id: video_id,
            processing_time: processing_time
          }
        })

      if (messageError) {
        console.error('Failed to create completion message:', messageError)
      }

      // Create system message with revision instructions
      await supabase
        .from('message')
        .insert({
          chat_id: chat_id,
          message_type: 'system',
          content: 'To request changes, simply describe what you\'d like to modify (e.g., "Make it more energetic" or "Change the background music"). Each revision costs 2.5 credits.',
          metadata: {
            is_system_instruction: true
          }
        })

      // Log successful completion
      await supabase
        .from('system_log')
        .insert({
          user_id: video.user_id,
          action: video.is_revision ? 'video_revision_completed' : 'video_production_completed',
          details: {
            video_id: video_id,
            chat_id: chat_id,
            processing_time: processing_time,
            video_url: video_url
          }
        })

    } else {
      // Handle failed video generation
      const { error: videoUpdateError } = await supabase
        .from('video')
        .update({
          status: 'failed',
          error_message: error_message || 'Video generation failed',
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', video_id)

      if (videoUpdateError) {
        throw new Error(`Failed to update video record: ${videoUpdateError.message}`)
      }

      // Update chat state
      await supabase
        .from('chat')
        .update({
          workflow_state: 'failed',
          active_video_id: null
        })
        .eq('id', chat_id)

      // Create error message
      await supabase
        .from('message')
        .insert({
          chat_id: chat_id,
          message_type: 'assistant',
          content: `❌ Video generation failed: ${error_message || 'Unknown error'}. Please try again or contact support if the issue persists.`,
          metadata: {
            video_failed: true,
            error_message: error_message
          }
        })

      // Refund credits to user
      const { data: userProfile } = await supabase
        .from('users')
        .select('credits')
        .eq('id', video.user_id)
        .single()

      if (userProfile) {
        await supabase
          .from('users')
          .update({ credits: userProfile.credits + (video.is_revision ? 2.5 : 10) })
          .eq('id', video.user_id)
      }

      // Log failure
      await supabase
        .from('system_log')
        .insert({
          user_id: video.user_id,
          action: 'video_production_failed',
          details: {
            video_id: video_id,
            chat_id: chat_id,
            error_message: error_message
          }
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Callback processed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in n8n-video-callback:', error)
    
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