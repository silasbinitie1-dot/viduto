import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Add session debugging
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Supabase Client - Auth state change:', { event, session: session ? 'Session exists' : 'No session' });
  if (session) {
    console.log('Supabase Client - User ID:', session.user?.id);
    console.log('Supabase Client - User email:', session.user?.email);
  }
})