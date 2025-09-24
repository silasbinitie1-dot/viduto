import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"

function App() {
  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('App.jsx - Auth state change event:', event);
        console.log('App.jsx - Auth state change session:', session);
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user?.email)
          // Redirect will be handled by the OAuth flow
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out')
        }
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  return (
    <BrowserRouter>
     <>
      <Pages />
      <Toaster />
    </>
    </BrowserRouter>
    
  )
}

export default App 