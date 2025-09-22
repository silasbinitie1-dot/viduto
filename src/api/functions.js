// Mock functions for development with working implementations
export const createStripeCheckoutSession = async (data) => {
  console.log('Mock Stripe checkout:', data);
  // Simulate successful checkout creation
  return { 
    data: { 
      url: 'https://checkout.stripe.com/mock',
      success: true 
    } 
  };
};

export const createStripeCustomerPortal = async () => {
  console.log('Mock customer portal');
  return { 
    data: { 
      url: 'https://billing.stripe.com/mock' 
    } 
  };
};

export const sendFacebookConversionEvent = async (data) => {
  console.log('Mock Facebook event:', data);
  return { success: true };
};

export const triggerRevisionWorkflow = async (data) => {
  console.log('Mock revision workflow:', data);
  return { success: true, message: 'Revision workflow started' };
};

export const checkVideoStatus = async (data) => {
  console.log('Mock video status check:', data);
  return { 
    status: 'completed',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  };
};

export const triggerInitialVideoWorkflow = async (data) => {
  console.log('Mock initial video workflow:', data);
  return { success: true, message: 'Initial video workflow started' };
};

export const startVideoProduction = async (data) => {
  console.log('Mock video production:', data);
  return { success: true, production_id: 'mock_production_123' };
};

export const getBlogPosts = async () => {
  console.log('Mock get blog posts');
  return { data: { posts: [] } };
};

export const ensureUserCredits = async () => {
  console.log('Mock ensure user credits');
  return { success: true, credits_added: 0 };
};

export const setupNewUser = async () => {
  console.log('Mock setup new user');
  return { success: true };
};

export const syncUserWithStripe = async () => {
  console.log('Mock sync with Stripe');
  return { success: true };
};

// Export all other functions as working mocks
export const stripeWebhook = async () => ({ success: true });
export const n8nVideoCallback = async () => ({ success: true });
export const generateSitemap = async () => ({ success: true });
export const staticFeatures = async () => ({ success: true });
export const staticPricing = async () => ({ success: true });
export const robotsTxt = async () => ({ success: true });
export const staticHome = async () => ({ success: true });
export const llmSummary = async () => ({ success: true });
export const lockingManager = async () => ({ success: true });
export const adminVideoManager = async () => ({ success: true });
export const n8nVideoUrlCallback = async () => ({ success: true });
export const rateLimiter = async () => ({ success: true });
export const fixMyCredits = async () => ({ success: true });
export const migrateUsersToSchedules = async () => ({ success: true });
export const migrationCron = async () => ({ success: true });