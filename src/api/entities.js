// Mock entities for development
export const Chat = {
  create: async (data) => ({ id: Date.now().toString(), ...data }),
  get: async (id) => ({ id, title: 'Mock Chat', status: 'active' }),
  filter: async (filters, sort) => []
};

export const Message = {
  create: async (data) => ({ id: Date.now().toString(), ...data }),
  filter: async (filters, sort) => []
};

export const Video = {
  get: async (id) => ({ id, video_url: null })
};

export const SystemLog = {};

// Mock auth
export const User = {
  me: async () => {
    throw new Error('Not authenticated');
  },
  login: async () => {
    console.log('Mock login - redirect to auth');
  },
  logout: async () => {
    console.log('Mock logout');
  }
};