import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Button } from '@/components/ui/button';
import { User } from '@/api/entities';
import { AuthModal } from '../components/AuthModal';
import { MobileMenu } from '../components/MobileMenu';

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-600 font-light">
              Effective Date: September 4, 2025
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Welcome to Viduto.com, operated by Viduto LLC ("we," "our," "us," or "Company"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and video platform services at viduto.com ("Service").
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                By using Viduto.com, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with the terms of this policy, please do not access or use the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-normal text-gray-900 mb-3">2.1 Information You Provide Directly</h3>
              <p className="text-gray-700 leading-relaxed mb-2"><strong>Account Information:</strong></p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-1">
                <li>Full name</li>
                <li>Email address</li>
                <li>Username</li>
                <li>Password (encrypted using industry-standard methods)</li>
                <li>Profile picture (optional)</li>
                <li>Phone number (optional)</li>
                <li>Company/organization name (for business accounts)</li>
                <li>Billing address (for paid subscriptions)</li>
              </ul>

              <p className="text-gray-700 leading-relaxed mb-2"><strong>Content and Activity:</strong></p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-1">
                <li>Videos, images, and files you upload</li>
                <li>Video titles, descriptions, and tags</li>
                <li>Comments and messages</li>
                <li>Playlists and collections you create</li>
                <li>Viewing history and preferences</li>
                <li>Feedback, support requests, and correspondence with us</li>
              </ul>

              <h3 className="text-xl font-normal text-gray-900 mb-3">2.2 Information Collected Automatically</h3>
              <p className="text-gray-700 leading-relaxed mb-2"><strong>Technical Information:</strong></p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-1">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Device type, model, and operating system</li>
                <li>Screen resolution</li>
                <li>Time zone setting and location</li>
                <li>Unique device identifiers</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 leading-relaxed mb-2">We use collected information for the following purposes:</p>
              
              <h3 className="text-xl font-normal text-gray-900 mb-3">3.1 Service Provision and Management</h3>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-2">
                <li>Creating and managing your account</li>
                <li>Providing video hosting, streaming, and processing services</li>
                <li>Enabling video sharing and collaboration features</li>
                <li>Processing transactions and managing subscriptions</li>
                <li>Providing customer support and responding to inquiries</li>
                <li>Sending service-related notifications and updates</li>
              </ul>

              <h3 className="text-xl font-normal text-gray-900 mb-3">3.2 Service Improvement and Development</h3>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-2">
                <li>Analyzing usage patterns and trends</li>
                <li>Developing new features and functionality</li>
                <li>Optimizing video delivery and streaming performance</li>
                <li>Troubleshooting technical issues</li>
                <li>Conducting research and analysis</li>
                <li>Personalizing user experience</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share your information in the following circumstances:
              </p>

              <h3 className="text-xl font-normal text-gray-900 mb-3">4.1 Service Providers</h3>
              <p className="text-gray-700 leading-relaxed mb-2">We share information with third-party vendors who perform services on our behalf:</p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-1">
                <li>Cloud hosting and content delivery networks (CDN)</li>
                <li>Payment processors (Stripe, PayPal, etc.)</li>
                <li>Email delivery services</li>
                <li>Analytics providers</li>
                <li>Customer support tools</li>
                <li>Security and fraud prevention services</li>
              </ul>

              <h3 className="text-xl font-normal text-gray-900 mb-3">4.2 Legal Requirements and Protection</h3>
              <p className="text-gray-700 leading-relaxed mb-2">We may disclose information when we believe it is necessary to:</p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-1">
                <li>Comply with applicable laws, regulations, or legal processes</li>
                <li>Respond to lawful requests from public authorities</li>
                <li>Protect our rights, property, or safety</li>
                <li>Protect the rights, property, or safety of users or the public</li>
                <li>Investigate and prevent fraud or security issues</li>
                <li>Enforce our Terms of Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement comprehensive security measures to protect your personal information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-2">
                <li><strong>Encryption:</strong> SSL/TLS encryption for data in transit; AES encryption for sensitive data at rest</li>
                <li><strong>Access Controls:</strong> Role-based access controls and multi-factor authentication for internal systems</li>
                <li><strong>Infrastructure Security:</strong> Secure data centers, firewalls, and intrusion detection systems</li>
                <li><strong>Regular Audits:</strong> Security assessments and vulnerability testing</li>
                <li><strong>Employee Training:</strong> Regular security awareness training for all employees</li>
                <li><strong>Incident Response:</strong> Established procedures for security incident management</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                While we strive to protect your information, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">6. Your Rights and Choices</h2>
              
              <h3 className="text-xl font-normal text-gray-900 mb-3">6.1 Access and Portability</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You can access your personal information through your account settings and request a copy of your data in a portable format.
              </p>

              <h3 className="text-xl font-normal text-gray-900 mb-3">6.2 Correction and Update</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You can update your account information at any time through your profile settings or by contacting support.
              </p>

              <h3 className="text-xl font-normal text-gray-900 mb-3">6.3 Deletion</h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You can request deletion of your account and personal data by contacting privacy@viduto.com. Some information may be retained as required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">7. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we discover that we have collected information from a child under 13, we will promptly delete it.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                Parents or guardians who believe their child has provided us with personal information should contact us at privacy@viduto.com.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">8. Changes to This Privacy Policy</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Privacy Policy periodically to reflect changes in our practices, technology, legal requirements, or business operations. We will notify you of material changes by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 leading-relaxed mb-4 space-y-1">
                <li>Posting the updated Privacy Policy with a new "Effective Date"</li>
                <li>Sending an email notification to registered users</li>
                <li>Displaying a prominent notice on the Service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-normal text-gray-900 mb-4">9. Contact Information</h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 font-medium">Viduto LLC</p>
                <p className="text-gray-700">Email: support@viduto.com</p>
                <p className="text-gray-700">State of Incorporation: Florida, USA</p>
                <p className="text-gray-700">Response Time: We aim to respond to privacy inquiries within 30 days.</p>
              </div>
            </section>

            <div className="text-center text-gray-600 text-sm mt-12">
              <p>Last Updated: September 4, 2025</p>
              <p>Version: 1.0</p>
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