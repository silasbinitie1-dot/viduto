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

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        chat_id: data.chat_id,
        brief: `${chat.brief}\n\nRevision Request: ${revisionMessage.content}`,
        image_url: chat.image_url,
        is_revision: true,
        credits_used: 2.5
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
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
  // Mock video status check
  return {
    status: 'processing',
    progress: 50,
    estimated_completion: new Date(Date.now() + 5 * 60 * 1000).toISOString()
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