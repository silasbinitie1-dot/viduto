import { supabase } from '@/lib/supabaseClient'

export const Chat = {
  create: async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: chat, error } = await supabase
      .from('chat')
      .insert({
        title: data.title || 'New Chat',
        status: data.status || 'active',
        workflow_state: data.workflow_state || 'draft',
        user_id: user.id
      })
      .select()
      .single()

    if (error) throw error
    return chat
  },

  get: async (id) => {
    const { data: chat, error } = await supabase
      .from('chat')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return chat
  },

  filter: async (filters, sort = '-created_at') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    let query = supabase
      .from('chat')
      .select('*')
      .eq('user_id', user.id)

    // Apply sorting
    if (sort.startsWith('-')) {
      const column = sort.substring(1)
      query = query.order(column, { ascending: false })
    } else {
      query = query.order(sort, { ascending: true })
    }

    const { data: chats, error } = await query

    if (error) throw error
    return chats || []
  }
}

export const Message = {
  create: async (data) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: message, error } = await supabase
      .from('message')
      .insert({
        chat_id: data.chat_id,
        message_type: data.message_type || 'user',
        content: data.content || '',
        metadata: data.metadata || {}
      })
      .select()
      .single()

    if (error) throw error
    return message
  },

  filter: async (filters, sort = 'created_at') => {
    let query = supabase
      .from('message')
      .select('*')
      .eq('chat_id', filters.chat_id)

    // Apply sorting
    if (sort.startsWith('-')) {
      const column = sort.substring(1)
      query = query.order(column, { ascending: false })
    } else {
      query = query.order(sort, { ascending: true })
    }

    const { data: messages, error } = await query

    if (error) throw error
    return messages || []
  }
}

export const Video = {
  get: async (id) => {
    const { data: video, error } = await supabase
      .from('video')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return video
  }
}

export const SystemLog = {}

export const User = {
  me: async () => {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    console.log('User.me - supabase.auth.getUser result:', { authUser, authError });
    
    if (authError || !authUser) {
      console.log('User.me - Not authenticated, throwing error.');
      throw new Error('Not authenticated')
    }

    // Get user profile from users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    console.log('User.me - user profile fetch result:', { userProfile, profileError });
    if (profileError) {
      // If user doesn't exist in users table, create them
      if (profileError.code === 'PGRST116') {
        console.log('User.me - Profile not found, creating new user.');
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
            credits: 20, // Default free credits
            role: 'user',
            subscription_status: 'inactive'
          })
          .select()
          .single()

        if (createError) throw createError
          console.error('User.me - Error creating new user profile:', createError);
        console.log('User.me - New user profile created:', newUser);
        return newUser
      }
      console.error('User.me - Profile fetch error:', profileError);
      throw profileError
    }

    console.log('User.me - Existing user profile found:', userProfile);
    return userProfile
  },

  login: async () => {
    console.log('User.login - Starting OAuth flow...');
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })

    console.log('User.login - OAuth response:', { data, error });
    if (error) throw error
    return data
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }
}