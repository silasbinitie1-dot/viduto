// Mock functions for demo purposes - in production these would call actual backend services
import { supabase } from '@/lib/supabase'

export const createStripeCheckoutSession = async (data) => {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated - please log in again')
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-checkout`
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Stripe Checkout API Error Response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      throw new Error(errorData.error || 'Failed to create checkout session')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error)
    throw error
  }
}

export const createStripeCustomerPortal = async () => {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated - please log in again')
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-stripe-portal`
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Stripe Portal API Error Response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      throw new Error(errorData.error || 'Failed to create customer portal')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error creating Stripe customer portal:', error)
    throw error
  }
}

export const sendFacebookConversionEvent = async (data) => {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated - please log in again')
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-facebook-event`
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Facebook Event API Error Response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      throw new Error(errorData.error || 'Failed to send Facebook event')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error sending Facebook event:', error)
    throw error
  }
}

export const triggerRevisionWorkflow = async (data) => {
  try {
    // Check if user has enough credits before starting revision
    const { User } = await import('@/api/entities');
    const currentUser = await User.me();
    if (!currentUser || currentUser.credits < 2.5) {
      throw new Error('Insufficient credits. You need 2.5 credits to start video revision.');
    }

    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated - please log in again')
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-revision-workflow`
    
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
        revisionRequest: revisionMessage.content,
        parentVideoId: parentVideo.video_id,
        chatId: data.chat_id,
        brief: chat.brief,
        imageUrl: initialMessage.metadata.image_url,
        creditsUsed: 2.5
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
  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-blog-posts`
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      console.warn('Blog posts API failed, falling back to static data')
      return { data: { posts: [] } }
    }

    const result = await response.json()
    return { data: { posts: result.posts || [] } }
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return { data: { posts: [] } }
  }
}

export const ensureUserCredits = async () => {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated - please log in again')
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ensure-user-credits`
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Ensure Credits API Error Response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      throw new Error(errorData.error || 'Failed to ensure user credits')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error ensuring user credits:', error)
    throw error
  }
}

export const setupNewUser = async () => {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated - please log in again')
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-new-user`
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Setup New User API Error Response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      throw new Error(errorData.error || 'Failed to setup new user')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error setting up new user:', error)
    throw error
  }
}

export const syncUserWithStripe = async () => {
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated - please log in again')
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-user-stripe`
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({})
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Sync Stripe API Error Response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      throw new Error(errorData.error || 'Failed to sync with Stripe')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error syncing with Stripe:', error)
    throw error
  }
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
  try {
    // Get the current user's session token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated - please log in again')
    }

    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/locking-manager`
    
    const headers = {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Locking Manager API Error Response:', errorText)
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: errorText }
      }
      throw new Error(errorData.error || 'Failed to manage lock')
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error with locking manager:', error)
    throw error
  }
}

export const rateLimiter = async (data) => {
  // Mock rate limiter
  return { success: true, allowed: true }
}