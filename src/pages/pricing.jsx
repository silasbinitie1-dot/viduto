
import React, { useState, useEffect } from 'react';
import { ArrowRight, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PricingContent } from '../components/PricingContent';
import { Footer } from '../components/Footer';
import { Button } from '@/components/ui/button';
import { User } from '@/api/entities';
import { AuthModal } from '../components/AuthModal';
import { MobileMenu } from '../components/MobileMenu'; // Added import for MobileMenu
import { sendFacebookConversionEvent } from '@/api/functions';

export default function PricingPage() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Added state for mobile menu
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (e) {
        setUser(null);
      }
    };
    checkUser();

    // Track ViewContent event for pricing page
    if (window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_name: 'Pricing Page',
        content_category: 'pricing'
      });
    }
  }, []);

  const handleAuthRequired = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="max-w-5xl mx-2 md:mx-auto p-2 px-4 mt-2 bg-white/70 backdrop-blur-md rounded-xl flex items-center justify-between shadow-sm">
          <Link to="/home" className="flex items-center gap-2">
            <Logo size={32} className="w-8 h-8" />
            <span className="text-2xl font-light text-gray-900 tracking-tight hover:text-gray-700 transition-colors">
              Viduto
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-4">
            <Link to="/features" className="text-gray-700 hover:text-black transition-colors font-normal">Features</Link>
            <a href="https://discord.gg/MdBr54xe" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-black transition-colors font-normal">Community</a>
            <Link to="/pricing" className="text-gray-700 hover:text-black transition-colors font-normal">Pricing</Link>
            <Link to="/blog" className="text-gray-700 hover:text-black transition-colors font-normal">Blog</Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <Button
                asChild
                className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200"
              >
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button
                onClick={handleAuthRequired}
                className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200"
              >
                Get Started
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {user ? (
              <Button
                asChild
                className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200"
              >
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button
                onClick={handleAuthRequired}
                className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200"
              >
                Get Started
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
              className="w-8 h-8 ml-2"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-blue-100 via-purple-100 to-orange-100 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light text-gray-900 mb-6 leading-tight">
            Plans from first idea to full scale
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 font-light">
            Start for free. Upgrade when you're ready.
          </p>
          <Button
            onClick={handleAuthRequired}
            size="lg"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-full font-normal hover:bg-orange-500/90 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Start creating
            <ArrowRight size={20} />
          </Button>
        </div>
      </section>

      {/* Pricing Content */}
      <PricingContent />

      {/* Footer */}
      <Footer />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      {/* MobileMenu rendered at the bottom, typically as a full-screen overlay */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        handleAuthRequired={handleAuthRequired}
      />
    </div>
  );
}
