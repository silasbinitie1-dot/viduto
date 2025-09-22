
import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqsData = [
  {
    question: "Do I need video editing experience?",
    answer: "No. Upload your product image and describe your idea—our AI handles scripting, scenes, voiceover, and music."
  },
  {
    question: "How long does a video take to generate?",
    answer: "About 10 minutes depending on complexity."
  },
  {
    question: "How much does a revision cost?",
    answer: "Each revision costs 2.5 credits."
  },
  {
    question: "What's included for free?",
    answer: "New users get 20 free credits to try Viduto with full access to all features."
  },
  {
    question: "Can I use my own branding?",
    answer: "Yes, our AI analyzes your product image and creates videos that match your brand aesthetic."
  },
  {
    question: "What video formats do you support?",
    answer: "We create 30-second videos optimized for social media (Instagram, TikTok, Facebook, etc.) in vertical format."
  }
];

const FaqItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 last:border-b-0 py-6">
      <button
        className="flex justify-between items-center w-full text-left text-lg font-light text-gray-900 hover:text-blue-600 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="pr-4">{question}</span>
        <div className="flex-shrink-0">
          {isOpen ? (
            <Minus size={20} className="text-gray-900" />
          ) : (
            <Plus size={20} className="text-gray-900" />
          )}
        </div>
      </button>
      
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <p className="mt-4 text-gray-700 leading-relaxed font-light">
          {answer}
        </p>
      </div>
    </div>
  );
};

export function FaqsSection() {
  return (
    <section className="bg-white py-20 relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 font-light">
            Everything you need to know about Viduto
          </p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-8">
          {faqsData.map((faq, index) => (
            <FaqItem key={index} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}
