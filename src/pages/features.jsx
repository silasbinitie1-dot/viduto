
import React, { useState, useEffect } from 'react';
import { Camera, Clock, MessageSquare, Wand2, TrendingUp, DollarSign, FileText, CreditCard, ArrowRight, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Button } from '@/components/ui/button';
import { User } from '@/entities/User';
import { AuthModal } from '../components/AuthModal';
import { MobileMenu } from '../components/MobileMenu'; // Import MobileMenu
import Logo from "@/components/Logo";

// Update feature copy to clarify 3-credit revisions
const features = [
  {
    icon: <Camera className="w-8 h-8 text-orange-500" />,
    title: "Use Your Own Product",
    description: "Upload your actual product images and watch them come to life in professional video scenes. No generic stock footage—every frame shows your real product."
  },
  {
    icon: <Clock className="w-8 h-8 text-orange-500" />,
    title: "Lightning Fast Creation",
    description: "From concept to completed 30‑second video in about 10 minutes. Our advanced AI handles everything end‑to‑end."
  },
  {
    icon: <Wand2 className="w-8 h-8 text-orange-500" />,
    title: "Fully Customizable",
    description: "Ask for changes in plain English—adjust scenes, pacing, mood, voiceover, and more."
  },
  {
    icon: <MessageSquare className="w-8 h-8 text-orange-500" />,
    title: "Text‑Based Creation",
    description: "Describe your vision and our AI handles scripting, scene generation, voiceover, and music selection. No editing software required."
  },
  {
    icon: <TrendingUp className="w-8 h-8 text-orange-500" />,
    title: "Viral‑Ready Content",
    description: "Optimized for engagement using insights from millions of social posts—built to capture attention and convert."
  },
  {
    icon: <DollarSign className="w-8 h-8 text-orange-500" />,
    title: "Pay As You Go",
    description: "Flexible, credit‑based pricing. Each revision costs 3 credits so you can refine without breaking the bank."
  },
  {
    icon: <FileText className="w-8 h-8 text-orange-500" />,
    title: "Brand Guidelines",
    description: "Maintain consistent brand identity—upload brand assets, colors, and style preferences to match your aesthetic.",
    badge: "Coming Soon"
  },
  {
    icon: <CreditCard className="w-8 h-8 text-orange-500" />,
    title: "Pricing & Credits",
    description: "Start from $20/mo. Videos generate in about 10 minutes. Revisions are just 3 credits."
  }
];

export default function FeaturesPage() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false); // State for AuthModal
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // State for MobileMenu
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
  }, []);

  const handleAuthRequired = () => {
    if (!user) {
      setShowAuthModal(true); // Show AuthModal if user is not logged in
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
            <Logo size={20} className="w-6 h-6 md:w-8 md:h-8" />
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
            Top Features
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 font-light">
            Explore all the powerful features that make Viduto the ultimate AI video creation platform for your business.
          </p>
          <Button onClick={handleAuthRequired} size="lg" className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-full font-normal hover:bg-orange-500/90 transform hover:scale-105 transition-all duration-200 shadow-lg">
              Start creating
              <ArrowRight size={20} />
          </Button>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <span className="text-gray-700 font-normal">Filter by:</span>
            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full border border-gray-300 hover:bg-gray-200 transition-colors font-normal text-sm">
                AI Powered Features
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full border border-gray-300 hover:bg-gray-200 transition-colors font-normal text-sm">
                Video Creation
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full border border-gray-300 hover:bg-gray-200 transition-colors font-normal text-sm">
                Business Tools
              </button>
              <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full border border-gray-300 hover:bg-gray-200 transition-colors font-normal text-sm">
                Pricing & Plans
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="relative bg-blue-50/50 border border-blue-100 rounded-2xl p-8 hover:shadow-lg transition-all duration-300 hover:border-blue-200"
              >
                {/* Badge */}
                {feature.badge && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-orange-500 text-white text-xs font-normal px-3 py-1 rounded-full">
                      {feature.badge}
                    </span>
                  </div>
                )}

                {/* Category Badge */}
                <div className="mb-6">
                  {/*
                    The outline provided does not specify which category each feature belongs to.
                    Keeping a generic "AI Powered Features" badge for all, or making it dynamic,
                    would require more information. For now, it remains hardcoded as per the original structure.
                    If feature objects were to include a 'category' field, this could be made dynamic.
                  */}
                  <span className="bg-gray-100 text-gray-700 text-xs font-normal px-3 py-1 rounded-full">
                    AI Powered Features
                  </span>
                </div>

                {/* Icon */}
                <div className="mb-6">
                  {feature.icon}
                </div>

                {/* Content */}
                <h3 className="text-xl font-normal text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed font-light">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-blue-500 to-purple-500 py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-8 leading-tight">
            Ready to transform your
            <br />
            product marketing?
          </h2>
          <p className="text-xl text-black/80 max-w-2xl mx-auto mb-8 font-light">
            Join thousands of businesses already creating viral videos with Viduto
          </p>
           <Button
            onClick={handleAuthRequired} // Use handleAuthRequired here
            size="lg" className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-full font-normal hover:bg-gray-800 transform hover:scale-105 transition-all duration-200 shadow-lg">
            Start creating videos
            <ArrowRight size={20} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <MobileMenu 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        user={user} 
        handleAuthRequired={handleAuthRequired} 
      />
    </div>
  );
}
