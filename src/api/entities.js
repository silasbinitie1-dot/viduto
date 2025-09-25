import { supabase } from '@/lib/supabase'

export const Chat = {
  create: async (data) => {
    // Get current user to ensure user_id is set
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    // Ensure user_id is included in the data
    const chatData = {
      ...data,
      user_id: user.id
    }

    const { data: result, error } = await supabase
      .from('chat')
      .insert(chatData)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create chat: ${error.message}`)
    return result
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from('chat')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw new Error(`Failed to get chat: ${error.message}`)
    return data
  },

  filter: async (filters, sort = '-created_at') => {
    let query = supabase.from('chat').select('*')
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    // Handle sorting
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort
    const ascending = !sort.startsWith('-')
    query = query.order(sortField, { ascending })
    
    const { data, error } = await query
    if (error) throw new Error(`Failed to filter chats: ${error.message}`)
    return data
  },

  update: async (id, data) => {
    const { data: result, error } = await supabase
      .from('chat')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to update chat: ${error.message}`)
    return result
  }
}

export const Message = {
  create: async (data) => {
    // Get current user for validation
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    const { data: result, error } = await supabase
      .from('message')
      .insert(data)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create message: ${error.message}`)
    return result
  },

  get: async (id) => {
    const { data, error } = await supabase
      .from('message')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw new Error(`Failed to get message: ${error.message}`)
    return data
  },

  filter: async (filters, sort = 'created_at') => {
    let query = supabase.from('message').select('*')
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    // Handle sorting
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort
    const ascending = !sort.startsWith('-')
    query = query.order(sortField, { ascending })
    
    const { data, error } = await query
    if (error) throw new Error(`Failed to filter messages: ${error.message}`)
    return data
  }
}

export const Video = {
  get: async (id) => {
    const { data, error } = await supabase
      .from('video')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw new Error(`Failed to get video: ${error.message}`)
    return data
  },

  filter: async (filters, sort = '-created_at') => {
    let query = supabase.from('video').select('*')
    
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value)
    })
    
    // Handle sorting
    const sortField = sort.startsWith('-') ? sort.slice(1) : sort
    const ascending = !sort.startsWith('-')
    query = query.order(sortField, { ascending })
    
    const { data, error } = await query
    if (error) throw new Error(`Failed to filter videos: ${error.message}`)
    return data
  },

  update: async (id, data) => {
    const { data: result, error } = await supabase
      .from('video')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to update video: ${error.message}`)
    return result
  }
}

export const User = {
  me: async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    // Get user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      // If profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          credits: 20
        })
        .select()
        .single()

      if (createError) {
        throw new Error(`Failed to create user profile: ${createError.message}`)
      }
      
      return newProfile
    }

    return profile
  },

  login: async () => {
    // This method is now handled directly in AuthModal component
    // to avoid duplication and ensure proper error handling
    throw new Error('Use AuthModal component for login')
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw new Error(`Logout failed: ${error.message}`)
    }
  },

  update: async (data) => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      throw new Error('Not authenticated')
    }

    const { data: result, error } = await supabase
      .from('users')
      .update(data)
      .eq('id', user.id)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to update user: ${error.message}`)
    return result
  }
}

export const SystemLog = {
  create: async (data) => {
    const { data: result, error } = await supabase
      .from('system_log')
      .insert(data)
      .select()
      .single()
    
    if (error) throw new Error(`Failed to create system log: ${error.message}`)
    return result
  }
}