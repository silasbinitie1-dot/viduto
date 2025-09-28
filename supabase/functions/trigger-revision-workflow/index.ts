import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RevisionRequest {
  revisionRequest: string
  parentVideoId: string
  chatId: string
  brief: string
  imageUrl?: string
  creditsUsed?: number
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
    console.log('🚀 trigger-revision-workflow function called')
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
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ User authenticated:', user.id, user.email)

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userProfile) {
      console.log('❌ User profile not found:', userError?.message || 'No profile data')
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ User profile found:', { credits: userProfile.credits, email: userProfile.email })

    const { revisionRequest, parentVideoId, chatId, brief, imageUrl, creditsUsed = 2.5 }: RevisionRequest = await req.json()
    
    console.log('=== TRIGGER REVISION WORKFLOW ===')
    console.log('User:', user.email)
    console.log('User ID:', user.id)
    console.log('Chat ID:', chatId)
    console.log('Parent Video ID:', parentVideoId)
    console.log('Credits Used:', creditsUsed)
    console.log('Revision Request:', revisionRequest)

    if (!chatId || !revisionRequest || !parentVideoId) {
      console.log('❌ Missing required fields:', { chatId: !!chatId, revisionRequest: !!revisionRequest, parentVideoId: !!parentVideoId })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required parameters',
          required: ['chatId', 'revisionRequest', 'parentVideoId']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check user credits
    if ((userProfile.credits || 0) < creditsUsed) {
      console.log('❌ Insufficient credits:', { available: userProfile.credits, required: creditsUsed })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Insufficient credits',
          credits_required: creditsUsed,
          credits_available: userProfile.credits || 0
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if chat exists and user owns it
    console.log('🔍 Verifying chat ownership...')
    const { data: chat, error: chatError } = await supabase
      .from('chat')
      .select('*')
      .eq('id', chatId)
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

    // Generate unique video_id for revision
    const timestamp = Date.now()
    const revisionVideoId = `video_${chatId}_${timestamp}`
    
    console.log('Generated revision video ID:', revisionVideoId)

    // Create revision video record
    console.log('Creating revision video record in database...')
    const revisionVideoRecord = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      video_id: revisionVideoId,
      prompt: `REVISION: ${revisionRequest}\n\nOriginal Brief: ${brief}`,
      image_url: imageUrl,
      status: 'processing',
      credits_used: creditsUsed,
      processing_started_at: new Date().toISOString(),
      idempotency_key: `${chatId}_revision_${timestamp}`,
      retry_count: 0,
      is_revision: true,
      original_video_id: parentVideoId
    }

    const { data: video, error: videoError } = await supabase
      .from('video')
      .insert(revisionVideoRecord)
      .select()
      .single()

    if (videoError) {
      console.log('❌ Video record creation failed:', videoError.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create revision video record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Revision video record created with ID:', video.id)

    // Deduct credits
    console.log('💳 Deducting credits:', { from: userProfile.credits, amount: creditsUsed, remaining: userProfile.credits - creditsUsed })
    const newCredits = (userProfile.credits || 0) - creditsUsed
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
    console.log('✅ Credits deducted successfully:', `${userProfile.credits} -> ${newCredits}`)

    // Update chat state
    console.log('💬 Updating chat state...')
    const { error: chatUpdateError } = await supabase
      .from('chat')
      .update({
        workflow_state: 'in_production',
        active_video_id: video.id,
        production_started_at: new Date().toISOString()
      })
      .eq('id', chatId)
    
    if (chatUpdateError) {
      console.log('❌ Chat state update failed:', chatUpdateError.message)
      // Rollback video record and credits
      await supabase.from('video').delete().eq('id', video.id)
      await supabase.from('users').update({ credits: userProfile.credits }).eq('id', user.id)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update chat state' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('✅ Chat state updated to in_production for revision')

    // Prepare N8N revision webhook payload
    const webhookPayload = {
      video_id: revisionVideoId,
      chat_id: chatId,
      user_id: user.id,
      user_email: user.email,
      user_name: userProfile.full_name || user.email,
      revision_request: revisionRequest,
      parent_video_id: parentVideoId,
      original_brief: brief,
      image_url: imageUrl,
      is_revision: true,
      request_timestamp: new Date().toISOString(),
      source: "Viduto",
      version: "1.0",
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/n8n-video-callback`
    }

    console.log('N8N revision webhook payload:', JSON.stringify(webhookPayload, null, 2))

    // Trigger N8N revision workflow
    const webhookUrl = Deno.env.get('N8N_REVISION_WEBHOOK_URL')
    if (!webhookUrl) {
      console.error('❌ N8N_REVISION_WEBHOOK_URL not configured')
      
      // Rollback changes
      await supabase.from('users').update({ credits: userProfile.credits }).eq('id', user.id)
      await supabase.from('chat').update({ workflow_state: 'completed', active_video_id: null }).eq('id', chatId)
      await supabase.from('video').update({ 
        status: 'failed', 
        error_message: 'N8N revision webhook URL not configured',
        processing_completed_at: new Date().toISOString()
      }).eq('id', video.id)
      
      return new Response(
        JSON.stringify({ success: false, error: 'N8N revision webhook URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('🔗 Triggering N8N revision workflow with JSON payload...')
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

      console.log('📡 N8N revision response status:', n8nResponse.status)
      const responseText = await n8nResponse.text()
      console.log('📡 N8N revision response text:', responseText)
      
      if (!n8nResponse.ok) {
        console.error('❌ N8N revision webhook failed with status:', n8nResponse.status)
        console.error('❌ N8N revision webhook error:', responseText)
        
        // Rollback: refund credits and reset chat state
        console.log('🔄 Rolling back due to N8N revision webhook failure...')
        await supabase.from('users').update({ credits: userProfile.credits }).eq('id', user.id)
        await supabase.from('chat').update({
          workflow_state: 'completed',
          active_video_id: null
        }).eq('id', chatId)
        await supabase.from('video').update({
          status: 'failed',
          error_message: `N8N revision webhook failed: ${responseText}`,
          processing_completed_at: new Date().toISOString()
        }).eq('id', video.id)
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to start revision workflow',
            details: responseText
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('✅ N8N revision workflow started successfully:', responseText)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Revision workflow started successfully',
          video_id: revisionVideoId,
          chatId: chatId,
          creditsUsed: creditsUsed,
          newCredits: newCredits,
          parentVideoId: parentVideoId
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (webhookError) {
      console.error('❌ Revision webhook call failed:', webhookError.message)
      console.error('❌ Full webhook error:', webhookError)
      
      // Rollback changes
      console.log('🔄 Rolling back due to revision webhook call failure...')
      await supabase.from('users').update({ credits: userProfile.credits }).eq('id', user.id)
      await supabase.from('chat').update({
        workflow_state: 'completed',
        active_video_id: null
      }).eq('id', chatId)
      await supabase.from('video').update({
        status: 'failed',
        error_message: `Revision webhook failed: ${webhookError.message}`,
        processing_completed_at: new Date().toISOString()
      }).eq('id', video.id)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to start revision workflow',
          details: webhookError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('❌ Error in trigger-revision-workflow:', error)
    console.error('❌ Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})