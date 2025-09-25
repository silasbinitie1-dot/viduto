interface VideoCallbackPayload {
  video_id: string;
  chat_id: string;
  video_url?: string;
  status: 'completed' | 'failed' | 'error';
  error_message?: string;
  processing_time_ms?: number;
  metadata?: any;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload: VideoCallbackPayload = await req.json();
    console.log('N8N Video Callback received:', payload);

    const { video_id, chat_id, video_url, status, error_message, processing_time_ms } = payload;

    if (!video_id || !chat_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: video_id and chat_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the video record by video_id
    const { data: videoRecord, error: videoFindError } = await supabase
      .from('video')
      .select('*')
      .eq('video_id', video_id)
      .single();

    if (videoFindError || !videoRecord) {
      console.error('Video record not found:', videoFindError);
      return new Response(
        JSON.stringify({ error: "Video record not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update video record based on status
    const updateData: any = {
      status: status,
      processing_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (status === 'completed' && video_url) {
      updateData.video_url = video_url;
    }

    if (status === 'failed' || status === 'error') {
      updateData.error_message = error_message || 'Video generation failed';
    }

    if (processing_time_ms) {
      updateData.processing_time_ms = processing_time_ms;
    }

    // Update video record
    const { error: videoUpdateError } = await supabase
      .from('video')
      .update(updateData)
      .eq('id', videoRecord.id);

    if (videoUpdateError) {
      console.error('Failed to update video record:', videoUpdateError);
      return new Response(
        JSON.stringify({ error: "Failed to update video record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update chat state
    const chatUpdateData: any = {
      workflow_state: status === 'completed' ? 'completed' : 'error',
      is_locked: false,
      locked_until: null,
      lock_reason: null,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Clear active_video_id when production is complete
    if (status === 'completed' || status === 'failed' || status === 'error') {
      chatUpdateData.active_video_id = null;
    }

    const { error: chatUpdateError } = await supabase
      .from('chat')
      .update(chatUpdateData)
      .eq('id', chat_id);

    if (chatUpdateError) {
      console.error('Failed to update chat:', chatUpdateError);
      // Don't return error here as video was already updated successfully
    }

    // Create completion messages for the user
    if (status === 'completed' && video_url) {
      // Create assistant message with video
      const { error: videoMessageError } = await supabase
        .from('message')
        .insert({
          chat_id: chat_id,
          message_type: 'assistant',
          content: '🎬 Your video is ready! Here\'s your professional 30-second video:',
          metadata: {
            video_completed: true,
            video_url: video_url,
            video_id: video_id,
            processing_time_ms: processing_time_ms
          }
        });

      if (videoMessageError) {
        console.error('Failed to create video completion message:', videoMessageError);
      }

      // Create system message with revision instructions
      const { error: systemMessageError } = await supabase
        .from('message')
        .insert({
          chat_id: chat_id,
          message_type: 'assistant',
          content: '✨ Love it? Great! Want changes? Just describe what you\'d like to adjust and I\'ll create a revision for 2.5 credits.',
          metadata: {
            is_system_message: true,
            message_type: 'revision_instructions'
          }
        });

      if (systemMessageError) {
        console.error('Failed to create system message:', systemMessageError);
      }

    } else if (status === 'failed' || status === 'error') {
      // Create error message
      const { error: errorMessageError } = await supabase
        .from('message')
        .insert({
          chat_id: chat_id,
          message_type: 'assistant',
          content: `❌ Sorry, there was an issue generating your video: ${error_message || 'Unknown error'}. Please try again or contact support if the problem persists.`,
          metadata: {
            is_error_message: true,
            error_details: error_message
          }
        });

      if (errorMessageError) {
        console.error('Failed to create error message:', errorMessageError);
      }
    }

    // Log the completion
    const { error: logError } = await supabase
      .from('system_log')
      .insert({
        operation: 'n8n_video_callback',
        entity_type: 'video',
        entity_id: videoRecord.id,
        status: status,
        message: `Video ${status}: ${video_id}`,
        metadata: {
          video_id: video_id,
          chat_id: chat_id,
          video_url: video_url,
          processing_time_ms: processing_time_ms,
          error_message: error_message
        },
        execution_time_ms: processing_time_ms
      });

    if (logError) {
      console.error('Failed to create system log:', logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Video ${status} processed successfully`,
        video_id: video_id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('N8N Video Callback Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});