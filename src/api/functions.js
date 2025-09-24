// Base44 Functions - backend serverless functions
export const createStripeCheckoutSession = async (data) => {
  const response = await fetch('/api/functions/create-stripe-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Stripe checkout failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const createStripeCustomerPortal = async () => {
  const response = await fetch('/api/functions/create-stripe-customer-portal', {
    method: 'POST',
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Customer portal failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const sendFacebookConversionEvent = async (data) => {
  const response = await fetch('/api/functions/send-facebook-conversion-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Facebook event failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const triggerRevisionWorkflow = async (data) => {
  const response = await fetch('/api/functions/trigger-revision-workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Revision workflow failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const checkVideoStatus = async (data) => {
  const response = await fetch('/api/functions/check-video-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Video status check failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const triggerInitialVideoWorkflow = async (data) => {
  const response = await fetch('/api/functions/trigger-initial-video-workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Initial video workflow failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const startVideoProduction = async (data) => {
  const response = await fetch('/api/functions/start-video-production', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Video production failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const getBlogPosts = async (data = {}) => {
  const params = new URLSearchParams(data);
  const response = await fetch(`/api/functions/get-blog-posts?${params}`, {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Get blog posts failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const ensureUserCredits = async () => {
  const response = await fetch('/api/functions/ensure-user-credits', {
    method: 'POST',
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Ensure user credits failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const setupNewUser = async () => {
  const response = await fetch('/api/functions/setup-new-user', {
    method: 'POST',
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Setup new user failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const syncUserWithStripe = async () => {
  const response = await fetch('/api/functions/sync-user-with-stripe', {
    method: 'POST',
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Sync with Stripe failed: ${response.statusText}`);
  }
  
  return response.json();
};

// Additional functions from the architecture
export const stripeWebhook = async (data) => {
  const response = await fetch('/api/functions/stripe-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Stripe webhook failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const n8nVideoCallback = async (data) => {
  const response = await fetch('/api/functions/n8n-video-callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`N8N callback failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const generateSitemap = async () => {
  const response = await fetch('/api/functions/generate-sitemap', {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Sitemap generation failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const robotsTxt = async () => {
  const response = await fetch('/api/functions/robots-txt', {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Robots.txt failed: ${response.statusText}`);
  }
  
  return response.text();
};

export const lockingManager = async (data) => {
  const response = await fetch('/api/functions/locking-manager', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Locking manager failed: ${response.statusText}`);
  }
  
  return response.json();
};

export const rateLimiter = async (data) => {
  const response = await fetch('/api/functions/rate-limiter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`Rate limiter failed: ${response.statusText}`);
  }
  
  return response.json();
};