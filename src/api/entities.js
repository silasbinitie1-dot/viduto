// Base44 Entities SDK - properly structured for the app
export const Chat = {
  create: async (data) => {
    const response = await fetch('/api/entities/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create chat: ${response.statusText}`);
    }
    
    return response.json();
  },

  get: async (id) => {
    const response = await fetch(`/api/entities/chat/${id}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get chat: ${response.statusText}`);
    }
    
    return response.json();
  },

  filter: async (filters, sort = '-created_at') => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      params.append(key, value);
    });
    params.append('sort', sort);
    
    const response = await fetch(`/api/entities/chat?${params}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to filter chats: ${response.statusText}`);
    }
    
    return response.json();
  },

  update: async (id, data) => {
    const response = await fetch(`/api/entities/chat/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update chat: ${response.statusText}`);
    }
    
    return response.json();
  }
};

export const Message = {
  create: async (data) => {
    const response = await fetch('/api/entities/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create message: ${response.statusText}`);
    }
    
    return response.json();
  },

  filter: async (filters, sort = 'created_at') => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      params.append(key, value);
    });
    params.append('sort', sort);
    
    const response = await fetch(`/api/entities/message?${params}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to filter messages: ${response.statusText}`);
    }
    
    return response.json();
  }
};

export const Video = {
  get: async (id) => {
    const response = await fetch(`/api/entities/video/${id}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get video: ${response.statusText}`);
    }
    
    return response.json();
  },

  filter: async (filters, sort = '-created_at') => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      params.append(key, value);
    });
    params.append('sort', sort);
    
    const response = await fetch(`/api/entities/video?${params}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to filter videos: ${response.statusText}`);
    }
    
    return response.json();
  },

  update: async (id, data) => {
    const response = await fetch(`/api/entities/video/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update video: ${response.statusText}`);
    }
    
    return response.json();
  }
};

export const User = {
  me: async () => {
    const response = await fetch('/api/auth/me', {
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Not authenticated');
      }
      throw new Error(`Failed to get user: ${response.statusText}`);
    }
    
    return response.json();
  },

  login: async () => {
    // For Base44, we need to redirect directly to the OAuth endpoint
    // This should be configured in your Base44 project settings
    const baseUrl = window.location.origin;
    const redirectUrl = `${baseUrl}/dashboard`;
    
    // Redirect to Base44 Google OAuth
    window.location.href = `/api/auth/google?redirect_url=${encodeURIComponent(redirectUrl)}`;
  },

  logout: async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Logout failed: ${response.statusText}`);
    }
    
    return response.json();
  },

  update: async (data) => {
    const response = await fetch('/api/entities/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.statusText}`);
    }
    
    return response.json();
  }
};

export const SystemLog = {
  create: async (data) => {
    const response = await fetch('/api/entities/system-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create system log: ${response.statusText}`);
    }
    
    return response.json();
  }
};