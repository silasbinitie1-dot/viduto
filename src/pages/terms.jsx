import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Button } from '@/components/ui/button';
import { User } from '@/api/entities';
import { AuthModal } from '../components/AuthModal';
import { MobileMenu } from '../components/MobileMenu';

export default function TermsPage() {
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
        setUser(null);
      }
    };
    checkUser();
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
            <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b4aa46f5d6326ab93c3ed0/17cb8e7bc_vidutonobg.png" alt="Viduto Logo" className="w-8 h-8" />
            <span className="text-2xl font-light text-gray-900 tracking-tight hover:text-gray-700 transition-colors">
              Viduto
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-4">
            <Link to="/features" className="text-gray-700 hover:text-black transition-colors font-normal">Features</Link>
            <a href="https://discord.gg/MdBr54xe" target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-black transition-colors font-normal">Community</a>
            <Link to="/pricing" className="text-gray-700 hover:text-black transition-colors font-normal">Pricing</Link>
            <Link to="/enterprise" className="text-gray-700 hover:text-black transition-colors font-normal">Enterprise</Link>
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
            <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">
              Terms of Service
            </h1>
            <p className="text-xl text-gray-600 font-light">
              Effective Date: September 4, 2025
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                By accessing or using Viduto.com ("the Service"), operated by Viduto LLC ("Company," "we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">2. Description of Service</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Viduto.com provides a video platform that enables users to upload, share, process, and manage video content. We offer tools for video hosting, streaming, editing, and collaboration. We reserve the right to modify, suspend, or discontinue the Service at any time without notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">3. User Registration</h2>
              <h3 className="text-xl font-normal text-gray-900 mb-3">3.1 Account Creation</h3>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-2">
                <li>You must provide accurate, complete, and current information during registration</li>
                <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                <li>You must be at least 13 years old to use the Service</li>
                <li>You are responsible for all activities that occur under your account</li>
                <li>You agree to notify us immediately of any unauthorized use of your account</li>
              </ul>
              <h3 className="text-xl font-normal text-gray-900 mb-3">3.2 Account Termination</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent or illegal activities, or remain inactive for extended periods.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">4. User Content</h2>
              <h3 className="text-xl font-normal text-gray-900 mb-3">4.1 Content Ownership</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You retain all ownership rights to content you upload to Viduto.com. By uploading content, you grant Viduto LLC a worldwide, non-exclusive, royalty-free, transferable license to use, reproduce, modify, adapt, publish, translate, distribute, and display your content solely for the purpose of operating, promoting, and improving the Service.
              </p>
              
              <h3 className="text-xl font-normal text-gray-900 mb-3">4.2 Prohibited Content</h3>
              <p className="text-gray-700 leading-relaxed mb-2">You agree not to upload, post, or transmit content that:</p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-2">
                <li>Infringes on intellectual property rights, including copyrights, trademarks, or patents</li>
                <li>Contains illegal, harmful, threatening, abusive, defamatory, or offensive material</li>
                <li>Violates the privacy rights or publicity rights of any person</li>
                <li>Contains malware, viruses, or other harmful code</li>
                <li>Promotes illegal activities or violence</li>
                <li>Is false, misleading, or deceptive</li>
                <li>Constitutes spam or unauthorized advertising</li>
                <li>Violates any applicable laws or regulations</li>
              </ul>

              <h3 className="text-xl font-normal text-gray-900 mb-3">4.3 Content Removal</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to remove, disable access to, or refuse to display any content that violates these Terms or is otherwise objectionable, without prior notice and at our sole discretion.
              </p>

              <h3 className="text-xl font-normal text-gray-900 mb-3">4.4 Copyright Policy</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Viduto LLC respects intellectual property rights and expects users to do the same. We will respond to notices of alleged copyright infringement that comply with the Digital Millennium Copyright Act (DMCA).
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">5. Payment Terms</h2>
              <h3 className="text-xl font-normal text-gray-900 mb-3">5.1 Subscription Plans</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Viduto LLC offers various subscription plans with different features and storage limits. Prices and features are subject to change with 30 days' notice to existing subscribers.
              </p>

              <h3 className="text-xl font-normal text-gray-900 mb-3">5.2 Billing and Payment</h3>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-2">
                <li>All payments are processed securely through third-party payment processors</li>
                <li>Subscription fees are billed in advance on a monthly or annual basis</li>
                <li>All fees are non-refundable except as required by law</li>
                <li>You are responsible for all taxes associated with your use of the Service</li>
              </ul>

              <h3 className="text-xl font-normal text-gray-900 mb-3">5.3 Auto-Renewal</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Subscriptions automatically renew at the end of each billing period unless cancelled at least 24 hours before renewal.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">6. Disclaimers</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">7. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL VIDUTO LLC, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">8. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">9. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For questions about these Terms of Service, please contact us at:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 font-medium">Viduto LLC</p>
                <p className="text-gray-700">Email: support@viduto.com</p>
                <p className="text-gray-700">State of Incorporation: Florida, USA</p>
              </div>
            </section>

            <div className="text-center text-gray-600 text-sm mt-12">
              <p>Last Updated: September 4, 2025</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </div>
  );
}