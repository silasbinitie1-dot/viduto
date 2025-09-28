
import React, { useState, useEffect, useRef } from 'react';
import { Menu, Clock, Building, Check, X, Camera, Wand2, Edit, Upload, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { AuthModal } from '../components/AuthModal';
import { MobileMenu } from '../components/MobileMenu';
import { ProductShowcaseSection } from '../components/ProductShowcaseSection';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { FaqsSection } from '../components/FaqsSection';
import { CtaSection } from '../components/CtaSection';
import { Footer } from '../components/Footer';
import { sendFacebookConversionEvent } from '@/api/functions';
import { toast } from 'sonner';

// Helper function to convert file to base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

export default function Home() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  // Calculate videos created today based on time
  const getVideosCreatedToday = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Start from 127 at midnight, add ~15 videos per hour + some variation based on minutes
    const baseCount = 127;
    const hourlyIncrease = hours * 15;
    const minuteVariation = Math.floor(minutes / 10) * 2; // Add 2 every 10 minutes

    return baseCount + hourlyIncrease + minuteVariation;
  };

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

    // Track ViewContent event for homepage
    if (window.fbq) {
      window.fbq('track', 'ViewContent', {
        content_name: 'Homepage',
        content_category: 'landing_page'
      });
    }

    // Load pending data from sessionStorage on component mount
    const pendingChatData = sessionStorage.getItem('pendingChatData');
    if (pendingChatData) {
      try {
        const data = JSON.parse(pendingChatData);
        setPrompt(data.prompt || '');
        if (data.fileBase64 && data.fileName && data.fileType) {
          // Reconstruct File object from base64 string
          const byteCharacters = atob(data.fileBase64.split(',')[1]);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: data.fileType });
          const file = new File([blob], data.fileName, { type: data.fileType, lastModified: data.lastModified });
          setSelectedFile(file);
        }
      } catch (error) {
        console.error("Error parsing or restoring pending chat data:", error);
        sessionStorage.removeItem('pendingChatData');
      }
    }
  }, []);

  const examplePrompts = [
  `My product is Nike-style running shoes with really good cushioning, super lightweight. My target audience are people who run or go to the gym regularly, like 25-45 year olds. My goal is to get them pumped up to hit their fitness goals and want to buy these shoes. My style is modern. My preferred colors are bright colors that pop, maybe blue and orange.`,
  `My product is a beautiful diamond necklace, perfect for anniversaries or special nights out. My target audience are women buying for themselves or men buying gifts, around 30-50. My goal is to make them feel absolutely gorgeous and worth it. My style is luxury. My preferred colors are sparkly silver with soft romantic lighting.`,
  `My product is high-quality vitamin D pills that actually work for boosting immunity. My target audience are health-focused people who care about what they put in their bodies, 35-65. My goal is to make them feel good about making a smart health choice they can trust. My style is minimalist. My preferred colors are clean whites and natural greens, nothing flashy.`,
  `My product is an epic mechanical gaming keyboard with crazy RGB lights and smooth keys. My target audience are serious gamers and PC builders, mostly teens to 30s. My goal is to get them hyped about upgrading their gaming setup. My style is bold. My preferred colors are rainbow RGB effects with sleek black.`
  ];

  const examplePromptsPreview = [
  "Running Shoes",
  "Diamond Necklace",
  "Health Supplement",
  "Gaming Keyboard"
  ];


  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleButtonClick = () => {
    if (!prompt.trim()) {
      return;
    }
    if (!selectedFile) {
      fileInputRef.current.click();
    } else {
      handleSubmit(new Event('submit'));
    }
  };

  const handleExampleClick = (example) => {
    const index = examplePromptsPreview.indexOf(example);
    if (index !== -1 && index < examplePrompts.length) {
      setPrompt(examplePrompts[index]);

      if (window.fbq) {
        window.fbq('track', 'AddToCart', {
          content_name: example,
          content_category: 'prompt_template'
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile || !prompt.trim()) {
      toast.error('Please upload an image and describe your video.');
      return;
    }

    // Track Lead event for video creation intent
    if (window.fbq) {
      window.fbq('track', 'Lead', {
        content_name: 'Video Creation Intent',
        content_category: 'video_generation'
      });
    }

    setIsSubmitting(true);

    try {
      if (!user) {
        const fileBase64String = await fileToBase64(selectedFile);

        const pendingData = {
          prompt: prompt.trim(),
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileSize: selectedFile.size,
          lastModified: selectedFile.lastModified,
          fileBase64: fileBase64String,
          timestamp: Date.now()
        };
        sessionStorage.setItem('pendingChatData', JSON.stringify(pendingData));
        setShowAuthModal(true);
      } else {
        const { Chat, Message } = await import('@/api/entities');
        const { UploadFile } = await import('@/api/integrations');

        const newChat = await Chat.create({
          title: 'Creating brief...',
          status: 'draft',
          workflow_state: 'draft'
        });

        const { file_url } = await UploadFile({ file: selectedFile });

        await Message.create({
          chat_id: newChat.id,
          message_type: 'user',
          content: prompt.trim(),
          metadata: { image_url: file_url, is_initial_request: true }
        });

        sessionStorage.removeItem('pendingChatData');
        navigate(`/dashboard?chat=${newChat.id}`);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error('Failed to create video request. Please try again.');
      sessionStorage.removeItem('pendingChatData');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAuthRequired = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      navigate('/dashboard');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getButtonIcon = () => {
    if (!prompt.trim()) {
      return <Edit size={16} className="text-gray-600" />;
    } else if (!selectedFile) {
      return <Upload size={16} className="text-white" />;
    } else {
      return <Play size={16} className="text-white" />;
    }
  };

  const getButtonClass = () => {
    if (!prompt.trim()) {
      return 'w-10 h-10 bg-gray-100 border border-gray-300 rounded-xl hover:bg-gray-200 disabled:opacity-40 disabled:hover:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 flex items-center justify-center';
    } else if (!selectedFile) {
      return 'w-10 h-10 bg-black text-white rounded-xl hover:bg-gray-800 transition-all duration-200 transform hover:scale-105 flex items-center justify-center';
    } else {
      return 'w-10 h-10 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-200 transform hover:scale-105 flex items-center justify-center';
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ '--header-bg': 'rgba(255, 255, 255, 0.7)', '--text-dark': '#333', '--text-medium': '#666', '--text-light': '#999', '--accent-orange': '#F97316', '--accent-primary': '#60A5FA', '--accent-secondary': '#818CF8', '--surface-elevated': '#F3F4F6', '--input-border': '#E5E7EB', '--accent-success': '#10B981' }}>
      
      {/* Header */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300`}>
        <div className="max-w-5xl mx-2 md:mx-auto p-2 px-4 mt-4 bg-white/70 backdrop-blur-md rounded-2xl flex items-center justify-between shadow-lg">
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
            <Link to="/blog" className="text-gray-700 hover:text-black transition-colors font-normal">Blog</Link>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ?
            <Button
              asChild
              className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                <Link to="/dashboard">Dashboard</Link>
              </Button> :
            <Button
              onClick={handleAuthRequired}
              className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                Get Started
              </Button>
            }
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {user ?
            <Button
              asChild
              className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                <Link to="/dashboard">Dashboard</Link>
              </Button> :
            <Button
              onClick={handleAuthRequired}
              className="px-3 py-1.5 bg-orange-500 text-white font-normal text-sm rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200">
                Get Started
              </Button>
            }
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-8 h-8 ml-2">

              <Menu className="w-5 h-5 text-gray-700" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center pt-32 pb-20 px-4 bg-gradient-to-br from-blue-100 via-purple-100 to-orange-100">
        <div className="w-full max-w-4xl mx-auto text-center">
          <h2 className="text-4xl mt-4 md:mt-12 mb-4 mx-auto font-medium sm:text-5xl md:text-6xl leading-tight tracking-tight md:mb-6 md:whitespace-nowrap w-fit">Create video ads <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">with your product.</span>
          </h2>

          <p className="text-base sm:text-lg text-gray-600 mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed font-light md:whitespace-nowrap">Use one image of your product to create short-form videos by chatting with AI.


          </p>

          <form
            onSubmit={handleSubmit}
            className="rounded-3xl p-2 sm:p-4 w-full mx-auto shadow-lg md:shadow-xl hover:shadow-2xl transition-shadow duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(129, 140, 248, 0.15) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(129, 140, 248, 0.2)',
              boxShadow: '0 12px 30px rgba(129, 140, 248, 0.22), 0 8px 20px rgba(0, 0, 0, 0.05)'
            }}>

            <div className="bg-white border border-gray-200 rounded-2xl p-3 md:p-4 mb-3">
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Let's start vibe clipping..."
                  className="h-28 sm:h-32 md:h-32 w-full bg-transparent text-gray-800 placeholder-gray-500 resize-none border-none outline-none text-sm md:text-base leading-relaxed font-light pr-16" />


                <div className="absolute bottom-2 right-2">
                  <input
                    id="file-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden" />


                  <button
                    type="button"
                    onClick={handleButtonClick}
                    disabled={isSubmitting}
                    className={getButtonClass()}>
                    {isSubmitting ?
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> :

                    getButtonIcon()
                    }
                  </button>
                </div>
              </div>

              {selectedFile &&
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600 font-medium">{selectedFile.name}</span>
                  <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = null;
                    }
                  }}
                  className="ml-auto text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              }
            </div>
            
            <div className="flex justify-center gap-2 text-xs text-gray-700 font-light mt-4 mb-3">
              <span>Try this prompt templates:</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {examplePromptsPreview.map((example, index) =>
              <Button
                key={index}
                variant="outline"
                type="button"
                onClick={() => handleExampleClick(example)}
                className="px-3 py-1 text-xs md:px-4 md:py-2 md:text-sm bg-transparent backdrop-blur-sm border-white/40 rounded-full text-gray-800 hover:bg-white/20 transition-colors shadow-sm font-normal">
                  {example}
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className="mt-16 w-full max-w-4xl mx-auto flex justify-center">
          <div className="w-full max-w-sm md:hidden bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl p-3 shadow-lg">
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900">x100</div>
                <div className="text-sm text-gray-600 font-light">Faster</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900">x10</div>
                <div className="text-sm text-gray-600 font-light">Cheaper</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900">∞</div>
                <div className="text-sm text-gray-600 font-light">Easier</div>
              </div>
            </div>
          </div>

          <div className="hidden md:inline-flex flex-row items-center gap-8 bg-white/50 backdrop-blur-md border border-white/40 rounded-2xl px-6 py-4 shadow-lg">
            <div className="flex flex-col items-center gap-1 px-2">
              <span className="font-semibold text-gray-900 text-xl">x100</span>
              <span className="text-gray-600 font-light text-base">Faster</span>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            <div className="flex flex-col items-center gap-1 px-2">
              <span className="font-semibold text-gray-900 text-xl">x10</span>
              <span className="text-gray-600 font-light text-base">Cheaper</span>
            </div>

            <div className="h-6 w-px bg-gray-300"></div>

            <div className="flex flex-col items-center gap-1 px-2">
              <span className="font-semibold text-gray-900 text-xl">∞</span>
              <span className="text-gray-600 font-light text-base">Easier</span>
            </div>
          </div>
        </div>
      </main>

      <ProductShowcaseSection onAuthRequired={scrollToTop} />
      <TestimonialsSection onAuthRequired={scrollToTop} />

      <section className="bg-gray-900 py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-12">
            <div className="lg:w-1/2">
              <h2 className="text-4xl md:text-5xl font-light text-white mb-4 leading-tight">
                Pricing plans for{' '}
                <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">every need</span>
              </h2>
              <p className="text-xl text-gray-400 font-light mb-8">Scale as you go with plans designed to match your growth.</p>
            </div>
            <div className="lg:w-1/2 grid md:grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-1">
                <div className="bg-white rounded-2xl p-8 flex flex-col h-full">
                  <h3 className="text-2xl font-light text-gray-900 mb-6">Start for free.</h3>
                  <div className="mb-8 flex-grow">
                    <ul className="space-y-3">
                      {["20 free credits", "HD quality output", "Commercial usage rights", "Email support"].map((item) =>
                      <li key={item} className="flex items-center gap-3">
                          <Check size={16} className="text-green-500 flex-shrink-0" />
                          <span className="text-gray-600 font-light">{item}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                  <Button onClick={handleAuthRequired} className="w-full bg-black text-white font-normal py-3 rounded-full hover:bg-gray-800 transition-all duration-200">Get Started</Button>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-1 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="bg-gradient-to-r from-blue-400 to-purple-500 text-black text-xs font-normal px-3 py-1 rounded-full">MOST POPULAR</span>
                </div>
                <div className="bg-white rounded-2xl p-8 flex flex-col h-full">
                  <h3 className="text-2xl font-light text-gray-900 mb-2">Paid plans from</h3>
                  <div className="text-4xl font-normal text-gray-900 mb-6">$20<span className="text-lg text-gray-600 font-light">/mo</span></div>
                  <div className="mb-8 flex-grow"><p className="text-gray-700 font-light">Upgrade for more videos, flexibility, and support.</p></div>
                  <Link to="/pricing" className="block w-full bg-gradient-to-r from-blue-400 to-purple-500 text-black font-normal py-3 rounded-full text-center hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200">See all plans</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FaqsSection />
      <CtaSection onAuthRequired={handleAuthRequired} />
      <Footer />

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        handleAuthRequired={handleAuthRequired} />

    </div>);

}
