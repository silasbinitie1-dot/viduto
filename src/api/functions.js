// Mock functions for development
export const createStripeCheckoutSession = async (data) => {
  console.log('Mock Stripe checkout:', data);
  return { data: { url: 'https://checkout.stripe.com/mock' } };
};

export const createStripeCustomerPortal = async () => {
  console.log('Mock customer portal');
  return { data: { url: 'https://billing.stripe.com/mock' } };
};

export const sendFacebookConversionEvent = async (data) => {
  console.log('Mock Facebook event:', data);
};

export const triggerRevisionWorkflow = async (data) => {
  console.log('Mock revision workflow:', data);
};

export const checkVideoStatus = async (data) => {
  console.log('Mock video status check:', data);
};

export const triggerInitialVideoWorkflow = async (data) => {
  console.log('Mock initial video workflow:', data);
};

export const startVideoProduction = async (data) => {
  console.log('Mock video production:', data);
};

export const getBlogPosts = async () => {
  return { data: { posts: [] } };
};

export const ensureUserCredits = async () => {
  console.log('Mock ensure user credits');
};

export const setupNewUser = async () => {
  console.log('Mock setup new user');
};

export const syncUserWithStripe = async () => {
  console.log('Mock sync with Stripe');
};

// Export all other functions as mocks
export const stripeWebhook = async () => {};
export const n8nVideoCallback = async () => {};
export const generateSitemap = async () => {};
export const staticFeatures = async () => {};
export const staticPricing = async () => {};
export const robotsTxt = async () => {};
export const staticHome = async () => {};
export const llmSummary = async () => {};
export const lockingManager = async () => {};
export const adminVideoManager = async () => {};
export const n8nVideoUrlCallback = async () => {};
export const rateLimiter = async () => {};
export const fixMyCredits = async () => {};
export const migrateUsersToSchedules = async () => {};
export const migrationCron = async () => {};