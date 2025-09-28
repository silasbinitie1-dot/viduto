
import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner"; // toast is no longer used in the new useEffect, but keeping import as it might be used elsewhere.

export default function Layout({ children, currentPageName }) {
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
  }, [currentPageName]);

  // Dynamic SEO metadata per page
  const baseUrl = 'https://viduto.com';
  const metaMap = {
    home: {
      title: 'Viduto - Create viral videos with your product',
      description: 'Create viral video ads from your product images by simply chatting with AI. Transform your products into professional 30-second videos in about 10 minutes.',
      path: '/',
      image: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b4aa46f5d6326ab93c3ed0/e690cf3a7_IMG_6930.jpg' // Updated image URL
    },
    features: {
      title: 'Features — Viduto: AI product videos in ~10 minutes',
      description: 'Use your real product images to generate professional 30-second videos. Fully customizable, data-backed, and brand-safe. Revisions cost 3 credits.',
      path: '/features',
      image: 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?q=80&w=1600&auto=format&fit=crop'
    },
    pricing: {
      title: 'Pricing — Viduto: Flexible, credit-based plans',
      description: 'Flexible, credit-based pricing starting at $29/mo. Each video takes up to ~10 minutes. Revisions cost 3 credits.',
      path: '/pricing',
      image: 'https://images.unsplash.com/photo-1517022812141-23620dba5c23?q=80&w=1600&auto=format&fit=crop'
    },
    blog: {
      title: 'Blog — Viduto',
      description: 'Insights on AI video creation, product marketing, and growth.',
      path: '/blog',
      image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop'
    },
    blogpost: {
      title: 'Article — Viduto', // This might be dynamically updated based on the actual blog post title if needed, or left generic
      description: 'Read our latest article on AI video creation and product marketing.',
      path: '/blog', // Canonical for blog posts usually points to the post itself, but here it's generic to the blog page.
      image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?q=80&w=1600&auto=format&fit=crop'
    },
    enterprise: {
      title: 'Enterprise — Viduto for teams',
      description: 'Scale video creation across teams with brand safety and governance.',
      path: '/enterprise',
      image: 'https://images.unsplash.com/photo-1497015289633-94624697534a?q=80&w=1600&auto=format&fit=crop'
    }
  };
  const key = (currentPageName || 'home').toLowerCase(); // Default to 'home' if currentPageName is not provided
  const current = metaMap[key] || metaMap.home;
  const canonical = `${baseUrl}${current.path}`;

  // Minimal FAQ JSON-LD for AEO on home
  const faqJsonLd = key === 'home' ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "Do I need video editing experience?",
      "acceptedAnswer": { "@type": "Answer", "text": "No. Upload your product image and describe your idea—our AI handles scripting, scenes, voiceover, and music." }
    }, {
      "@type": "Question",
      "name": "How long does a video take to generate?",
      "acceptedAnswer": { "@type": "Answer", "text": "About 10 minutes depending on complexity." }
    }, {
      "@type": "Question",
      "name": "How much does a revision cost?",
      "acceptedAnswer": { "@type": "Answer", "text": "Each revision costs 2.5 credits." }
    }]
  } : null;

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Viduto",
    "url": baseUrl,
    "logo": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b4aa46f5d6326ab93c3ed0/42beff144_vidutologotransparent.png"
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Viduto",
    "url": baseUrl,
    "potentialAction": {
      "@type": "SearchAction",
      "target": `${baseUrl}/blog?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <>
      {/* Meta Pixel Code - Static implementation */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '749442470958288');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src="https://www.facebook.com/tr?id=749442470958288&ev=PageView&noscript=1"
        />
      </noscript>

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
      
      {/* Favicon */}
      <link rel="icon" type="image/png" href="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b4aa46f5d6326ab93c3ed0/42beff144_vidutologotransparent.png" />
      <link rel="shortcut icon" type="image/png" href="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b4aa46f5d6326ab93c3ed0/42beff144_vidutologotransparent.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b4aa46f5d6326ab93c3ed0/42beff144_vidutologotransparent.png" />
      
      {/* Dynamic SEO meta */}
      <title>{current.title}</title>
      <link rel="canonical" href={canonical} />
      <meta name="description" content={current.description} />
      <meta name="robots" content="index,follow,max-image-preview:large" />

      {/* Open Graph */}
      <meta property="og:title" content={current.title} />
      <meta property="og:description" content={current.description} />
      <meta property="og:image" content={current.image} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Viduto" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={current.title} />
      <meta name="twitter:description" content={current.description} />
      <meta name="twitter:image" content={current.image} />

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}
      
      {children}
      <Toaster position="top-center" richColors />
    </>
  );
}
