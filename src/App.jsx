import { BrowserRouter } from "react-router-dom";
import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

function App() {
  useEffect(() => {
    // Handle auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' && session) {
        // Redirect to dashboard after successful login
        window.location.href = '/dashboard'
      } else if (event === 'SIGNED_OUT') {
        // Redirect to home after logout
        window.location.href = '/home'
      }
    })

    return () => subscription.unsubscribe()
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