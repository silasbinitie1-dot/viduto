
import React from 'react';
import { Button } from "@/components/ui/button";

export const ProductShowcaseSection = ({ onAuthRequired }) => {
  return (
    <>
      <section className="bg-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* Title and subtitle */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-light text-gray-900 mb-4">Introducing the first "Vibe Clipping" app

            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-light">
              Describe your vision, upload your product picture, get ready to post video.
            </p>
          </div>

          {/* Highlighted content block */}
          <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/10 rounded-3xl shadow-xl p-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              {/* Right column - Floating product demo (shown first on mobile) */}
              <div className="flex-1 relative order-1 lg:order-2">
                <div className="relative">
                  {/* Main product demo image */}
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                    <img
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/7f7b45434_tEsRrMtY4i5elqlBe_AsS.jpg"
                      alt="Viduto dashboard interface demonstration"
                      className="w-full h-auto object-cover" />

                  </div>
                  
                  {/* Floating accent elements */}
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse delay-1000"></div>
                </div>
              </div>

              {/* Left column - Text content (shown second on mobile) */}
              <div className="flex-1 lg:max-w-xl order-2 lg:order-1">
                <h3 className="text-3xl lg:text-4xl font-light text-gray-900 mb-6 leading-tight">
                  Create at the speed
                  <br />
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    of thought
                  </span>
                </h3>
                
                <p className="text-base text-gray-600 mb-8 leading-relaxed font-light">
                  Tell Viduto your idea, and watch it transform into a working video—complete with all the necessary 
                  scenes, transitions, voiceover and background music.
                </p>
                
                <Button
                  onClick={onAuthRequired}
                  className="bg-black text-white px-6 py-3 rounded-full font-normal hover:bg-gray-800 transform hover:scale-105 transition-all duration-200 shadow-lg">

                  Start creating
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Second section - reversed layout */}
      <section className="bg-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* Highlighted content block */}
          <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/10 rounded-3xl shadow-xl p-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              {/* Left column - Floating product demo (shown first on mobile and desktop) */}
              <div className="flex-1 relative order-1">
                <div className="relative">
                  {/* Main product demo image */}
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                    <img
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/211d90d64_VAFYo1QHQprUixeRsaddV.jpg"
                      alt="Product demonstration interface"
                      className="w-full h-auto object-cover" />

                  </div>
                  
                  {/* Floating accent elements */}
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse delay-1000"></div>
                </div>
              </div>

              {/* Right column - Text content (shown second on mobile and desktop) */}
              <div className="flex-1 lg:max-w-xl order-2">
                <h3 className="text-3xl lg:text-4xl font-light text-gray-900 mb-6 leading-tight">
                  Fully automated <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">data-backed workflow</span> for viral videos.
                </h3>
                
                <p className="text-base text-gray-600 mb-8 leading-relaxed font-light">
                  Just describe your video and let our AI Agent genereate script, scenes with your product, voiceover, background music, subtitles and send you ready to publish short-form videos.
                </p>
                
                 <Button
                  onClick={onAuthRequired}
                  className="bg-black text-white px-6 py-3 rounded-full font-normal hover:bg-gray-800 transform hover:scale-105 transition-all duration-200 shadow-lg">

                  Start creating
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Third section - original layout (text left, image right) */}
      <section className="bg-white py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {/* Highlighted content block */}
          <div className="bg-blue-500/10 backdrop-blur-md border border-blue-500/10 rounded-3xl shadow-xl p-10">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
              {/* Left column - Text content (shown first on mobile and desktop) */}
              <div className="flex-1 lg:max-w-xl order-2 lg:order-1">
                <h3 className="text-3xl lg:text-4xl font-light text-gray-900 mb-6 leading-tight">
                  Original AI generated scenes with <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">your original product</span>.
                </h3>
                
                <p className="text-base text-gray-600 mb-8 leading-relaxed font-light">
                  We don't just create videos, every video is combined with original scenes generated by AI that shows your product in every frame, consistent and true to reality.
                </p>
                
                 <Button
                  onClick={onAuthRequired}
                  className="bg-black text-white px-6 py-3 rounded-full font-normal hover:bg-gray-800 transform hover:scale-105 transition-all duration-200 shadow-lg">

                  Start creating
                </Button>
              </div>

              {/* Right column - Floating product demo (shown second on mobile and desktop) */}
              <div className="flex-1 relative order-1 lg:order-2">
                <div className="relative">
                  {/* Main product demo image */}
                  <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
                    <img
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/4857b8c90_1stillustraion.jpg"
                      alt="AI generated product scenes interface"
                      className="w-full h-auto object-cover" />

                  </div>
                  
                  {/* Floating accent elements */}
                  <div className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full animate-pulse"></div>
                  <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse delay-1000"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>);

};