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
  // Mock initial video workflow
  console.log('Mock initial video workflow:', data)
  return { success: true, message: 'Initial video workflow triggered' }
}

export const startVideoProduction = async (data) => {
  // Mock video production
  console.log('Mock video production:', data)
  return { success: true, video_id: `video_${Date.now()}` }
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