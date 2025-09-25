import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface VideoProductionRequest {
  chat_id: string
  brief: string
  image_url?: string
  is_revision?: boolean
  credits_used?: number
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight - ALWAYS return 200 for OPTIONS
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request received')
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  // Wrap everything in try-catch to ensure CORS headers are always returned
  try {
    console.log('🚀 start-video-production function called')
    console.log('📥 Request method:', req.method)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('✅ Supabase client initialized')

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.log('❌ No authorization header found')
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
      console.log('❌ Authentication failed:', authError?.message || 'No user')
      return new Response(
        JSON.stringify({ success: false, error: `Authentication failed: ${authError?.message || 'Invalid token'}` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ User authenticated:', user.id, user.email)

    const { chat_id, brief, image_url, is_revision = false, credits_used = 10 }: VideoProductionRequest = await req.json()
    
    console.log('=== START VIDEO PRODUCTION ===')
    console.log('User:', user.email)
    console.log('Chat ID:', chat_id)
    console.log('Credits Used:', credits_used)
    console.log('Brief length:', brief?.length || 0)
    console.log('Image URL:', image_url)
    console.log('Is Revision:', is_revision)

    if (!chat_id || !brief) {
      console.log('❌ Missing required fields:', { chat_id: !!chat_id, brief: !!brief })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters',
          required: ['chat_id', 'brief']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user owns this chat
    console.log('🔍 Verifying chat ownership...')
    const { data: chat, error: chatError } = await supabase
      .from('chat')
      .select('user_id')
      .eq('id', chat_id)
      .single()

    if (chatError || !chat) {
      console.log('❌ Chat not found:', chatError?.message || 'No chat data')
      return new Response(
        JSON.stringify({ success: false, error: 'Chat not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (chat.user_id !== user.id) {
      console.log('❌ Chat ownership mismatch:', { chat_user_id: chat.user_id, user_id: user.id })
      return new Response(
        JSON.stringify({ success: false, error: 'Chat not found or unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Chat ownership verified')

    // Get user profile and check credits
    console.log('💳 Fetching user profile for credit check...')
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userProfile) {
      console.log('❌ User profile error:', userError?.message || 'Profile not found')
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ User profile found:', { credits: userProfile.credits, email: userProfile.email })

    if ((userProfile.credits || 0) < credits_used) {
      console.log('❌ Insufficient credits:', { available: userProfile.credits, required: credits_used })
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient credits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Credits check passed')

    // Generate unique video ID
    const timestamp = Date.now()
    const video_id = `video_${chat_id}_${timestamp}`
    console.log('🆔 Generated video_id:', video_id)

    // Create video record IMMEDIATELY before starting N8N workflow
    console.log('📝 Creating video record in database...')
    const videoRecord = {
      id: crypto.randomUUID(),
      chat_id: chat_id,
      video_id: video_id,
      prompt: brief.length > 1000 ? brief.substring(0, 1000) : brief,
      image_url: image_url,
      status: 'processing',
      credits_used: credits_used,
      processing_started_at: new Date().toISOString(),
      idempotency_key: `${chat_id}_${timestamp}`,
      retry_count: 0,
      is_revision: is_revision
    }

    const { data: video, error: videoError } = await supabase
      .from('video')
      .insert(videoRecord)
      .select()
      .single()

    if (videoError) {
      console.log('❌ Video record creation failed:', videoError.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to initialize video production' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Video record created successfully:', video.id)

    // Deduct credits
    console.log('💳 Deducting credits:', { from: userProfile.credits, amount: credits_used, remaining: userProfile.credits - credits_used })
    const newCredits = (userProfile.credits || 0) - credits_used
    const { error: creditError } = await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', user.id)

    if (creditError) {
      console.log('❌ Credit deduction failed:', creditError.message)
      // Rollback video record
      await supabase.from('video').delete().eq('id', video.id)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process payment. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Credits deducted successfully')

    // Update chat state
    console.log('💬 Updating chat state...')
    await supabase
      .from('chat')
      .update({
        workflow_state: 'in_production',
        active_video_id: video_id,
        production_started_at: new Date().toISOString()
      })
      .eq('id', chat_id)
    console.log('✅ Chat state updated successfully')

    // Get webhook URL from environment
    const webhookUrl = Deno.env.get('N8N_INITIAL_VIDEO_WEBHOOK_URL')
    if (!webhookUrl) {
      console.error('❌ N8N_INITIAL_VIDEO_WEBHOOK_URL not configured')
      
      // Rollback changes
      await supabase.from('users').update({ credits: userProfile.credits }).eq('id', user.id)
      await supabase.from('chat').update({ workflow_state: 'awaiting_approval', active_video_id: null }).eq('id', chat_id)
      await supabase.from('video').update({ status: 'failed', error_message: 'N8N webhook URL not configured' }).eq('id', video.id)
      
      return new Response(
        JSON.stringify({ success: false, error: 'N8N webhook URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('🔗 Webhook URL found:', webhookUrl)

    // Prepare N8N webhook payload
    const webhookPayload = {
      video_id: video_id,
      chat_id: chat_id,
      user_id: user.id,
      user_email: user.email,
      user_name: userProfile.full_name || user.email,
      prompt: brief,
      image_url: image_url,
      is_revision: is_revision,
      request_timestamp: new Date().toISOString(),
      source: "Viduto",
      version: "1.0",
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/n8n-video-callback`
    }

    console.log('📤 N8N webhook payload:', JSON.stringify(webhookPayload, null, 2))

    // Trigger N8N workflow
    console.log('🔗 Calling N8N webhook:', webhookUrl)
    try {
      const n8nResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Viduto-App/1.0',
          'Accept': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      })

      console.log('📡 N8N response status:', n8nResponse.status, n8nResponse.statusText)
      const responseText = await n8nResponse.text()
      console.log('📡 N8N response text:', responseText)

      if (!n8nResponse.ok) {
        console.error('❌ N8N webhook failed with status:', n8nResponse.status)
        console.error('❌ N8N webhook error:', responseText)
        
        // Rollback: refund credits and reset chat state
        console.log('🔄 Rolling back due to N8N webhook failure...')
        await supabase.from('users').update({ credits: userProfile.credits }).eq('id', user.id)
        await supabase.from('chat').update({
          workflow_state: 'awaiting_approval',
          active_video_id: null
        }).eq('id', chat_id)
        await supabase.from('video').update({
          status: 'failed',
          error_message: `N8N webhook failed: ${responseText}`,
          processing_completed_at: new Date().toISOString()
        }).eq('id', video.id)
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to start video production. Credits have been refunded.',
            details: responseText
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('✅ N8N workflow started successfully:', responseText)

    } catch (webhookError) {
      console.error('❌ Webhook call failed:', webhookError.message)
      console.error('❌ Full webhook error:', webhookError)
      
      // Rollback changes
      console.log('🔄 Rolling back due to webhook call failure...')
      await supabase.from('users').update({ credits: userProfile.credits }).eq('id', user.id)
      await supabase.from('chat').update({
        workflow_state: 'awaiting_approval',
        active_video_id: null
      }).eq('id', chat_id)
      await supabase.from('video').update({
        status: 'failed',
        error_message: `Webhook failed: ${webhookError.message}`,
        processing_completed_at: new Date().toISOString()
      }).eq('id', video.id)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to start video production. Credits have been refunded.',
          details: webhookError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log successful start
    console.log('📊 Creating system log entry...')
    await supabase
      .from('system_log')
      .insert({
        operation: is_revision ? 'video_revision_started' : 'video_production_started',
        entity_type: 'video',
        entity_id: video.id,
        user_email: user.email,
        status: 'success',
        message: `Video ${is_revision ? 'revision' : 'production'} started successfully`,
        metadata: {
          video_id: video_id,
          chat_id: chat_id,
          credits_used: credits_used
        }
      })
    console.log('✅ System log entry created')

    console.log('🎉 Video production started successfully:', {
      video_id,
      chat_id,
      estimated_completion: new Date(Date.now() + (is_revision ? 5 : 12) * 60 * 1000).toISOString()
    })

    return new Response(
      JSON.stringify({
        success: true,
        video_id: video_id,
        message: `Video ${is_revision ? 'revision' : 'production'} started successfully`,
        estimated_completion: new Date(Date.now() + (is_revision ? 5 : 12) * 60 * 1000).toISOString(),
        webhook_called: true,
        credits_remaining: newCredits
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ CRITICAL ERROR in start-video-production:', error.message)
    console.error('❌ Full error object:', error)
    console.error('❌ Error stack:', error.stack)
    
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