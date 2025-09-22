import React, { useState, useEffect, useCallback } from 'react';
import { Menu, X, User as UserIcon, CreditCard, LogOut, Plus, MessageSquare, HelpCircle, Sun, Moon, Gift, Zap, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from '@/api/entities';
import { Chat } from '@/api/entities';
import { Message } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { ChatInterface } from '../components/ChatInterface';
import { Button } from '@/components/ui/button';
import { HelpModal } from '../components/HelpModal';
import { SubscriptionPage } from '../components/SubscriptionPage';
import { WinCreditsModal } from '../components/WinCreditsModal';
import { toast } from "sonner";
import Logo from "@/components/Logo";
import { ensureUserCredits } from '@/api/functions';
import { createStripeCustomerPortal } from '@/api/functions';
import { syncUserWithStripe } from '@/api/functions';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeDashboardView, setActiveDashboardView] = useState('chat');
  const [authError, setAuthError] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showWinCreditsModal, setShowWinCreditsModal] = useState(false);
  const [userCredits, setUserCredits] = useState(0); // This state will now reflect current credits, not total
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  // NEW: Function to get plan credits based on current_plan
  const getPlanCredits = (currentPlan) => {
      const planCreditsMap = {
          'Starter': 60,
          'Creator': 150,
          'Pro': 300,
          'Elite': 750
      };
      
      // Default to 20 for free users or unknown plans
      return planCreditsMap[currentPlan] || 20;
  };

  useEffect(() => {
    const savedMode = localStorage.getItem('viduto-dark-mode');
    if (savedMode) {
      setDarkMode(savedMode === 'true');
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('viduto-dark-mode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    
    setViewportHeight();

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
    };
  }, []);

  // Removed the mobile no-scroll styles effect - this was causing issues
  // The previous useEffect block for 'mobile-no-scroll' styles is removed here as per the instructions.

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Removed getSubscriptionCredits as it's replaced by getPlanCredits based on the user's actual plan.
  // const getSubscriptionCredits = (user) => {
  //   // Determine plan credits based on current credits or subscription info
  //   if (user?.subscription_status === 'active') {
  //       const currentCredits = user.credits || 0;
        
  //       // Map current credits to plan limits
  //       if (currentCredits <= 60) return 60;   // Starter
  //       if (currentCredits <= 150) return 150; // Creator  
  //       if (currentCredits <= 300) return 300; // Pro
  //       if (currentCredits <= 750) return 750; // Elite
        
  //       // Fallback for credits above 750, ensure it's at least the starter plan amount
  //       return Math.max(60, currentCredits);
  //   }
  //   return 20; // Default credits for free users
  // };

  // פונקציה לרענון נתוני המשתמש מה-database
  const refreshUserData = useCallback(async () => {
      try {
          console.log('🔄 Refreshing user data from database...');
          const currentUser = await User.me();
          if (currentUser) {
              setUser(currentUser);
              setUserCredits(currentUser.credits || 0);
              console.log('✅ User data refreshed:', {
                  current_plan: currentUser.current_plan,
                  credits: currentUser.credits,
                  subscription_status: currentUser.subscription_status
              });
          }
      } catch (error) {
          console.error('❌ Error refreshing user data:', error);
      }
  }, []);

  // פונקציה לרענון מורחב עם סנכרון Stripe
  const refreshUserCredits = useCallback(async () => {
    try {
      console.log('🔄 Syncing with Stripe and refreshing user data...');
      await syncUserWithStripe();
      
      const currentUser = await User.me();
      if (currentUser) {
        setUser(currentUser);
        setUserCredits(currentUser.credits || 0); // Update current credits
        console.log('✅ Credits and subscription data refreshed:', {
            current_plan: currentUser.current_plan,
            credits: currentUser.credits,
            subscription_status: currentUser.subscription_status
        });
      }
    } catch (error) {
      console.error('❌ Error refreshing user credits:', error);
    }
  }, []);

  const ensureCredits = useCallback(async () => {
    try {
      await ensureUserCredits();
      await refreshUserCredits();
    } catch (error) {
      console.error('Error ensuring user credits:', error);
    }
  }, [refreshUserCredits]);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        await syncUserWithStripe();

        const currentUser = await User.me();
        setUser(currentUser);
        setUserCredits(currentUser.credits || 0);
        setAuthError(false);

        // This ensures new users or users with 0 credits get their initial credits if applicable
        if (currentUser.credits == null || currentUser.credits === 0) {
          await ensureCredits();
        }

        if (window.fbq) {
          window.fbq('track', 'CompleteRegistration');
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        
        const view = urlParams.get('view');
        if (view === 'pricing') {
          setActiveDashboardView('pricing');
        }

        // 🔄 תיקון: רענן נתוני משתמש אחרי הצלחת תשלום
        if (urlParams.get('success') === 'true') {
            toast.success("Payment successful! Your subscription is being updated...");
            if (window.fbq) {
                window.fbq('track', 'Purchase', { value: 0.01, currency: 'USD' });
            }
            
            // רענן נתונים מספר פעמים כדי לוודא שהwebhook עודכן
            const refreshAfterPayment = async () => {
                let attempts = 0;
                const maxAttempts = 10; // Changed from 15 to 10
                
                const intervalId = setInterval(async () => {
                    attempts++;
                    console.log(`🔄 Post-payment refresh attempt ${attempts}/${maxAttempts}`);
                    await refreshUserCredits(); // Ensure Stripe sync is part of this refresh
                    
                    if (attempts >= maxAttempts) {
                        clearInterval(intervalId);
                        console.log('✅ Completed post-payment refresh attempts');
                    }
                }, 3000); // Changed from 2000ms to 3000ms
            };
            
            refreshAfterPayment();
            
            window.history.replaceState({}, document.title, "/dashboard");
        }

        const chatIdFromUrl = urlParams.get('chat');

        if (chatIdFromUrl) {
          const userChats = await Chat.filter({ created_by: currentUser.email }, '-updated_date');
          setChats(userChats || []);
          setCurrentChatId(chatIdFromUrl);
          window.history.replaceState({}, '', '/dashboard');
        } else {
           const pendingDataStr = sessionStorage.getItem('pendingChatData');
           if (pendingDataStr) {
              const pendingData = JSON.parse(pendingDataStr);
              sessionStorage.removeItem('pendingChatData');
              
              const newChat = await Chat.create({ 
                  title: 'Creating video...', 
                  workflow_state: 'draft' 
              });
              
              const byteCharacters = atob(pendingData.fileBase64.split(',')[1]);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
              const byteArray = new Uint8Array(byteNumbers);
              const file = new File([byteArray], pendingData.fileName, { type: pendingData.fileType });

              const { file_url } = await UploadFile({ file });
              
              await Message.create({
                chat_id: newChat.id,
                message_type: 'user',
                content: pendingData.prompt,
                metadata: { image_url: file_url, is_initial_request: true }
              });

              const userChats = await Chat.filter({ created_by: currentUser.email }, '-updated_date');
              setChats(userChats || []);
              setCurrentChatId(newChat.id);
              
           } else {
              const userChats = await Chat.filter({ created_by: currentUser.email }, '-updated_date');
              setChats(userChats || []);
              if (userChats && userChats.length > 0) {
                setCurrentChatId(userChats[0].id);
              }
           }
        }
      } catch (e) {
        if (e.message === 'Not authenticated') {
          console.info('User not authenticated, redirecting to home page');
        } else {
          console.error('Initialization failed:', e);
        }
        setAuthError(true);
        setTimeout(() => navigate('/'), 1000);
      } finally {
        setLoading(false);
      }
    };
    initialize();

    // 🔄 תיקון: קיצור זמן רענון לתדירות גבוהה יותר אחרי תשלום
    const creditsInterval = setInterval(refreshUserCredits, 30000); // כל 30 שניות

    return () => {
      clearInterval(creditsInterval);
    };
  }, [navigate, refreshUserCredits, ensureCredits]);

  // רענון נתונים כאשר המשתמש חוזר לדף (visibility change)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing user data...');
        refreshUserCredits(); // Use the full refresh with Stripe sync
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshUserCredits]);


  const createNewChat = async () => {
    try {
      setCurrentChatId(null);
      setSidebarOpen(false);
      setActiveDashboardView('chat');
    } catch (error) {
      console.error('Error preparing new chat:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await User.logout();
      window.location.href = '/home';
    } catch (error) {
      console.error('Error during logout:', error);
      window.location.href = '/home';
    }
  };
  
  const handleChatUpdate = useCallback(async (newChatId = null) => {
    try {
        const currentUser = await User.me();
        const userChats = await Chat.filter({ created_by: currentUser.email }, '-updated_date');
        setChats(userChats || []);
        if (newChatId && currentChatId === null) {
          setCurrentChatId(newChatId);
        } else if (!currentChatId && userChats.length > 0) {
          setCurrentChatId(userChats[0].id);
        }
    } catch(e) {
        console.error("Failed to update chats", e)
    }
  }, [currentChatId]);

  const handleManageBilling = async () => {
    try {
      const { data } = await createStripeCustomerPortal();
      if (data && data.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error('Failed to get billing portal URL.');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error('Failed to open billing portal');
    }
  };

  const handleUpgradePlan = () => {
      setActiveDashboardView('pricing');
      setSidebarOpen(false);
  };

  // NEW: Function to update user data when called from child components
  const handleUserDataUpdate = useCallback((updatedUser) => {
      console.log('📝 Updating user data in dashboard:', {
          current_plan: updatedUser.current_plan,
          credits: updatedUser.credits,
          subscription_status: updatedUser.subscription_status
      });
      setUser(updatedUser);
      setUserCredits(updatedUser.credits || 0); // Also update userCredits state
  }, []);

  // הוספת פונקציה לרענון ידני למקרה של צורך
  const handleManualRefresh = useCallback(async () => {
      console.log('🔄 Manual refresh triggered...');
      await refreshUserData();
  }, [refreshUserData]);

  if (loading) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authError ? 'Redirecting to login...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user || authError) {
    return (
      <div className="h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex md:h-screen min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Mobile Header (fixed on top for small screens) */}
      <div className={`md:hidden fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b ${darkMode ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-200'}`}>
          <div className="flex items-center justify-between p-4">
              <button
                  onClick={() => setSidebarOpen(true)}
                  className={`p-2 rounded-lg transition-colors ${
                      darkMode
                      ? 'bg-gray-700 text-gray-400 hover:text-gray-200'
                      : 'bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
              >
                  <Menu size={20} />
              </button>
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-orange-500" />
                <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user?.credits || 0} / {getPlanCredits(user.current_plan)}</span>
              </div>
          </div>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed top-0 left-0 z-30 w-80 h-full backdrop-blur-md border-r transform transition-transform duration-300 overflow-hidden flex flex-col
        md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${darkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'}
      `}>
        <div className={`flex items-center justify-between p-4 md:p-6 border-b flex-shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3 flex-1">
            <Link to="/dashboard" className="flex items-center gap-2">
              <Logo size={24} className="w-6 h-6 md:w-8 md:h-8" />
              <span className={`text-lg md:text-xl font-normal transition-colors ${darkMode ? 'text-white hover:text-gray-300' : 'text-gray-900 hover:text-gray-700'}`}>Viduto</span>
            </Link>
            
            <button
              onClick={toggleDarkMode}
              className={`ml-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-105 ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className={`transition-colors md:hidden ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <X size={20} />
          </button>
        </div>

        <div className={`p-4 md:p-6 border-b flex-shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-[#5EE3FF] to-[#B18CFF] rounded-full flex items-center justify-center">
              <UserIcon size={16} className="text-black md:w-5 md:h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm md:text-base font-normal truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user?.full_name || 'User'}</p>
              <p className={`text-xs md:text-sm font-light truncate ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{user?.email}</p>
            </div>
            <button
              onClick={() => setShowHelpModal(true)}
              className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-colors group flex-shrink-0 ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
              }`}
              title="Need help?"
            >
              <HelpCircle size={14} className={`group-hover:text-gray-800 md:w-4 md:h-4 ${darkMode ? 'text-gray-400 group-hover:text-gray-200' : 'text-gray-600'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user?.credits || 0} / {getPlanCredits(user.current_plan)}
                    </span>
                </div>
            </div>
            {user?.subscription_status === 'active' && (
              <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUpgradePlan}
                  className={`${darkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-100'}`}
              >
                  Upgrade Plan
              </Button>
            )}
          </div>
        </div>

        <div className="p-3 md:p-4 flex-shrink-0">
          <Button
            onClick={createNewChat}
            className="w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 bg-orange-500 text-white font-normal text-sm md:text-base rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200 shadow-lg"
          >
            <Plus size={16} className="md:w-4 md:h-4" />
            New Project
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4 min-h-0">
          <h4 className={`text-xs md:text-sm font-normal mb-2 md:mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Recent Projects</h4>
          <div className="space-y-2">
            {chats.length === 0 ? (
              <div className={`text-center py-6 md:py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <p className="text-sm md:text-base font-light">No projects yet</p>
                <p className="text-xs md:text-sm mt-1 font-light">Create your first video!</p>
              </div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    setCurrentChatId(chat.id);
                    setSidebarOpen(false);
                    setActiveDashboardView('chat');
                  }}
                  className={`w-full text-left p-2 md:p-3 rounded-lg transition-colors ${
                    currentChatId === chat.id
                      ? 'bg-orange-500/10 text-orange-500 font-normal border border-orange-500/30'
                      : darkMode 
                        ? 'text-gray-300 hover:bg-gray-700 font-light'
                        : 'text-gray-700 hover:bg-gray-100 font-light'
                  }`}
                >
                  <p className="text-sm md:text-base font-normal truncate">{chat.title || 'New Video Project'}</p>
                  <p className={`text-xs md:text-sm mt-1 font-light ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                    {new Date(chat.updated_date).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={`border-t p-3 md:p-4 space-y-2 flex-shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={() => setShowWinCreditsModal(true)}
            className={`w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-lg transition-colors font-normal text-sm md:text-base mb-2 ${
              darkMode 
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600' 
                : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600'
            }`}
          >
            <Gift size={16} className="md:w-4 md:h-4" />
            Win FREE Credits!
          </button>
          
          <button
            onClick={() => {
              setActiveDashboardView('pricing');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-lg transition-colors font-normal text-sm md:text-base ${
              darkMode ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <CreditCard size={16} className="md:w-4 md:h-4" />
            My Subscription
          </button>

          <button
            onClick={handleSignOut}
            className={`w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 rounded-lg transition-colors font-normal text-sm md:text-base ${
              darkMode 
                ? 'text-gray-300 hover:text-red-400 hover:bg-red-900/20' 
                : 'text-gray-700 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            <LogOut size={16} className="md:w-4 md:h-4" />
            Log Out
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">

        {/* Desktop Header - if any specific elements are needed outside ChatInterface on desktop */}
        {/* The current implementation relies on the sidebar for desktop view, and ChatInterface's own header for chat-specific controls. */}
        {/* If a dedicated top-level desktop header is needed, it would go here:
        <div className="hidden md:flex items-center justify-between p-4 bg-white border-b border-gray-200">
            <span>Viduto Desktop</span>
            <Button>Action</Button>
        </div>
        */}

        <div className="flex-1 pt-16 md:pt-0 min-h-0">
          {activeDashboardView === 'chat' ? (
            <div className="h-full">
              <ChatInterface
                chatId={currentChatId}
                onChatUpdate={handleChatUpdate}
                onCreditsRefreshed={refreshUserCredits}
                onNewChat={createNewChat}
                darkMode={darkMode}
              />
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <SubscriptionPage 
                user={user} 
                setSidebarOpen={setSidebarOpen} 
                darkMode={darkMode} 
                onManageBilling={handleManageBilling}
                onUserDataUpdate={handleUserDataUpdate} // Pass the new handler here
              />
            </div>
          )}
        </div>
      </div>

      <HelpModal 
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        user={user}
        darkMode={darkMode}
      />

      <WinCreditsModal 
        isOpen={showWinCreditsModal}
        onClose={() => setShowWinCreditsModal(false)}
        onPurchaseComplete={refreshUserCredits}
        darkMode={darkMode}
      />

      <CreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        onPurchaseComplete={refreshUserCredits}
        darkMode={darkMode}
      />
    </div>
  );
}