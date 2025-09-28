import React from 'react'
import ReactDOM from 'react-dom/client'
import { supabase } from '@/lib/supabase'
import App from '@/App.jsx'
import '@/index.css'

// Initialize auth state listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state changed:', event, session?.user?.email);
  
  if (event === 'SIGNED_IN') {
    console.log('User signed in, redirecting to dashboard');
    // The redirect will be handled by the OAuth flow
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    // Clear any cached data
    sessionStorage.removeItem('pendingChatData');
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 