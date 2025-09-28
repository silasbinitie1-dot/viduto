import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  console.log('=== N8N VIDEO CALLBACK START ===')
  console.log('Request method:', req.method)
  console.log('Request URL:', req.url)

  // Handle CORS preflight - ALWAYS return 200 for OPTIONS
  if (req.method === 'OPTIONS') {
    console.log('CORS preflight request received')
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    let videoId, explicitVideoUrl, chatId, userId
    
    try {
      const contentType = req.headers.get('content-type') || ''
      console.log('Content-Type:', contentType)
      
      if (contentType.includes('application/json')) {
        console.log('Parsing JSON data...')
        const body = await req.json()
        console.log('Request body:', JSON.stringify(body, null, 2))
        
        videoId = body.video_id || body.videoId
        explicitVideoUrl = body.video_url || body.explicitVideoUrl
        chatId = body.chat_id || body.chatId
        userId = body.user_id || body.userId
        
      } else if (contentType.includes('multipart/form-data')) {
        console.log('Parsing form data...')
        const formData = await req.formData()
        
        for (const [key, value] of formData.entries()) {
          console.log(`  ${key}: ${value}`)
        }
        
        videoId = formData.get('video_id') || formData.get('videoId')
        explicitVideoUrl = formData.get('video_url')
        chatId = formData.get('chat_id') || formData.get('chatId')
        userId = formData.get('user_id') || formData.get('userId')
        
      } else {
        console.log('Parsing URL search params...')
        const url = new URL(req.url)
        
        videoId = url.searchParams.get('video_id') || url.searchParams.get('videoId')
        explicitVideoUrl = url.searchParams.get('video_url') || url.searchParams.get('explicitVideoUrl')
        chatId = url.searchParams.get('chat_id') || url.searchParams.get('chatId')
        userId = url.searchParams.get('user_id') || url.searchParams.get('userId')
      }
      
    } catch (parseError) {
      console.error('Error parsing request:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse request data',
          details: parseError.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('Extracted parameters:')
    console.log('  videoId:', videoId)
    console.log('  explicitVideoUrl:', explicitVideoUrl)
    console.log('  chatId:', chatId)
    console.log('  userId:', userId)
    
    if (!videoId) {
      console.error('Missing video_id/videoId parameter')
      return new Response(
        JSON.stringify({ error: 'Missing video_id / videoId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!explicitVideoUrl) {
      console.error('Missing video_url parameter')
      return new Response(
        JSON.stringify({ error: 'Missing video_url' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!chatId) {
      console.error('Missing chat_id parameter')
      return new Response(
        JSON.stringify({ error: 'Missing chat_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find and update the video record using service role
    console.log(`Looking for video with video_id: ${videoId}`)
    const { data: videos, error: videoFindError } = await supabase
      .from('video')
      .select('*')
      .eq('video_id', String(videoId))
      .order('created_at', { ascending: false })
      .limit(5)
    
    console.log(`Found ${videos ? videos.length : 0} videos with exact video_id match`)
    
    let video = null
    
    if (videos && videos.length > 0) {
      video = videos[0]
    } else {
      // Fallback: try to find by chat_id and processing status
      console.log(`No exact match, looking for processing video in chat: ${chatId}`)
      const { data: processingVideos, error: processingError } = await supabase
        .from('video')
        .select('*')
        .eq('chat_id', String(chatId))
        .eq('status', 'processing')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (processingVideos && processingVideos.length > 0) {
        video = processingVideos[0]
        console.log(`Found processing video in chat: ${video.id}`)
      }
    }
    
    if (!video) {
      console.error(`No video found with video_id: ${videoId} or processing video in chat: ${chatId}`)
      return new Response(
        JSON.stringify({ 
          error: 'Video not found',
          video_id: videoId,
          chat_id: chatId
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Update the video record
    console.log(`Updating video ${video.id} with completed status and URL`)
    const { error: videoUpdateError } = await supabase
      .from('video')
      .update({
        video_id: videoId, // Ensure the video_id is updated in case we found it by fallback
        video_url: explicitVideoUrl,
        status: 'completed',
        processing_completed_at: new Date().toISOString(),
        webhook_received_at: new Date().toISOString()
      })
      .eq('id', video.id)
    
    if (videoUpdateError) {
      console.error('Failed to update video record:', videoUpdateError.message)
      throw new Error(`Failed to update video record: ${videoUpdateError.message}`)
    }
    
    console.log(`Successfully updated video ${video.id}`)
    
    // Update chat state using service role
    console.log(`Updating chat ${chatId} to completed state`)
    const { error: chatUpdateError } = await supabase
      .from('chat')
      .update({
        workflow_state: 'completed',
        active_video_id: video.id, // Keep pointing to the completed video for revision purposes
        is_locked: false,
        locked_until: null,
        lock_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId)
    
    if (chatUpdateError) {
      console.error('Failed to update chat state:', chatUpdateError.message)
      throw new Error(`Failed to update chat state: ${chatUpdateError.message}`)
    }
    
    console.log(`Successfully updated chat ${chatId}`)
    
    // Create completion messages using service role
    console.log(`Creating completion messages for chat ${chatId}`)
    // 1) Video message first (so the video appears before any text in chat)
    const { error: videoMessageError } = await supabase
      .from('message')
      .insert({
        chat_id: chatId,
        message_type: 'assistant',
        content: "",
        metadata: {
          video_completed: true,
          video_url: explicitVideoUrl,
          video_id: videoId,
          generation_id: `completion_${videoId}_${Date.now()}`,
          video_only: true
        }
      })
    
    if (videoMessageError) {
      console.error('Failed to create video message:', videoMessageError.message)
    }
    
    // 2) Text message after the video
    const completionMessage = `🎉 **Your video is ready!**

Your professional 30-second video has been created successfully. You can download it, share it on social media, or request revisions (costs 2.5 credits).`
    
    const { error: textMessageError } = await supabase
      .from('message')
      .insert({
        chat_id: chatId,
        message_type: 'assistant',
        content: completionMessage,
        metadata: {
          notice_type: 'video_ready',
          video_id: videoId
        }
      })
    
    if (textMessageError) {
      console.error('Failed to create text message:', textMessageError.message)
    }
    
    // 3) Optional revision guidance message
    const revisionGuidance = `**Want to make changes?**

Describe any adjustments you'd like, and I'll create a revised version for you. It takes about 10 minutes to generate. Each revision costs 2.5 credits.`
    
    const { error: revisionMessageError } = await supabase
      .from('message')
      .insert({
        chat_id: chatId,
        message_type: 'assistant',
        content: revisionGuidance,
        metadata: {
          revision_option: true,
          parent_video_id: videoId
        }
      })
    
    if (revisionMessageError) {
      console.error('Failed to create revision message:', revisionMessageError.message)
    }
    
    console.log('Successfully created completion messages')
    
    // Log successful completion
    const { error: logError } = await supabase
      .from('system_log')
      .insert({
        operation: 'video_production_completed',
        entity_type: 'video',
        entity_id: video.id,
        user_email: userId || 'system',
        status: 'success',
        message: 'Video production completed successfully',
        metadata: {
          video_id: videoId,
          chat_id: chatId,
          video_url: explicitVideoUrl
        }
      })
    
    if (logError) {
      console.error('Failed to create system log:', logError.message)
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Callback processed successfully',
        video_id: videoId,
        chat_id: chatId,
        status: 'completed'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('❌ CRITICAL ERROR in n8n-video-callback:', error)
    console.error('❌ Error message:', error?.message || 'No error message')
    console.error('❌ Error stack trace:', error?.stack || 'No stack trace')
    console.error('=== CALLBACK ERROR ===')
    console.error('Error processing callback:', error)
    console.error('Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        video_id: videoId,
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})