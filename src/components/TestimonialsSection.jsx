
import React from 'react';
import { Button } from "@/components/ui/button";

const testimonials = [
  { id: 1, quote: "This is no doubt the only video tool a product-based business need. Amazing results every time!", name: "Sarah M.", role: "e-Commerce entrepreneur", avatar: "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 2, quote: "I just canceled 6 subscriptions thanks to Viduto.com. This tool replaced everything I was using before.", name: "David K.", role: "Agency owner", avatar: "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 3, quote: "I can't believe I paid thousands for agencies and waited 6 weeks for ads. Viduto delivers in minutes!", name: "Emma R.", role: "e-Commerce marketer", avatar: "https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 4, quote: "My e-com campaigns just took off thanks to Viduto. So easy to A/B test creatives now!", name: "Michael T.", role: "e-Commerce entrepreneur", avatar: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 5, quote: "Finally a video tool that uses my actual product and not generic AI stock footage. Game changer!", name: "Jessica L.", role: "Video editor", avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 6, quote: "It's like Lovable but for marketing videos. The AI understands exactly what I need every time.", name: "Alex P.", role: "e-Commerce marketer", avatar: "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 7, quote: "Viduto saved me thousands on video production while delivering better results than agencies.", name: "Rachel W.", role: "Agency owner", avatar: "https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 8, quote: "The quality is incredible and the speed is unmatched. Complete game changer for my business.", name: "James H.", role: "e-Commerce entrepreneur", avatar: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 9, quote: "From product photo to viral video in minutes. This is definitely the future of marketing.", name: "Lisa C.", role: "Video editor", avatar: "https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 10, quote: "My conversion rates doubled after switching to Viduto-generated videos. ROI is incredible!", name: "Ryan B.", role: "e-Commerce marketer", avatar: "https://images.pexels.com/photos/1212984/pexels-photo-1212984.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 11, quote: "We handle 50+ clients and Viduto scales perfectly. No more waiting weeks for video deliverables!", name: "Marcus D.", role: "Agency owner", avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 12, quote: "As a video editor, I'm amazed by the quality. It's like having a full production team in one tool.", name: "Sofia K.", role: "Video editor", avatar: "https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 13, quote: "Viduto turned my struggling dropshipping store into a 6-figure business. The videos sell themselves!", name: "Carlos M.", role: "e-Commerce entrepreneur", avatar: "https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 14, quote: "Our Facebook ads CTR increased by 340% after switching to Viduto videos. Best marketing investment ever!", name: "Amanda S.", role: "e-Commerce marketer", avatar: "https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
  { id: 15, quote: "I edit videos for 20+ brands and Viduto's output quality rivals $10k productions. Absolutely mind-blowing!", name: "Tyler J.", role: "Video editor", avatar: "https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" },
];

export const TestimonialsSection = ({ onAuthRequired }) => {
  const row1Testimonials = [...testimonials.slice(0, 8), ...testimonials.slice(0, 8)];
  const row2Testimonials = [...testimonials.slice(8, 15), ...testimonials.slice(8, 15)];

  const truncateText = (text, maxLength = 120) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <section className="bg-gradient-to-br from-blue-100 via-purple-100 to-orange-100 py-20 relative overflow-hidden">
      <style>{`
        @keyframes scroll-infinite {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes scroll-infinite-reverse {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
        .animate-scroll-infinite {
          animation: scroll-infinite var(--scroll-duration, 40s) linear infinite;
        }
        .animate-scroll-infinite-reverse {
          animation: scroll-infinite-reverse var(--scroll-duration, 40s) linear infinite;
        }
        .scrolling-wrapper:hover .animate-scroll-infinite,
        .scrolling-wrapper:hover .animate-scroll-infinite-reverse {
          animation-play-state: paused;
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-4 leading-tight">
            "Viduto just killed every video generation tool"
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light">
            They call us the only video tool your product-based business need.
          </p>
        </div>

        <div className="space-y-6 scrolling-wrapper">
          <div className="overflow-hidden">
            <div 
              className="flex gap-6 animate-scroll-infinite min-w-max"
              style={{ '--scroll-duration': '90s' }}
            >
              {row1Testimonials.map((testimonial, index) => (
                <div
                  key={`row1-${testimonial.id}-${index}`}
                  className="bg-white/90 backdrop-blur-sm border border-white/40 rounded-2xl p-6 shadow-xl w-80 h-52 flex-shrink-0 flex flex-col"
                >
                  <blockquote className="text-gray-800 text-sm mb-4 leading-relaxed font-light break-words flex-1 overflow-hidden">
                    "{truncateText(testimonial.quote)}"
                  </blockquote>
                  <div className="flex items-center gap-3 mt-auto">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                    />
                    <div>
                      <p className="font-normal text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-600 font-light">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-hidden">
             <div 
              className="flex gap-6 animate-scroll-infinite-reverse min-w-max"
              style={{ '--scroll-duration': '83s' }}
            >
              {row2Testimonials.map((testimonial, index) => (
                <div
                  key={`row2-${testimonial.id}-${index}`}
                  className="bg-white/90 backdrop-blur-sm border border-white/40 rounded-2xl p-6 shadow-xl w-80 h-52 flex-shrink-0 flex flex-col"
                >
                  <blockquote className="text-gray-800 text-sm mb-4 leading-relaxed font-light break-words flex-1 overflow-hidden">
                    "{truncateText(testimonial.quote)}"
                  </blockquote>
                  <div className="flex items-center gap-3 mt-auto">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-md"
                    />
                    <div>
                      <p className="font-normal text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-600 font-light">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-16">
          <Button 
            onClick={onAuthRequired}
            className="bg-black text-white px-8 py-4 rounded-full font-normal hover:bg-gray-800 transform hover:scale-105 transition-all duration-200 shadow-lg">
            Join thousands of happy customers
          </Button>
        </div>
      </div>
    </section>
  );
};
