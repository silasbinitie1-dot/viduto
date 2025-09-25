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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  let userProfile: any = null
  let creditsDeducted = false
  let video_id: string | null = null

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '')
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      throw new Error(`Authentication failed: ${authError?.message || 'Invalid token'}`)
    }

    const { chat_id, brief, image_url, is_revision = false, credits_used = 10 }: VideoProductionRequest = await req.json()

    if (!chat_id || !brief) {
      throw new Error('Missing required fields: chat_id and brief')
    }

    // Generate unique video ID early
    video_id = crypto.randomUUID()

    // Get user profile and check credits
    const { data: fetchedUserProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !fetchedUserProfile) {
      throw new Error('User profile not found')
    }

    userProfile = fetchedUserProfile

    if (userProfile.credits < credits_used) {
      throw new Error('Insufficient credits')
    }

    // Get N8N webhook URL from environment
    const n8nWebhookUrl = is_revision 
      ? Deno.env.get('N8N_REVISION_WEBHOOK_URL')
      : Deno.env.get('N8N_INITIAL_VIDEO_WEBHOOK_URL')

    if (!n8nWebhookUrl) {
      throw new Error('Video production service is temporarily unavailable. Please contact support or try again later.')
    }

    // Prepare callback URL
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/n8n-video-callback`

    // Prepare N8N webhook payload
    const n8nPayload = {
      video_id: video_id,
      chat_id: chat_id,
      user_id: user.id,
      user_email: user.email,
      user_name: userProfile.full_name || user.email,
      prompt: brief.length > 1000 ? brief.substring(0, 1000) : brief,
      image_url: image_url,
      is_revision: is_revision,
      callback_url: callbackUrl
    }
    
    // Log the payload to debug
    console.log('N8N Payload image_url:', image_url ? image_url.substring(0, 100) + '...' : 'null')
    
    // Validate image URL one more time before sending to N8N
    if (image_url && image_url.startsWith('data:')) {
      console.error('About to send base64 URL to N8N - this is wrong!')
      throw new Error('Cannot process base64 image URL - please re-upload your image')
    }

    // CRITICAL: Test N8N webhook BEFORE deducting credits
    let n8nResponse: Response
    try {
      console.log('Testing N8N webhook connection...')
      n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload)
      })

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text().catch(() => 'Unknown error')
        console.error('N8N webhook failed:', n8nResponse.status, n8nResponse.statusText, errorText)
        throw new Error(`Video production service error (${n8nResponse.status}). Please contact support or try again later.`)
      }

      console.log('N8N webhook responded successfully')
    } catch (fetchError) {
      console.error('N8N webhook fetch error:', fetchError)
      if (fetchError.message.includes('Video production service error')) {
        throw fetchError // Re-throw our custom error
      }
      throw new Error('Video production service is currently unavailable. Please contact support or try again later.')
    }

    // NOW deduct credits since webhook was successful
    // CRITICAL: Test N8N webhook BEFORE deducting credits
    let n8nResponse: Response
    try {
      console.log('Testing N8N webhook connection...')
      n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload)
      })

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text().catch(() => 'Unknown error')
        console.error('N8N webhook failed:', n8nResponse.status, n8nResponse.statusText, errorText)
        throw new Error(`Video production service error (${n8nResponse.status}). Please contact support or try again later.`)
      }

      console.log('N8N webhook responded successfully')
    } catch (fetchError) {
      console.error('N8N webhook fetch error:', fetchError)
      if (fetchError.message.includes('Video production service error')) {
        throw fetchError // Re-throw our custom error
      }
      throw new Error('Video production service is currently unavailable. Please contact support or try again later.')
    }

    // NOW deduct credits since webhook was successful
    const { error: creditError } = await supabase
      .from('users')
      .update({ credits: userProfile.credits - credits_used })
      .eq('id', user.id)

    if (creditError) {
      throw new Error('Failed to process payment. Please try again.')
    }

    creditsDeducted = true
    console.log('Credits deducted successfully after webhook confirmation')

    creditsDeducted = true
    console.log('Credits deducted successfully after webhook confirmation')

    // Create video record using ONLY the columns that exist in your current schema
    const { data: video, error: videoError } = await supabase
      .from('video')
      .insert({
        id: video_id,
        chat_id: chat_id,
        prompt: brief.length > 1000 ? brief.substring(0, 1000) : brief,
        image_url: image_url,
        status: 'processing',
        credits_used: credits_used,
        processing_started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (videoError) {
      console.error('Failed to create video record, refunding credits:', videoError)
      // Refund credits since video creation failed
      await supabase
        .from('users')
        .update({ credits: userProfile.credits })
        .eq('id', user.id)
      
      throw new Error('Failed to initialize video production. Credits have been refunded.')
    }

    // Update chat state
    const { error: chatError } = await supabase
      .from('chat')
      .update({
        workflow_state: 'in_production',
        active_video_id: video_id,
        production_started_at: new Date().toISOString()
      })
      .eq('id', chat_id)

    if (chatError) {
      console.error('Failed to update chat state:', chatError)
      // Don't throw here as video creation was successful
    }

    // Log successful start
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
          credits_used: credits_used,
          webhook_confirmed: true
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        video_id: video_id,
        message: `Video ${is_revision ? 'revision' : 'production'} started successfully`,
        estimated_completion: new Date(Date.now() + (is_revision ? 5 : 12) * 60 * 1000).toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in start-video-production:', error)
    
    // Refund credits if they were deducted but something failed
    if (creditsDeducted && userProfile) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        await supabase
          .from('users')
          .update({ credits: userProfile.credits })
          .eq('id', userProfile.id)
        
        console.log('Credits refunded due to error after deduction')
      } catch (refundError) {
        console.error('Failed to refund credits:', refundError)
      }
    }

    // Refund credits if they were deducted but something failed
    if (creditsDeducted && userProfile) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        await supabase
          .from('users')
          .update({ credits: userProfile.credits })
          .eq('id', userProfile.id)
        
        console.log('Credits refunded due to error after deduction')
      } catch (refundError) {
        console.error('Failed to refund credits:', refundError)
      }
    }

    // Log the error
    if (video_id && userProfile) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )
        
        await supabase
          .from('system_log')
          .insert({
            operation: 'video_production_failed',
            entity_type: 'video',
            entity_id: video_id,
            user_email: userProfile.email || 'unknown',
            status: 'error',
            message: 'Video production failed to start',
            metadata: {
              error_message: error.message,
              credits_refunded: creditsDeducted
            }
          })
      } catch (logError) {
        console.error('Failed to log error:', logError)
      }
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})