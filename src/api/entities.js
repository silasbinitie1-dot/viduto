// Mock entities for development with working authentication
let currentUser = null;

export const Chat = {
  create: async (data) => {
    const chat = { 
      id: Date.now().toString(), 
      title: data.title || 'New Chat',
      status: data.status || 'active',
      workflow_state: data.workflow_state || 'active',
      created_by: currentUser?.email || 'user@example.com',
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
      ...data 
    };
    return chat;
  },
  get: async (id) => ({ 
    id, 
    title: 'Mock Chat', 
    status: 'active',
    created_by: currentUser?.email || 'user@example.com',
    created_date: new Date().toISOString(),
    updated_date: new Date().toISOString()
  }),
  filter: async (filters, sort) => {
    // Return some mock chats for the user
    return [
      {
        id: '1',
        title: 'Product Video Demo',
        status: 'active',
        created_by: currentUser?.email || 'user@example.com',
        created_date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        updated_date: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: '2', 
        title: 'Marketing Campaign',
        status: 'active',
        created_by: currentUser?.email || 'user@example.com',
        created_date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        updated_date: new Date(Date.now() - 172800000).toISOString()
      }
    ];
  }
};

export const Message = {
  create: async (data) => ({ 
    id: Date.now().toString(), 
    chat_id: data.chat_id,
    message_type: data.message_type || 'user',
    content: data.content || '',
    metadata: data.metadata || {},
    created_date: new Date().toISOString(),
    ...data 
  }),
  filter: async (filters, sort) => {
    // Return some mock messages for the chat
    return [
      {
        id: '1',
        chat_id: filters.chat_id,
        message_type: 'user',
        content: 'Create a video for my product',
        metadata: { image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
        created_date: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '2',
        chat_id: filters.chat_id,
        message_type: 'assistant',
        content: 'Here\'s your video!',
        metadata: { 
          video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          ai_response: 'I\'ve created a professional video showcasing your product with dynamic scenes and engaging transitions.'
        },
        created_date: new Date(Date.now() - 3000000).toISOString()
      }
    ];
  }
};

export const Video = {
  get: async (id) => ({ 
    id, 
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    status: 'completed',
    created_date: new Date().toISOString()
  })
};

export const SystemLog = {};

// Mock auth with working login/logout
export const User = {
  me: async () => {
    if (!currentUser) {
      throw new Error('Not authenticated');
    }
    return currentUser;
  },
  
  login: async () => {
    // Simulate successful Google OAuth login
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
    
    // Create mock user after "authentication"
    currentUser = {
      id: 'user_123',
      email: 'demo@viduto.com',
      full_name: 'Demo User',
      credits: 20,
      current_plan: 'Free',
      subscription_status: 'inactive',
      created_date: new Date().toISOString()
    };
    
    // Simulate redirect to dashboard
    window.location.href = '/dashboard';
    
    return currentUser;
  },
  
  logout: async () => {
    currentUser = null;
    console.log('User logged out');
  }
};