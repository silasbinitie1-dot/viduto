
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner"; // toast is no longer used in the new useEffect, but keeping import as it might be used elsewhere.
import Home from './home';
import Features from './features';
import Pricing from './pricing';
import Blog from './blog';
import BlogPost from './BlogPost';
import Enterprise from './enterprise';
import Terms from './terms';
import Privacy from './privacy';
import Dashboard from './dashboard';
import IndexRedirect from './index';

export default function Layout() {
  useEffect(() => {
    // Load Facebook Pixel dynamically to ensure it loads properly
    if (!window.fbq) {
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      
      window.fbq('init', '749442470958288');
      window.fbq('track', 'PageView');
    }
    
    // Fire PageView on every page change
    if (window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, []);


  return (
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
        <Route path="/" element={<IndexRedirect />} />
        <Route path="/home" element={<Home />} />
        <Route path="/features" element={<Features />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/BlogPost" element={<BlogPost />} />
        <Route path="/enterprise" element={<Enterprise />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
      <Toaster position="top-center" richColors />
    </>
  );
}
