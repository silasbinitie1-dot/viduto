
import React from 'react';
import { Link } from 'react-router-dom';
import Logo from "@/components/Logo";

export const Footer = () => {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="bg-gray-900 text-gray-400 py-12">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Logo size={24} className="w-6 h-6" />
                            <h3 className="font-normal text-white">Viduto</h3>
                        </div>
                        <p className="text-sm font-light">Transform your product images into viral video ads with AI-powered creation tools</p>
                    </div>
                    <div>
                        <h3 className="font-normal text-white mb-4">Product</h3>
                        <ul className="space-y-2 text-sm font-light">
                            <li><Link to="/features" onClick={scrollToTop} className="hover:text-white">Features</Link></li>
                            <li><Link to="/pricing" onClick={scrollToTop} className="hover:text-white">Pricing</Link></li>
                            <li><Link to="/blog" onClick={scrollToTop} className="hover:text-white">Blog</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-normal text-white mb-4">Support</h3>
                        <ul className="space-y-2 text-sm font-light">
                            <li><a href="mailto:support@viduto.com" className="hover:text-white">support@viduto.com</a></li>
                        </ul>
                    </div>
                     <div>
                        <h3 className="font-normal text-white mb-4">Legal</h3>
                        <ul className="space-y-2 text-sm font-light">
                            <li><Link to="/terms" onClick={scrollToTop} className="hover:text-white">Terms of Service</Link></li>
                            <li><Link to="/privacy" onClick={scrollToTop} className="hover:text-white">Privacy Policy</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
                    <p className="font-light">&copy; {new Date().getFullYear()} Viduto. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};
