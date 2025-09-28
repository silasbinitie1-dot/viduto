import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import './App.css'

// Import all page components
import Layout from '@/pages/Layout.jsx'
import Home from '@/pages/home.jsx'
import Features from '@/pages/features.jsx'
import Pricing from '@/pages/pricing.jsx'
import Blog from '@/pages/blog.jsx'
import BlogPost from '@/pages/BlogPost.jsx'
import Enterprise from '@/pages/enterprise.jsx'
import Terms from '@/pages/terms.jsx'
import Privacy from '@/pages/privacy.jsx'
import Dashboard from '@/pages/dashboard.jsx'

function App() {
  return (
    <BrowserRouter>
      <>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }
          .animate-scaleIn {
            animation: scaleIn 0.3s ease-out forwards;
          }
        `}</style>
        
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="home" element={<Home />} />
            <Route path="features" element={<Features />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="blog" element={<Blog />} />
            <Route path="BlogPost" element={<BlogPost />} />
            <Route path="enterprise" element={<Enterprise />} />
            <Route path="terms" element={<Terms />} />
            <Route path="privacy" element={<Privacy />} />
          </Route>
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
        
        <Toaster position="top-center" richColors />
      </>
    </BrowserRouter>
  )
}

export default App