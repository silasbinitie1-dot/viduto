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

    // Get user profile and check credits
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userProfile) {
      throw new Error('User profile not found')
    }

    if (userProfile.credits < credits_used) {
      throw new Error('Insufficient credits')
    }

    // Deduct credits first
    const { error: creditError } = await supabase
      .from('users')
      .update({ credits: userProfile.credits - credits_used })
      .eq('id', user.id)

    if (creditError) {
      throw new Error('Failed to deduct credits')
    }

    // Generate unique video ID
    const video_id = crypto.randomUUID()

    // Create video record using ONLY the columns that exist in your current schema
    const { data: video, error: videoError } = await supabase
      .from('video')
      .insert({
        id: video_id,
        chat_id: chat_id,
        prompt: brief,
        image_url: image_url,
        status: 'processing',
        credits_used: credits_used,
        processing_started_at: new Date().toISOString()
        // Removed user_id and is_revision since they don't exist in current schema
      })
      .select()
      .single()

    if (videoError) {
      // Refund credits if video creation fails
      await supabase
        .from('users')
        .update({ credits: userProfile.credits })
        .eq('id', user.id)
      
      throw new Error(`Failed to create video record: ${videoError.message}`)
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

    // Prepare callback URL
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/n8n-video-callback`

    // Prepare N8N webhook payload
    const n8nPayload = {
      video_id: video_id,
      chat_id: chat_id,
      user_id: user.id,
      user_email: user.email,
      user_name: userProfile.full_name || user.email,
      prompt: brief,
      image_url: image_url,
      is_revision: is_revision,
      callback_url: callbackUrl
    }

    // Get N8N webhook URL from environment
    const n8nWebhookUrl = is_revision 
      ? Deno.env.get('N8N_REVISION_WEBHOOK_URL')
      : Deno.env.get('N8N_INITIAL_VIDEO_WEBHOOK_URL')

    if (n8nWebhookUrl) {
      try {
        // Trigger N8N workflow
        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(n8nPayload)
        })

        if (!n8nResponse.ok) {
          console.error('N8N webhook failed:', n8nResponse.statusText)
          // Don't throw here - video record is created, just log the issue
        }
      } catch (n8nError) {
        console.error('N8N webhook error:', n8nError)
        // Don't throw here - video record is created, just log the issue
      }
    } else {
      console.warn('N8N webhook URL not configured')
    }

    // Log system activity
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