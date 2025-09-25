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

    const { chat_id, brief, image_url, is_revision = false, credits_used = 10 }: VideoProductionRequest = await req.json()

    if (!chat_id || !brief) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: chat_id and brief' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate unique video ID
    const video_id = crypto.randomUUID()

    // Get user profile and check credits
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (userProfile.credits < credits_used) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient credits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For now, skip the N8N webhook test and just create the video record
    // This allows the app to work without the external service
    
    // Deduct credits
    const { error: creditError } = await supabase
      .from('users')
      .update({ credits: userProfile.credits - credits_used })
      .eq('id', user.id)

    if (creditError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to process payment. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create video record
    const { data: video, error: videoError } = await supabase
      .from('video')
      .insert({
        id: video_id,
        chat_id: chat_id,
        prompt: brief.length > 1000 ? brief.substring(0, 1000) : brief,
        image_url: image_url,
        status: 'processing',
        credits_used: credits_used,
        processing_started_at: new Date().toISOString(),
        is_revision: is_revision
      })
      .select()
      .single()

    if (videoError) {
      // Refund credits since video creation failed
      await supabase
        .from('users')
        .update({ credits: userProfile.credits })
        .eq('id', user.id)
      
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to initialize video production. Credits have been refunded.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update chat state
    await supabase
      .from('chat')
      .update({
        workflow_state: 'in_production',
        active_video_id: video_id,
        production_started_at: new Date().toISOString()
      })
      .eq('id', chat_id)

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
          credits_used: credits_used
        }
      })

    // For demo purposes, simulate completion after 30 seconds
    setTimeout(async () => {
      try {
        // Simulate video completion
        await supabase
          .from('video')
          .update({
            status: 'completed',
            video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            processing_completed_at: new Date().toISOString()
          })
          .eq('id', video_id)

        // Update chat state
        await supabase
          .from('chat')
          .update({
            workflow_state: 'completed',
            active_video_id: null
          })
          .eq('id', chat_id)

        // Create completion message
        await supabase
          .from('message')
          .insert({
            chat_id: chat_id,
            message_type: 'assistant',
            content: '🎬 Your video is ready! You can download it, share it, or request revisions.',
            metadata: {
              video_completed: true,
              video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              video_id: video_id
            }
          })
      } catch (error) {
        console.error('Error in demo completion:', error)
      }
    }, 30000) // 30 seconds

    return new Response(
      JSON.stringify({
        success: true,
        video_id: video_id,
        message: `Video ${is_revision ? 'revision' : 'production'} started successfully`,
        estimated_completion: new Date(Date.now() + (is_revision ? 5 : 12) * 60 * 1000).toISOString()
      }),
      {
        status: 200,
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
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})