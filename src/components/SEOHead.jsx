import React from 'react';
import { useLocation } from 'react-router-dom';

const SEOHead = () => {
  const location = useLocation();

  // Define page-specific SEO data
  const getPageSEO = (pathname) => {
    const seoData = {
      '/': {
        title: 'Viduto - Create viral videos with your product',
        description: 'Transform your product images into professional 30-second videos with AI. No editing skills needed. Start for free.',
        ogImage: 'https://viduto.com/og-image-home.jpg',
        keywords: 'AI video creation, product videos, viral videos, video marketing, TikTok videos'
      },
      '/home': {
        title: 'Viduto - Create viral videos with your product',
        description: 'Transform your product images into professional 30-second videos with AI. No editing skills needed. Start for free.',
        ogImage: 'https://viduto.com/og-image-home.jpg',
        keywords: 'AI video creation, product videos, viral videos, video marketing, TikTok videos'
      },
      '/features': {
        title: 'Features - Viduto AI Video Creation Platform',
        description: 'Explore Viduto\'s powerful AI features: text-based video creation, product integration, viral optimization, and more.',
        ogImage: 'https://viduto.com/og-image-features.jpg',
        keywords: 'AI video features, text-to-video, product videos, video editing AI'
      },
      '/pricing': {
        title: 'Pricing Plans - Viduto Video Creation',
        description: 'Flexible pricing plans starting at $20/month. Create professional videos with credits-based system. Start with 20 free credits.',
        ogImage: 'https://viduto.com/og-image-pricing.jpg',
        keywords: 'video creation pricing, AI video cost, subscription plans, video credits'
      },
      '/blog': {
        title: 'Blog - Viduto Video Creation Insights',
        description: 'Latest insights on AI video creation, marketing strategies, and product video best practices.',
        ogImage: 'https://viduto.com/og-image-blog.jpg',
        keywords: 'video marketing blog, AI video insights, product video tips'
      },
      '/enterprise': {
        title: 'Enterprise Solutions - Viduto for Teams',
        description: 'Scale video creation across your organization with enterprise-grade security, team management, and priority support.',
        ogImage: 'https://viduto.com/og-image-enterprise.jpg',
        keywords: 'enterprise video creation, team video tools, business video solutions'
      },
      '/terms': {
        title: 'Terms of Service - Viduto',
        description: 'Terms of Service for Viduto video creation platform.',
        ogImage: 'https://viduto.com/og-image-default.jpg',
        keywords: 'terms of service, legal, viduto terms'
      },
      '/privacy': {
        title: 'Privacy Policy - Viduto',
        description: 'Privacy Policy for Viduto video creation platform.',
        ogImage: 'https://viduto.com/og-image-default.jpg',
        keywords: 'privacy policy, data protection, viduto privacy'
      }
    };

    return seoData[pathname] || seoData['/'];
  };

  const seo = getPageSEO(location.pathname);

  React.useEffect(() => {
    // Update document title
    document.title = seo.title;

    // Update meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', seo.description);

    // Update meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', seo.keywords);

    // Update Open Graph title
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', seo.title);

    // Update Open Graph description
    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', seo.description);

    // Update Open Graph image
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.setAttribute('content', seo.ogImage);

    // Update Open Graph URL
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', `https://viduto.com${location.pathname}`);

    // Update Twitter Card
    let twitterCard = document.querySelector('meta[name="twitter:card"]');
    if (!twitterCard) {
      twitterCard = document.createElement('meta');
      twitterCard.setAttribute('name', 'twitter:card');
      document.head.appendChild(twitterCard);
    }
    twitterCard.setAttribute('content', 'summary_large_image');

    let twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (!twitterTitle) {
      twitterTitle = document.createElement('meta');
      twitterTitle.setAttribute('name', 'twitter:title');
      document.head.appendChild(twitterTitle);
    }
    twitterTitle.setAttribute('content', seo.title);

    let twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (!twitterDescription) {
      twitterDescription = document.createElement('meta');
      twitterDescription.setAttribute('name', 'twitter:description');
      document.head.appendChild(twitterDescription);
    }
    twitterDescription.setAttribute('content', seo.description);

    let twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (!twitterImage) {
      twitterImage = document.createElement('meta');
      twitterImage.setAttribute('name', 'twitter:image');
      document.head.appendChild(twitterImage);
    }
    twitterImage.setAttribute('content', seo.ogImage);

  }, [location.pathname, seo]);

  return null; // This component doesn't render anything
};

export default SEOHead;