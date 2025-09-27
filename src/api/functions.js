// Mock functions for demo purposes - in production these would call actual backend services
import { supabase } from '@/lib/supabase'

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
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated - please log in again')
    }

    // Get user profile for user details
    const { User } = await import('@/api/entities')
    const userProfile = await User.me()
    
    if (!userProfile) {
      throw new Error('User profile not found')
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-video-production`
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }

    // Get the revision message to extract the request
    const { Message } = await import('@/api/entities')
    const revisionMessage = await Message.get(data.message_id)
    
    // Get the chat to get the current brief
    const { Chat } = await import('@/api/entities')
    const chat = await Chat.get(data.chat_id)

    // Determine the parent video to revise
    let parentVideoId = chat.active_video_id
    
    // If no active video ID, try to find the most recently completed video for this chat
    if (!parentVideoId) {
      console.log('No active_video_id found, searching for most recent completed video...')
      const { Video } = await import('@/api/entities')
      const completedVideos = await Video.filter({ 
        chat_id: data.chat_id, 
        status: 'completed' 
      }, '-created_at') // Sort by newest first
      
      if (completedVideos && completedVideos.length > 0) {
        parentVideoId = completedVideos[0].id
        console.log('Found most recent completed video:', parentVideoId)
      } else {
        throw new Error('No active video found to revise. Please create a video first before requesting revisions.')
      }
    }

    // Get the parent video
    const { Video } = await import('@/api/entities')
    const parentVideo = await Video.get(parentVideoId)
    
    // Determine original video ID for the new revision
    // If parent is a revision, use its original_video_id; otherwise use parent's id
    const originalVideoId = parentVideo.is_revision ? parentVideo.original_video_id : parentVideo.id
    
    // For N8N webhook consistency, we need to use the composite video_id strings
    // instead of the internal UUIDs for parent_video_id and original_video_id
    let parentVideoCompositeId = parentVideo.video_id
    let originalVideoCompositeId = parentVideo.video_id
    
    // If the parent is a revision, we need to get the original video's composite ID
    if (parentVideo.is_revision && parentVideo.original_video_id) {
      try {
        const originalVideo = await Video.get(parentVideo.original_video_id)
        originalVideoCompositeId = originalVideo.video_id
      } catch (error) {
        console.error('Error fetching original video for composite ID:', error)
        // Fallback to parent's video_id if we can't fetch the original
        originalVideoCompositeId = parentVideo.video_id
      }
    }
    
    // Get image URL from the initial user message
    const allMessages = await Message.filter({ chat_id: data.chat_id }, 'created_at')
    const initialMessage = allMessages.find(msg => 
      msg.message_type === 'user' && msg.metadata?.image_url
    )
    
    if (!initialMessage?.metadata?.image_url) {
      throw new Error('Original product image not found')
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chatId: data.chat_id, 
        brief: chat.brief,
        imageUrl: initialMessage.metadata.image_url,
        isRevision: true,
        creditsUsed: 2.5,
        parentVideoId: parentVideoCompositeId,
        originalVideoId: originalVideoCompositeId,
        revisionRequest: revisionMessage.content
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Revision API Error Response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      throw new Error(errorData.error || 'Failed to start video revision')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error triggering revision workflow:', error)
    throw error
  }
}

export const checkVideoStatus = async (data) => {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated - please log in again')
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-video-status`
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        videoId: data.videoId || data.video_id,
        chatId: data.chatId || data.chat_id
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Status Check API Error Response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      throw new Error(errorData.error || 'Failed to check video status')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error checking video status:', error)
    throw error
  }
}

export const triggerInitialVideoWorkflow = async (data) => {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated - please log in again')
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-video-production`
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chat_id: data.chat_id,
        brief: data.brief,
        image_url: data.image_url,
        is_revision: false,
        credits_used: 10
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to start video production')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error triggering initial video workflow:', error)
    throw error
  }
}

export const startVideoProduction = async (data) => {
  // This function is now handled by triggerInitialVideoWorkflow
  return triggerInitialVideoWorkflow(data)
}

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