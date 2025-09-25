// Mock functions for demo purposes - in production these would call actual backend services

export const createStripeCheckoutSession = async (data) => {
  // Mock Stripe checkout - in production this would create actual Stripe sessions
  console.log('Mock Stripe checkout session:', data)
  return {
    data: {
      url: 'https://checkout.stripe.com/mock-session'
    }
  }
}

export const createStripeCustomerPortal = async () => {
  // Mock customer portal
  return {
    data: {
      url: 'https://billing.stripe.com/mock-portal'
    }
  }
}

export const sendFacebookConversionEvent = async (data) => {
  // Mock Facebook event
  console.log('Mock Facebook conversion event:', data)
  return { success: true }
}

export const triggerRevisionWorkflow = async (data) => {
  // Mock revision workflow
  console.log('Mock revision workflow:', data)
  return { success: true, message: 'Revision workflow triggered' }
}

export const checkVideoStatus = async (data) => {
  // Mock video status check
  return {
    status: 'processing',
    progress: 50,
    estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString()
  }
}

export const triggerInitialVideoWorkflow = async (data) => {
  // Redirect to startVideoProduction for consistency
  return await startVideoProduction(data)
}

export const startVideoProduction = async (data) => {
  try {
    // Import Supabase client
    const { supabase } = await import('@/lib/supabase');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error(`Failed to get user profile: ${profileError.message}`);
    }

    // Check if user has sufficient credits
    const creditsRequired = data.creditsUsed || 10;
    if (!userProfile || userProfile.credits < creditsRequired) {
      throw new Error(`Insufficient credits. You need ${creditsRequired} credits to start video production.`);
    }

    // Validate and truncate URLs if necessary
    const truncateUrl = (url, maxLength = 500) => {
      if (!url) return null;
      if (url.length <= maxLength) return url;
      
      // If it's a base64 data URL, we need to handle it differently
      if (url.startsWith('data:')) {
        console.warn('Base64 data URL detected, this should be uploaded to storage first');
        // For now, return null and let the system handle it
        return null;
      }
      
      // For regular URLs, truncate but warn
      console.warn(`URL truncated from ${url.length} to ${maxLength} characters`);
      return url.substring(0, maxLength);
    };

    const processedImageUrl = truncateUrl(data.imageUrl);
    const processedBrief = data.brief ? data.brief.substring(0, 5000) : null; // Truncate brief if too long

    if (!processedImageUrl) {
      throw new Error('Invalid or missing image URL. Please upload the image again.');
    }

    // Deduct credits from user account
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        credits: userProfile.credits - creditsRequired,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      throw new Error(`Failed to deduct credits: ${updateError.message}`);
    }

    // Generate unique video ID
    const videoId = `video_${data.chatId}_${Date.now()}`;

    // Create video record in database
    const { data: videoRecord, error: videoError } = await supabase
      .from('video')
      .insert({
        video_id: videoId,
        chat_id: data.chatId,
        prompt: processedBrief,
        image_url: processedImageUrl,
        status: 'pending',
        credits_used: creditsRequired,
        credits_charged: creditsRequired,
        processing_started_at: new Date().toISOString(),
        idempotency_key: `${data.chatId}_${Date.now()}`
      })
      .select()
      .single();

    if (videoError) {
      // Rollback credits if video creation fails
      await supabase
        .from('users')
        .update({ 
          credits: userProfile.credits,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      throw new Error(`Failed to create video record: ${videoError.message}`);
    }

    // Update chat state to in_production
    const { error: chatUpdateError } = await supabase
      .from('chat')
      .update({
        workflow_state: 'in_production',
        active_video_id: videoRecord.id,
        production_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', data.chatId);

    if (chatUpdateError) {
      console.error('Failed to update chat state:', chatUpdateError);
      // Don't throw here as video is already created
    }

    // Prepare n8n webhook payload
    const n8nPayload = {
      video_id: videoId,
      chat_id: data.chatId,
      user_id: user.id,
      user_email: userProfile.email,
      user_name: userProfile.full_name,
      prompt: processedBrief,
      image_url: processedImageUrl,
      is_revision: data.isRevision || false,
      callback_url: `${import.meta.env.VITE_N8N_CALLBACK_URL || 'https://viduto-tsng.bolt.host'}/functions/v1/n8nVideoCallback`,
      credits_used: creditsRequired,
      timestamp: new Date().toISOString()
    };

    console.log('N8N Payload prepared:', {
      video_id: videoId,
      chat_id: data.chatId,
      callback_url: n8nPayload.callback_url,
      image_url_length: processedImageUrl?.length,
      brief_length: processedBrief?.length
    });

    // Trigger n8n webhook
    const n8nWebhookUrl = import.meta.env.VITE_N8N_INITIAL_VIDEO_WEBHOOK_URL;
    if (n8nWebhookUrl) {
      try {
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(n8nPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('N8N webhook response:', response.status, errorText);
          throw new Error(`N8N webhook failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const responseData = await response.json().catch(() => ({}));
        console.log('N8N webhook triggered successfully:', responseData);
      } catch (webhookError) {
        console.error('N8N webhook error:', webhookError);
        
        // Update video status to error
        await supabase
          .from('video')
          .update({
            status: 'error',
            error_message: `N8N webhook failed: ${webhookError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', videoRecord.id);
        
        throw new Error('Failed to trigger video generation workflow');
      }
    } else {
      console.warn('N8N webhook URL not configured, video will remain in pending status');
    }

    return { 
      success: true, 
      video_id: videoId,
      database_video_id: videoRecord.id,
      message: 'Video production started successfully'
    };

  } catch (error) {
    console.error('Error in startVideoProduction:', error);
    throw error;
  }
};

export const getBlogPosts = async (data = {}) => {
  // Return empty array to fall back to static posts
  return { data: { posts: [] } }
}

export const ensureUserCredits = async () => {
  // Mock ensure credits
  return { success: true, credits_added: 0 }
}

export const setupNewUser = async () => {
  // Mock setup new user
  return { success: true, credits: 20 }
}

export const syncUserWithStripe = async () => {
  // Mock Stripe sync
  return { success: true }
}

export const stripeWebhook = async (data) => {
  // Mock webhook
  return { success: true }
}

export const n8nVideoCallback = async (data) => {
  // Mock n8n callback
  return { success: true }
}

export const generateSitemap = async () => {
  // Mock sitemap
  return { success: true }
}

export const robotsTxt = async () => {
  // Mock robots.txt
  return 'User-agent: *\nAllow: /'
}

export const lockingManager = async (data) => {
  // Mock locking
  return { success: true }
}

export const rateLimiter = async (data) => {
  // Mock rate limiter
  return { success: true, allowed: true }
}