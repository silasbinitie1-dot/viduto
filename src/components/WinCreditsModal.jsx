
import React from 'react';
import { X, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

const InstagramIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
  </svg>
);

export function WinCreditsModal({ isOpen, onClose, darkMode = false }) {
  if (!isOpen) return null;

  const socialPlatforms = [
    {
      name: 'Instagram',
      icon: InstagramIcon,
      url: 'https://www.instagram.com/',
      color: darkMode ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'
    },
    {
      name: 'Facebook', 
      icon: FacebookIcon,
      url: 'https://www.facebook.com/',
      color: 'bg-[#1877F2]'
    },
    {
      name: 'YouTube',
      icon: YouTubeIcon, 
      url: 'https://www.youtube.com/',
      color: 'bg-[#FF0000]'
    },
    {
      name: 'LinkedIn',
      icon: LinkedInIcon,
      url: 'https://www.linkedin.com/',
      color: 'bg-[#0077B5]'
    },
    {
      name: 'X',
      icon: XIcon,
      url: 'https://twitter.com/',
      color: 'bg-black'
    }
  ];

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4 transition-opacity duration-300 animate-fadeIn" 
      onClick={onClose}
    >
      <div 
        className={`max-w-md md:max-w-lg w-full relative shadow-2xl border transform transition-transform duration-300 animate-scaleIn rounded-2xl p-4 md:p-6 ${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose} 
          className={`absolute top-4 right-4 rounded-full ${
            darkMode 
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <X className="w-5 h-5" />
        </Button>
        
        <div className="text-center mb-5 md:mb-6">
          <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full mx-auto mb-3 md:mb-4 flex items-center justify-center ${
            darkMode ? 'bg-orange-500/20' : 'bg-orange-100'
          }`}>
            <Gift className="w-6 h-6 md:w-8 md:h-8 text-orange-500" />
          </div>
          <h2 className={`text-xl md:text-2xl font-light mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Win FREE Credits!
          </h2>
          <p className={`font-light text-xs md:text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Share your video and earn 40 free credits to keep building!
          </p>
        </div>

        <div className={`rounded-2xl p-4 md:p-6 space-y-3 md:space-y-4 mb-5 md:mb-6 ${
          darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
        }`}>
          <h3 className={`text-base md:text-lg font-medium mb-2 md:mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Sharing Guidelines
          </h3>
          
          <div className="space-y-2 md:space-y-3 text-xs md:text-sm">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                Tag <span className="font-medium">@viduto.ai</span> in your video post
              </span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                Write at least 100 characters about your experience with Viduto
              </span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                Include your created video or a screenshot
              </span>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>
                Send the link to your post to{' '}
                <a 
                  href="mailto:support@viduto.com" 
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  support@viduto.com
                </a>
              </span>
            </div>
          </div>
        </div>

        <div className="text-center mb-3 md:mb-4">
          <p className={`text-xs md:text-sm font-medium mb-2 md:mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Choose your platform:
          </p>
          <div className="inline-flex w-fit mx-auto justify-center gap-1.5 md:gap-2">
            {socialPlatforms.map((platform) => {
              const IconComponent = platform.icon;
              return (
                <button
                  key={platform.name}
                  onClick={() => window.open(platform.url, '_blank')}
                  className={`${platform.color} text-white w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity duration-200 shadow-lg`}
                  title={`Share on ${platform.name}`}
                >
                  <div className="scale-90 md:scale-100">
                    <IconComponent />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`mt-4 md:mt-6 pt-3 md:pt-4 border-t text-center ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-xs md:text-sm font-light ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Credits will be added to your account within 24 hours after verification
          </p>
        </div>
      </div>
    </div>
  );
}
