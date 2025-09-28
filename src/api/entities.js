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

    // Truncate title if it's too long for the database column (500 chars max)
    if (chatData.title && chatData.title.length > 500) {
      chatData.title = chatData.title.substring(0, 497) + '...'
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
    console.log('🔍 User.me() called');
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('User.me - Auth check failed:', authError?.message || 'No user')
      console.error('❌ User.me - Authentication failed:', authError?.message || 'No user session');
      throw new Error(`Not authenticated: ${authError?.message || 'No user session'}`)
    }

    console.log('User.me - Auth successful for:', user.email)
    console.log('✅ User.me - Authentication successful for:', user.email);

    // Get user profile from users table
    console.log('🔍 User.me - Fetching user profile from database...');
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      // If profile doesn't exist, try to create it
      console.log('User.me - Profile not found, creating new profile for:', user.email);
      console.log('⚠️ User.me - Profile not found, attempting to create new profile...');
      
      // Call setup-new-user function to ensure proper initialization
      try {
        console.log('🔍 User.me - Calling setup-new-user function...');
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-new-user`
          console.log('🔗 User.me - API URL:', apiUrl);
          
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
          })
          
          console.log('📡 User.me - Setup function response status:', response.status);
          const responseText = await response.text();
          console.log('📡 User.me - Setup function response:', responseText);
          
          if (response.ok) {
            const result = JSON.parse(responseText);
            if (result.success && result.user) {
              console.log('User.me - Profile created via setup-new-user function');
              console.log('✅ User.me - Profile created successfully via setup function');
              return result.user
            }
          }
        }
      } catch (setupError) {
        console.warn('User.me - Setup function failed, falling back to direct creation:', setupError.message);
        console.error('❌ User.me - Setup function failed:', setupError.message);
      }
      
      // Fallback: direct profile creation
      console.log('🔍 User.me - Attempting direct profile creation...');
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email.split('@')[0],
          credits: 20,
          subscription_status: 'inactive',
          current_plan: 'Free'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('User.me - Failed to create profile:', createError.message);
        console.error('❌ User.me - Direct profile creation failed:', createError.message);
        console.error('❌ User.me - Create error details:', createError);
        throw new Error('Failed to create user profile. Please contact support.');
      }
      
      console.log('User.me - Profile created successfully for:', user.email)
      console.log('✅ User.me - Direct profile creation successful');
      return newProfile
    }

    console.log('User.me - Profile found:', profile.email, 'Credits:', profile.credits)
    console.log('✅ User.me - Profile found successfully:', {
      email: profile.email,
      credits: profile.credits,
      plan: profile.current_plan,
      subscription_status: profile.subscription_status
    });
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