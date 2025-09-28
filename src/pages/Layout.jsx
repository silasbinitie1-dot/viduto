import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

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

  return <Outlet />;
}