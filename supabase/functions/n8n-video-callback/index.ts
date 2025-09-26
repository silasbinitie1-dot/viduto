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
  console.log('🚀 n8n-video-callback function called')
  console.log('📥 Request method:', req.method)
  console.log('📥 Request URL:', req.url)

  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request received')
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Log environment variable availability (masked for security)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    
    console.log('🔑 Environment variables check:')
    console.log('  SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'NOT SET')
    console.log('  SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? `${serviceRoleKey.substring(0, 10)}...` : 'NOT SET')

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('❌ Missing required environment variables')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error: Missing environment variables'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log all incoming request headers for debugging
    console.log('📋 Incoming request headers:')
    for (const [key, value] of req.headers.entries()) {
      // Mask sensitive headers
      if (key.toLowerCase().includes('authorization') || key.toLowerCase().includes('key')) {
        console.log(`  ${key}: ${value.substring(0, 10)}...`)
      } else {
        console.log(`  ${key}: ${value}`)
      }
    }

    // Check Content-Type header and enforce JSON
    const contentType = req.headers.get('Content-Type') || ''
    console.log('📄 Content-Type:', contentType)

    if (contentType.includes('multipart/form-data')) {
      console.warn('⚠️ Received multipart/form-data, but expecting application/json')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid Content-Type: Please send data as application/json, not multipart/form-data',
          expected_content_type: 'application/json',
          received_content_type: contentType
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!contentType.includes('application/json')) {
      console.warn('⚠️ Unexpected Content-Type:', contentType)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Unsupported Content-Type: ${contentType}. Please use application/json`,
          expected_content_type: 'application/json',
          received_content_type: contentType
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Initialize Supabase client with service role key
    console.log('🔧 Initializing Supabase client with service role...')
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    })
    console.log('✅ Supabase client initialized successfully')

    // Parse JSON payload
    console.log('📦 Parsing request body as JSON...')
    let payload: N8NCallbackPayload
    try {
      payload = await req.json()
      console.log('✅ JSON payload parsed successfully')
      console.log('📋 Payload contents:', JSON.stringify(payload, null, 2))
    } catch (parseError) {
      console.error('❌ Failed to parse JSON payload:', parseError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON payload',
          details: parseError.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { video_id, chat_id, video_url, status = 'completed', error_message, processing_time } = payload

    if (!video_id || !chat_id) {
      console.error('❌ Missing required fields:', { video_id: !!video_id, chat_id: !!chat_id })
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: video_id and chat_id',
          received_fields: { video_id: !!video_id, chat_id: !!chat_id }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('🔍 Processing callback for:', { video_id, chat_id, status })

    // Find the video record using service role access
    console.log('🔍 Looking up video record...')
    const { data: video, error: videoFindError } = await supabase
      .from('video')
      .select('*')
      .eq('video_id', video_id)
      .single()

    if (videoFindError || !video) {
      console.error('❌ Video record not found:', { video_id, error: videoFindError?.message })
      
      // Try to find by UUID as fallback
      console.log('🔍 Trying to find video by UUID fallback...')
      const { data: videoByUuid, error: uuidError } = await supabase
        .from('video')
        .select('*')
        .eq('id', video_id)
        .single()

      if (uuidError || !videoByUuid) {
        console.error('❌ Video not found by UUID either:', { video_id, error: uuidError?.message })
        return new Response(
          JSON.stringify({
            success: false,
            error: `Video record not found: ${video_id}`,
            details: {
              video_id_lookup_error: videoFindError?.message,
              uuid_lookup_error: uuidError?.message
            }
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      console.log('✅ Found video by UUID fallback')
      // Use the video found by UUID
      video = videoByUuid
    } else {
      console.log('✅ Video record found by video_id')
    }

    // Get user_id from the associated chat
    console.log('🔍 Looking up chat record...')
    const { data: chat, error: chatError } = await supabase
      .from('chat')
      .select('user_id')
      .eq('id', chat_id)
      .single()

    if (chatError || !chat) {
      console.error('❌ Chat record not found:', { chat_id, error: chatError?.message })
      return new Response(
        JSON.stringify({
          success: false,
          error: `Chat record not found: ${chat_id}`,
          details: chatError?.message
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    console.log('✅ Chat record found, user_id:', chat.user_id)

    const userId = chat.user_id

    if (status === 'completed' && video_url) {
      console.log('✅ Processing successful video completion...')
      
      // Update video record with completion data
      const { error: videoUpdateError } = await supabase
        .from('video')
        .update({
          status: 'completed',
          video_url: video_url,
          processing_completed_at: new Date().toISOString(),
          execution_time_ms: processing_time
        })
        .eq('id', video.id)

      if (videoUpdateError) {
        console.error('❌ Failed to update video record:', videoUpdateError.message)
        throw new Error(`Failed to update video record: ${videoUpdateError.message}`)
      }
      console.log('✅ Video record updated successfully')

      // Update chat state
      console.log('💬 Updating chat state...')
      const { error: chatUpdateError } = await supabase
        .from('chat')
        .update({
          workflow_state: 'completed',
          active_video_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', chat_id)

      if (chatUpdateError) {
        console.error('❌ Failed to update chat state:', chatUpdateError.message)
        throw new Error(`Failed to update chat state: ${chatUpdateError.message}`)
      }
      console.log('✅ Chat state updated successfully')

      // Create completion message for the chat
      console.log('💬 Creating completion message...')
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
        console.error('❌ Failed to create completion message:', messageError.message)
        // Don't throw here - video is still completed successfully
      } else {
        console.log('✅ Completion message created successfully')
      }

      // Create system message with revision instructions
      console.log('💬 Creating system instruction message...')
      const { error: systemMessageError } = await supabase
        .from('message')
        .insert({
          chat_id: chat_id,
          message_type: 'system',
          content: 'To request changes, simply describe what you\'d like to modify (e.g., "Make it more energetic" or "Change the background music"). Each revision costs 2.5 credits.',
          metadata: {
            is_system_instruction: true
          }
        })

      if (systemMessageError) {
        console.error('❌ Failed to create system message:', systemMessageError.message)
        // Don't throw here - video is still completed successfully
      } else {
        console.log('✅ System instruction message created successfully')
      }

      // Log successful completion
      console.log('📊 Creating system log entry...')
      const { error: logError } = await supabase
        .from('system_log')
        .insert({
          operation: 'video_production_completed',
          entity_type: 'video',
          entity_id: video.id,
          user_email: userId,
          status: 'success',
          message: 'Video production completed successfully',
          metadata: {
            video_id: video_id,
            chat_id: chat_id,
            processing_time: processing_time,
            video_url: video_url
          }
        })

      if (logError) {
        console.error('❌ Failed to create system log:', logError.message)
        // Don't throw here - video is still completed successfully
      } else {
        console.log('✅ System log entry created successfully')
      }

      console.log('🎉 Video completion processed successfully')

    } else {
      console.log('❌ Processing failed video generation...')
      
      // Handle failed video generation
      const { error: videoUpdateError } = await supabase
        .from('video')
        .update({
          status: 'failed',
          error_message: error_message || 'Video generation failed',
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', video.id)

      if (videoUpdateError) {
        console.error('❌ Failed to update video record:', videoUpdateError.message)
        throw new Error(`Failed to update video record: ${videoUpdateError.message}`)
      }
      console.log('✅ Video record updated with failure status')

      // Update chat state
      console.log('💬 Updating chat state to failed...')
      const { error: chatUpdateError } = await supabase
        .from('chat')
        .update({
          workflow_state: 'failed',
          active_video_id: null
        })
        .eq('id', chat_id)

      if (chatUpdateError) {
        console.error('❌ Failed to update chat state:', chatUpdateError.message)
        // Don't throw here - continue with refund process
      } else {
        console.log('✅ Chat state updated to failed')
      }

      // Create error message
      console.log('💬 Creating error message...')
      const { error: errorMessageError } = await supabase
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

      if (errorMessageError) {
        console.error('❌ Failed to create error message:', errorMessageError.message)
        // Don't throw here - continue with refund process
      } else {
        console.log('✅ Error message created successfully')
      }

      // Refund credits to user
      console.log('💳 Processing credit refund...')
      const { data: userProfile, error: userFetchError } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single()

      if (userFetchError || !userProfile) {
        console.error('❌ Failed to fetch user profile for refund:', userFetchError?.message)
      } else {
        const refundAmount = video.credits_used || 10
        const newCredits = userProfile.credits + refundAmount
        
        const { error: refundError } = await supabase
          .from('users')
          .update({ credits: newCredits })
          .eq('id', userId)

        if (refundError) {
          console.error('❌ Failed to refund credits:', refundError.message)
        } else {
          console.log('✅ Credits refunded successfully:', { refunded: refundAmount, new_total: newCredits })
        }
      }

      // Log failure
      console.log('📊 Creating failure system log entry...')
      const { error: logError } = await supabase
        .from('system_log')
        .insert({
          operation: 'video_production_failed',
          entity_type: 'video',
          entity_id: video.id,
          user_email: userId,
          status: 'error',
          message: 'Video production failed',
          metadata: {
            video_id: video_id,
            chat_id: chat_id,
            error_message: error_message
          }
        })

      if (logError) {
        console.error('❌ Failed to create failure log:', logError.message)
      } else {
        console.log('✅ Failure system log entry created successfully')
      }

      console.log('💔 Video failure processed successfully')
    }

    console.log('🎯 Callback processing completed successfully')
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Callback processed successfully',
        video_id: video_id,
        chat_id: chat_id,
        status: status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ CRITICAL ERROR in n8n-video-callback:', error)
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack trace:', error.stack)
    console.error('❌ Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})