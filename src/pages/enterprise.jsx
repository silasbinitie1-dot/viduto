
import React, { useState, useEffect } from 'react';
import { ArrowRight, Shield, Users, GitBranch, Share2, CheckCircle, Building, Clock, Video, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { CtaSection } from '../components/CtaSection';
import { Button } from '@/components/ui/button';
import { User } from '@/entities/User';
import { AuthModal } from '../components/AuthModal';
import { MobileMenu } from '../components/MobileMenu';

export default function EnterprisePage() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (e) {
        setUser(null); // Ensure user is null if an error occurs (e.g., not logged in)
      }
    };
    checkUser();
  }, []); // Run once on component mount to check user status

  const handleContactSales = () => {
    window.location.href = 'mailto:sales@viduto.com?subject=Enterprise Inquiry';
  };

  const handleAuthRequired = () => {
    if (!user) {
      setShowAuthModal(true); // Show AuthModal if user is not logged in
    } else {
      navigate('/dashboard'); // Navigate to dashboard if user is logged in
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="max-w-5xl mx-2 md:mx-auto p-2 px-4 mt-2 bg-white/70 backdrop-blur-md rounded-xl flex items-center justify-between shadow-sm">
          <Link to="/home" className="flex items-center gap-2">
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a552913_vidutonobg.png" alt="Viduto Logo" className="w-8 h-8" />
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
                onClick={handleContactSales}
                className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200"
              >
                Contact Sales
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
                onClick={handleContactSales}
                className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200"
              >
                Contact Sales
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
              className="ml-2"
            >
              <Menu className="h-6 w-6 text-gray-700" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-orange-500/20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <div className="mb-4">
            <span className="bg-gray-100 text-gray-700 text-sm font-normal px-4 py-2 rounded-full">
              ENTERPRISE SOLUTIONS
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-light text-gray-900 mb-6 leading-tight">
            Ideas shouldn't wait for production.
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-8 font-light">
            Viduto empowers large teams and agencies to rapidly create, manage, and scale professional video content for all your marketing needs.
          </p>
          <Button
            onClick={handleContactSales}
            size="lg"
            className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-full font-normal hover:bg-orange-500/90 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Contact Sales
            <ArrowRight size={20} />
          </Button>
        </div>
      </section>

      {/* Scale your video content production */}
      <section className="bg-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/10 rounded-3xl shadow-xl p-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              {/* Left column - Text content */}
              <div className="flex-1 lg:max-w-xl order-2 lg:order-1">
                <h3 className="text-3xl lg:text-4xl font-light text-gray-900 mb-6 leading-tight">
                  Scale your video content production
                </h3>
                
                <div className="space-y-4 mb-8">
                  <div>
                    <h4 className="text-lg font-normal text-gray-900 mb-2">Empower your marketing teams</h4>
                    <p className="text-gray-600 leading-relaxed font-light">
                      Give every team member the power to create professional videos without technical expertise or expensive software.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-normal text-gray-900 mb-2">Accelerate campaign delivery</h4>
                    <p className="text-gray-600 leading-relaxed font-light">
                      Reduce video production time from weeks to minutes, enabling rapid testing and iteration of marketing campaigns.
                    </p>
                  </div>
                </div>
                
                <Button 
                  onClick={handleContactSales}
                  className="bg-orange-500 text-white px-6 py-3 rounded-full font-normal hover:bg-orange-500/90 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  Contact Sales
                </Button>
              </div>

              {/* Right column - Image */}
              <div className="flex-1 relative order-1 lg:order-2">
                <div className="relative">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                    <img 
                      src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800"
                      alt="Team collaboration on video projects"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                  
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse delay-1000"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise-grade security and control */}
      <section className="bg-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/10 rounded-3xl shadow-xl p-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              {/* Left column - Image */}
              <div className="flex-1 relative order-1">
                <div className="relative">
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                    <img 
                      src="https://images.pexels.com/photos/5380664/pexels-photo-5380664.jpeg?auto=compress&cs=tinysrgb&w=800"
                      alt="Enterprise security dashboard"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                  
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse delay-1000"></div>
                </div>
              </div>

              {/* Right column - Text content */}
              <div className="flex-1 lg:max-w-xl order-2">
                <h3 className="text-3xl lg:text-4xl font-light text-gray-900 mb-6 leading-tight">
                  Enterprise-grade security and control
                </h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-lg font-normal text-gray-900 mb-1">Secure asset management</h4>
                      <p className="text-gray-600 font-light">All your product images and generated videos are stored with enterprise-grade encryption and access controls.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-lg font-normal text-gray-900 mb-1">Centralized user management</h4>
                      <p className="text-gray-600 font-light">Manage team access, permissions, and usage analytics from a single admin dashboard.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="text-lg font-normal text-gray-900 mb-1">Dedicated support</h4>
                      <p className="text-gray-600 font-light">Get priority support with dedicated account management and custom training for your team.</p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleContactSales}
                  className="bg-orange-500 text-white px-6 py-3 rounded-full font-normal hover:bg-orange-500/90 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  Contact Sales
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collaborate seamlessly section */}
      <section className="bg-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 leading-tight">
              Collaborate seamlessly on video projects
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              Streamline your video creation workflow from concept to final delivery with powerful team features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Version History */}
            <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/10 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm">
                <GitBranch className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-4 text-center">
                Full version history
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-center">
                Track every iteration and revision of your videos with complete version control and rollback capabilities.
              </p>
            </div>

            {/* Shared Workspaces */}
            <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/10 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Share2 className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-4 text-center">
                Shared project workspaces
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-center">
                Centralize video projects for collaborative work with real-time updates and clear stakeholder visibility.
              </p>
            </div>

            {/* Custom Workflows */}
            <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/10 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mx-auto mb-6 shadow-sm">
                <CheckCircle className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-4 text-center">
                Custom approval workflows
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-center">
                Define clear approval paths to guide video projects from initial concept through QA to final production.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Button
              onClick={handleContactSales}
              size="lg"
              className="bg-orange-500 text-white px-8 py-4 rounded-full font-normal hover:bg-orange-500/90 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              Talk to Sales
            </Button>
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="bg-gray-50 py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 leading-tight">
              Built for enterprise scale
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              Everything you need to manage video creation across large teams and multiple brands.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Users className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-4 text-center">
                Team Management
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-center">
                Manage unlimited team members with role-based permissions and usage analytics.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Shield className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-4 text-center">
                Advanced Security
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-center">
                SOC 2 compliance, SSO integration, and enterprise-grade data protection.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Building className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-4 text-center">
                Brand Consistency
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-center">
                Maintain brand guidelines across all videos with custom templates and style presets.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Clock className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-4 text-center">
                Priority Processing
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-center">
                Get your videos generated faster with dedicated processing resources and priority queues.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-6">
                <Video className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-4 text-center">
                Bulk Operations
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-center">
                Generate multiple videos simultaneously and manage large-scale video campaigns efficiently.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-6">
                <ArrowRight className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-4 text-center">
                API Integration
              </h3>
              <p className="text-gray-600 leading-relaxed font-light text-center">
                Integrate Viduto into your existing workflows with our comprehensive REST API and webhooks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-6 leading-tight">
            Enterprise pricing
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-12 font-light">
            Custom solutions tailored to your organization's needs and scale.
          </p>

          <div className="max-w-2xl mx-auto">
            <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/10 rounded-3xl p-8 shadow-xl">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-normal text-gray-900 mb-4">
                  Custom Enterprise Plan
                </h3>
                <p className="text-gray-600 font-light mb-6">
                  Designed for organizations with high-volume video needs and specific requirements.
                </p>
                
                <div className="space-y-3 text-left mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <span className="text-gray-600 font-light">Unlimited video generations</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <span className="text-gray-600 font-light">Unlimited team members</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <span className="text-gray-600 font-light">Priority processing and support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <span className="text-gray-600 font-light">Custom integrations and API access</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <span className="text-gray-600 font-light">Dedicated account manager</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                    <span className="text-gray-600 font-light">SLA guarantees and uptime commitments</span>
                  </div>
                </div>

                <Button
                  onClick={handleContactSales}
                  size="lg"
                  className="w-full bg-orange-500 text-white font-normal py-4 rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
                >
                  Contact Sales for Pricing
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <CtaSection onAuthRequired={handleAuthRequired} />

      {/* Footer */}
      <Footer />
      {/* AuthModal component controlled by showAuthModal state */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      {/* MobileMenu component controlled by isMobileMenuOpen state */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} user={user} handleAuthRequired={handleAuthRequired} />
    </div>
  );
}
