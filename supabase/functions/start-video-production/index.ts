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
    console.log('📥 Request headers:', Object.fromEntries(req.headers.entries()))

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
    console.log('✅ Authorization header found:', authHeader.substring(0, 20) + '...')

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
    console.log('📥 Request payload:', { chat_id, brief: brief?.substring(0, 100) + '...', image_url, is_revision, credits_used })

    if (!chat_id || !brief) {
      console.log('❌ Missing required fields:', { chat_id: !!chat_id, brief: !!brief })
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: chat_id and brief' }),
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
        JSON.stringify({ success: false, error: 'Chat not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Chat ownership verified')

    // Generate unique video ID
    const video_id = crypto.randomUUID()
    console.log('🆔 Generated video_id:', video_id)

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

    if (userProfile.credits < credits_used) {
      console.log('❌ Insufficient credits:', { available: userProfile.credits, required: credits_used })
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient credits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Credits check passed')

    // Call the actual N8N webhook for video production
    const webhookUrl = 'https://viduto.app.n8n.cloud/webhook/video-production'
    console.log('🔗 Calling N8N webhook:', webhookUrl)
    
    const webhookPayload = {
      video_id: video_id,
      chat_id: chat_id,
      user_id: user.id,
      user_email: user.email,
      prompt: brief.length > 1000 ? brief.substring(0, 1000) : brief,
      image_url: image_url,
      is_revision: is_revision,
      credits_used: credits_used,
      webhook_callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/n8n-video-callback`
    }
    console.log('📤 Webhook payload:', webhookPayload)

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload)
      })

      console.log('📡 Webhook response status:', webhookResponse.status, webhookResponse.statusText)

      if (!webhookResponse.ok) {
        const errorText = await webhookResponse.text()
        console.log('❌ Webhook response error body:', errorText)
        throw new Error(`Webhook failed with status: ${webhookResponse.status}`)
      }

      console.log('✅ Webhook called successfully')
    } catch (webhookError) {
      console.error('❌ Webhook call failed:', webhookError.message)
      console.error('❌ Full webhook error:', webhookError)
      
      // Refund credits since webhook failed
      console.log('💰 Refunding credits due to webhook failure...')
      await supabase
        .from('users')
        .update({ credits: userProfile.credits })
        .eq('id', user.id)
      
      // Mark video as failed
      console.log('📝 Marking video as failed due to webhook failure...')
      await supabase
        .from('video')
        .update({
          status: 'failed',
          error_message: `Webhook failed: ${webhookError.message}`,
          processing_completed_at: new Date().toISOString()
        })
        .eq('id', video_id)
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to start video production. Credits have been refunded.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Deduct credits
    console.log('💳 Deducting credits:', { from: userProfile.credits, amount: credits_used, remaining: userProfile.credits - credits_used })
    const { error: creditError } = await supabase
      .from('users')
      .update({ credits: userProfile.credits - credits_used })
      .eq('id', user.id)

    if (creditError) {
      console.log('❌ Credit deduction failed:', creditError.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process payment. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Credits deducted successfully')

    // Create video record
    console.log('📝 Creating video record...')
    const videoRecord = {
      id: video_id,
      chat_id: chat_id,
      prompt: brief.length > 1000 ? brief.substring(0, 1000) : brief,
      image_url: image_url,
      status: 'processing',
      credits_used: credits_used,
      processing_started_at: new Date().toISOString(),
      is_revision: is_revision
    }
    console.log('📝 Video record to insert:', videoRecord)

    const { data: video, error: videoError } = await supabase
      .from('video')
      .insert(videoRecord)
      .select()
      .single()

    if (videoError) {
      console.log('❌ Video record creation failed:', videoError.message)
      console.log('❌ Full video error:', videoError)
      // Refund credits since video creation failed
      console.log('💰 Refunding credits due to video creation failure...')
      await supabase
        .from('users')
        .update({ credits: userProfile.credits })
        .eq('id', user.id)
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to initialize video production. Credits have been refunded.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Video record created successfully:', video.id)

    // Update chat state
    console.log('💬 Updating chat state...')
    await supabase
      .from('chat')
      .update({
        workflow_state: 'in_production',
        production_started_at: new Date().toISOString()
      })
      .eq('id', chat_id)
    console.log('✅ Chat state updated successfully')

    // Log successful start
    console.log('📊 Creating system log entry...')
    await supabase
      .from('system_log')
      .insert({
        operation: is_revision ? 'video_revision_started' : 'video_production_started',
        entity_type: 'video',
        entity_id: video_id,
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
        webhook_called: true
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