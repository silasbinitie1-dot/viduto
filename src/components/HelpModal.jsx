
import React from 'react';
import { X, MessageCircle, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from "@/components/Logo";

export function HelpModal({ isOpen, onClose, user, darkMode = false }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fadeIn" 
      onClick={onClose}
    >
      <div 
        className={`max-w-md w-full relative shadow-2xl border transform transition-transform duration-300 animate-scaleIn rounded-2xl p-6 ${
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
        
        <div className="text-center mb-6">
          <Logo size={28} className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-4" />
          <h2 className={`text-2xl font-light mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Need Help?
          </h2>
          <p className={`font-light text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            We're here to help you create amazing videos
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="https://discord.gg/MdBr54xe"
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 border rounded-xl font-normal transition-colors duration-200 ${
              darkMode
                ? 'bg-[#5865F2] border-[#5865F2] text-white hover:bg-[#4752C4]'
                : 'bg-[#5865F2] border-[#5865F2] text-white hover:bg-[#4752C4]'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-base">Join Discord Community</span>
          </a>

          <a
            href="mailto:support@viduto.com"
            className={`w-full flex items-center justify-center gap-3 px-6 py-4 border rounded-xl font-normal transition-colors duration-200 ${
              darkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
            }`}
          >
            <Mail className="w-5 h-5" />
            <span className="text-base">Email Support</span>
          </a>
        </div>

        <div className={`mt-6 pt-4 border-t text-center ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-sm font-light ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Logged in as: <span className={`font-normal ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{user?.email}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
