
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from '@/components/AuthModal';
import { sendFacebookConversionEvent } from '@/api/functions';
import { useToast } from '@/components/ui/use-toast';
import { createStripeCheckoutSession, createStripeCustomerPortal } from '@/api/functions';


const pricingPlans = [
  {
    name: "Starter",
    price: "$20",
    period: "/month",
    credits: 60,
    videoGenerations: 6,
    priceId: "price_1S7HjfDaWkYYoAByjBQ4K5Qr",
    features: [
      "Unlimited products",
      "30 seconds video generations",
      "Email support",
      "Standard processing speed"
    ]
  },
  {
    name: "Creator",
    price: "$50",
    period: "/month",
    credits: 150,
    videoGenerations: 15,
    priceId: "price_1S7Hk2DaWkYYoAByJ6sj8xHK",
    features: [
      "All Starter features",
      "Priority email support"
    ]
  },
  {
    name: "Pro",
    price: "$100",
    period: "/month",
    credits: 300,
    videoGenerations: 30,
    priceId: "price_1S7HkHDaWkYYoAByhHMb2xZV",
    popular: true,
    features: [
      "All Creator features",
      "Priority processing queue",
      "Beta features access",
      "Priority email support",
      "Brand customization (Coming Soon)"
    ]
  },
  {
    name: "Elite",
    price: "$200",
    period: "/month",
    credits: 750,
    videoGenerations: 75,
    priceId: "price_1S7HkQDaWkYYoAByeEvQ7b0E",
    features: [
      "All Pro features",
      "Dedicated support",
      "Priority processing queue"
    ]
  }
];

const oneTimeCreditPriceId = 'price_1RxTVjDaWkYYoAByvUfEwWY9';
const oneTimeCreditUnitCost = 10;
const oneTimeCreditUnitAmount = 10;


export function PricingContent({ isSubscriptionView = false, darkMode = false, user, onCreditsUpdate }) {
  const [loading, setLoading] = useState({});
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState(10);
  const navigate = useNavigate();
  const { toast } = useToast();

  const getPlanCredits = (currentPlan) => {
      const planCreditsMap = {
          'Starter': 60,
          'Creator': 150,
          'Pro': 300,
          'Elite': 750
      };
      
      return planCreditsMap[currentPlan] || 20;
  };


  const handleUpgrade = async (priceId) => {
    if (!user) {
        setShowAuthModal(true);
        return;
    }
    
    // Removed Facebook Conversion Event logic and related plan lookup as per outline.
    // The previous logic for direct upgrade (response.upgraded) has been removed,
    // assuming all upgrades will now involve a redirect to Stripe Checkout.

    setLoading(prev => ({ ...prev, [priceId]: true }));
    
    try {
        const response = await createStripeCheckoutSession({
            priceId,
            mode: 'subscription'
        });

        if (response.url) {
            // Redirect to Stripe Checkout
            window.location.href = response.url;
        } else {
            // Updated error message to match outline's simplified expectation
            throw new Error('No checkout URL received from server');
        }

    } catch (error) {
        console.error('Upgrade error:', error);
        
        // Ensure error messages are always in English and use existing toast mechanism
        const errorMessage = error.message || 'Failed to create checkout session. Please try again.';
        
        toast({
          title: "Upgrade Failed",
          description: errorMessage,
          variant: "destructive",
        });
    } finally {
        setLoading(prev => ({ ...prev, [priceId]: false }));
    }
  };

  const handleBuyCreditPack = async (amount) => {
    if (!user) {
        setShowAuthModal(true);
        return;
    }

    const quantity = amount / oneTimeCreditUnitAmount;
    const calculatedValue = quantity * oneTimeCreditUnitCost;

    if (window.fbq) {
      window.fbq('track', 'InitiateCheckout', {
        content_name: 'Credit Pack',
        content_category: 'credits',
        value: calculatedValue,
        currency: 'USD'
      });
    }

    sendFacebookConversionEvent({
      eventName: 'InitiateCheckout',
      value: calculatedValue,
      currency: 'USD',
      customData: {
        content_name: 'Credit Pack',
        content_category: 'credits'
      }
    }).catch(e => console.error('Failed to send InitiateCheckout event:', e));

    setLoading(prev => ({ ...prev, 'Credit Pack': true }));
    
    try {
        const response = await createStripeCheckoutSession({ 
          priceId: oneTimeCreditPriceId, 
          mode: 'payment',
          quantity: quantity 
        });
        
        if (response.data?.url) {
            window.location.href = response.data.url;
        } else {
            throw new Error('No checkout URL returned');
        }

    } catch (error) {
        console.error('Error creating checkout session:', error);
        toast({
          title: "Purchase Failed",
          description: 'Failed to start checkout process. Please try again.',
          variant: "destructive",
        });
    } finally {
        setLoading(prev => ({ ...prev, 'Credit Pack': false }));
    }
  };

  const handleManageSubscription = async () => {
    setLoading(prev => ({ ...prev, 'manage': true }));
    try {
      const response = await createStripeCustomerPortal();
      
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Error accessing customer portal:', error);
      toast({
        title: "Error",
        description: 'Error accessing subscription management. Please try again.',
        variant: "destructive",
      });
    } finally {
        setLoading(prev => ({ ...prev, 'manage': false }));
    }
  };

  const handleCreditChange = (amount) => {
      setCreditAmount(prev => {
          const newValue = prev + amount;
          return Math.max(10, newValue);
      });
  }

  return (
    <div className={`py-24 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <h2 className={cn("text-4xl md:text-5xl font-light mb-4", darkMode ? "text-white" : "text-gray-900")}>
            {isSubscriptionView ? "Upgrade Your Plan" : "Flexible plans for everyone"}
          </h2>
          <p className={cn("text-xl font-light", darkMode ? "text-gray-400" : "text-gray-600")}>
            {isSubscriptionView ? "Unlock more credits and advanced features." : "Choose the plan that's right for you."}
          </p>
        </div>

        {/* User credits display */}
        {user && (
            <div className="mb-12 text-center">
                <div className={cn("rounded-xl shadow-sm border p-6 max-w-md mx-auto", darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200")}>
                    <h3 className={cn("text-lg font-medium mb-2", darkMode ? "text-white" : "text-gray-900")}>Your Credits</h3>
                    <div className={cn("text-3xl font-bold mb-2", darkMode ? "text-orange-500" : "text-orange-600")}>
                        {user.credits || 0}/{getPlanCredits(user.current_plan)}
                    </div>
                    <p className={cn("text-sm", darkMode ? "text-gray-400" : "text-gray-600")}>
                        Current Plan: {user.current_plan || 'Free'} 
                        {user.subscription_status === 'active' ? ' (Active)' : ''}
                    </p>
                </div>
            </div>
        )}
      
        {/* Pricing Cards */}
        <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 xl:gap-8">
            {pricingPlans.map((plan) => (
                <div
                    key={plan.name}
                    className={`relative p-8 rounded-3xl shadow-2xl h-[500px] flex flex-col ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} ${
                        plan.popular ? 'ring-2 ring-orange-500' : ''
                    }`}
                >
                    {plan.popular && (
                        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2">
                            <span className="inline-flex px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-orange-400 to-orange-600 text-white">
                                Most Popular
                            </span>
                        </div>
                    )}

                    <div className="text-center flex-shrink-0">
                        <h3 className="text-2xl font-normal">{plan.name}</h3>
                        <div className="mt-6 flex items-center justify-center">
                            <span className="text-5xl font-light tracking-tight">{plan.price}</span>
                            <span className={`ml-2 text-xl font-light ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {plan.period}
                            </span>
                        </div>

                        <div className="mt-6 space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Credits</span>
                                <span className="font-normal">{plan.credits} / mo</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Video generations</span>
                                <span className="font-normal">{plan.videoGenerations} videos</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-grow mt-8">
                        <ul className="space-y-2">
                            {plan.features.map((feature) => (
                                <li key={feature} className="flex items-start">
                                    <Check className="h-6 w-6 text-green-500 flex-shrink-0" />
                                    <span className={`ml-3 text-sm font-light ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                        {feature}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="mt-auto pt-6 flex-shrink-0">
                        <Button
                            onClick={() => handleUpgrade(plan.priceId)}
                            disabled={loading[plan.priceId]}
                            className={`w-full py-3 px-6 rounded-full text-white font-normal transition-all duration-200 transform hover:scale-105 ${
                                plan.popular
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                                    : darkMode
                                        ? 'bg-gray-700 hover:bg-gray-600'
                                        : 'bg-gray-900 hover:bg-gray-800'
                            }`}
                        >
                            {loading[plan.priceId] ? 'Processing...' : `Get ${plan.name}`}
                        </Button>
                    </div>
                </div>
            ))}
        </div>

        {user && user.subscription_status === 'active' && (
            <div className="mt-16 text-center">
                <h3 className={cn("text-3xl font-light mb-4", darkMode ? "text-white" : "text-gray-900")}>Need a few more credits?</h3>
                <p className={cn("text-lg font-light mb-8 max-w-2xl mx-auto", darkMode ? "text-gray-400" : "text-gray-600")}>Top up your account without changing your plan.</p>
                <div className="max-w-md mx-auto">
                    <div className={cn("border rounded-2xl p-6 md:p-8 hover:shadow-lg transition-all duration-300", darkMode ? "bg-gray-800 border-gray-700" : "bg-slate-50 border-slate-200")}>
                        <h4 className={cn("text-xl md:text-2xl font-normal mb-2", darkMode ? "text-white" : "text-gray-900")}>Credit Pack</h4>
                        <p className={cn("font-light mb-6", darkMode ? "text-gray-400" : "text-gray-600")}>Purchase credits in multiples of 10.</p>
                        
                        <div className="flex items-center justify-center gap-3 md:gap-4 mb-4">
                            <Button size="icon" variant="outline" onClick={() => handleCreditChange(-10)} disabled={creditAmount <= 10} className={cn("h-8 w-8 md:h-10 md:w-10", darkMode ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : "")}>
                                <Minus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                            <span className={cn("text-xl md:text-2xl font-normal w-20 md:w-24 text-center", darkMode ? "text-white" : "text-gray-900")}>{creditAmount} credits</span>
                            <Button size="icon" variant="outline" onClick={() => handleCreditChange(10)} className={cn("h-8 w-8 md:h-10 md:w-10", darkMode ? "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600" : "")}>
                                <Plus className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                        </div>
                        
                        <div className={cn("text-3xl md:text-4xl font-normal mb-6", darkMode ? "text-white" : "text-gray-900")}>${creditAmount / oneTimeCreditUnitAmount * oneTimeCreditUnitCost}</div>

                        <Button
                            onClick={() => handleBuyCreditPack(creditAmount)}
                            disabled={loading['Credit Pack']}
                            className="w-full bg-orange-500 text-white font-normal rounded-full hover:bg-orange-500/90 transform hover:scale-[1.02] transition-all duration-200 shadow-lg py-2 md:py-3 text-sm md:text-base"
                        >
                            {loading['Credit Pack'] ? 'Processing...' : `Purchase ${creditAmount} Credits`}
                        </Button>
                    </div>
                </div>
            </div>
        )}

        {isSubscriptionView && (
          <div className={cn("border rounded-2xl p-8 mt-16", darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200")}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h2 className={cn("text-2xl font-normal mb-2", darkMode ? "text-white" : "text-gray-900")}>Manage Subscription</h2>
                <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>Manage your plan, see billing history, or cancel your subscription.</p>
              </div>
              <Button
                onClick={handleManageSubscription}
                disabled={loading['manage']}
                className="bg-gray-800 text-white font-normal rounded-full hover:bg-black transform hover:scale-[1.02] transition-all duration-200 shadow-lg px-6 py-3 w-full md:w-auto"
              >
                {loading['manage'] ? 'Loading...' : 'Change Plan or Cancel'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* What's Included Section */}
      <section className={cn("py-20", darkMode ? "bg-gray-800" : "bg-gray-50")}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className={cn("text-3xl md:text-4xl font-light mb-4", darkMode ? "text-white" : "text-gray-900")}>
              Eliminate costly, complex video production.
            </h2>
            <h3 className={cn("text-2xl md:text-3xl font-light mb-8", darkMode ? "text-white" : "text-gray-900")}>
              Every Viduto plan includes:
            </h3>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4", darkMode ? "bg-blue-500/20" : "bg-blue-50")}>
                <Check className="w-6 h-6 text-orange-500" />
              </div>
              <h4 className={cn("text-lg font-medium mb-2", darkMode ? "text-white" : "text-gray-900")}>AI-powered video creation</h4>
              <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>Advanced AI that understands your product and creates professional videos</p>
            </div>

            <div className="text-center">
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4", darkMode ? "bg-blue-500/20" : "bg-blue-50")}>
                <Check className="w-6 h-6 text-orange-500" />
              </div>
              <h4 className={cn("text-lg font-medium mb-2", darkMode ? "text-white" : "text-gray-900")}>Commercial usage rights</h4>
              <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>Use your videos for any commercial purpose without restrictions</p>
            </div>

            <div className="text-center">
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4", darkMode ? "bg-blue-500/20" : "bg-blue-50")}>
                <Check className="w-6 h-6 text-orange-500" />
              </div>
              <h4 className={cn("text-lg font-medium mb-2", darkMode ? "text-white" : "text-gray-900")}>30-second optimized videos</h4>
              <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>Perfect length for social media and maximum engagement</p>
            </div>

            <div className="text-center">
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4", darkMode ? "bg-blue-500/20" : "bg-blue-50")}>
                <Check className="w-6 h-6 text-orange-500" />
              </div>
              <h4 className={cn("text-lg font-medium mb-2", darkMode ? "text-white" : "text-gray-900")}>Text-based creation</h4>
              <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>No video editing skills needed - just describe what you want</p>
            </div>

            <div className="text-center">
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4", darkMode ? "bg-blue-500/20" : "bg-blue-50")}>
                <Check className="w-6 h-6 text-orange-500" />
              </div>
              <h4 className={cn("text-lg font-medium mb-2", darkMode ? "text-white" : "text-gray-900")}>Unlimited revisions</h4>
              <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>Request changes until your video is perfect (2.5 credits per revision)</p>
            </div>

            <div className="text-center">
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4", darkMode ? "bg-blue-500/20" : "bg-blue-50")}>
                <Check className="w-6 h-6 text-orange-500" />
              </div>
              <h4 className={cn("text-lg font-medium mb-2", darkMode ? "text-white" : "text-gray-900")}>Fast delivery</h4>
              <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>Get your professional videos ready in just 5 minutes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Credit Information */}
      <section className={cn("py-12", darkMode ? "bg-gray-900" : "bg-white")}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className={cn("border rounded-2xl p-8", darkMode ? "bg-blue-900/20 border-blue-500/20" : "bg-blue-50/50 border-blue-100")}>
            <h3 className={cn("text-2xl font-light mb-6", darkMode ? "text-white" : "text-gray-900")}>How Credits Work</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">10</span>
                </div>
                <h4 className={cn("text-lg font-medium mb-2", darkMode ? "text-white" : "text-gray-900")}>Video Generation</h4>
                <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>Every video generation costs 10 credits</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">2.5</span>
                </div>
                <h4 className={cn("text-lg font-medium mb-2", darkMode ? "text-white" : "text-gray-900")}>Video Revision</h4>
                <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>Every revision costs 2.5 credits</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={cn("py-20", darkMode ? "bg-gray-900" : "bg-white")}>
        <div className="max-w-4xl mx-auto px-6">
          <h2 className={cn("text-3xl md:text-4xl font-light text-center mb-12", darkMode ? "text-white" : "text-gray-900")}>
            FAQs
          </h2>
          
          <div className="space-y-6">
            <div className={cn("border-b pb-6", darkMode ? "border-gray-700" : "border-gray-200")}>
              <h3 className={cn("text-lg font-medium mb-3", darkMode ? "text-white" : "text-gray-900")}>What's included in the free plan?</h3>
              <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>
                New users get 20 free credits to try Viduto - enough to create your first two videos and see the quality for yourself. 
                This includes access to all core features, Full-HD output, and commercial usage rights.
              </p>
            </div>

            <div className={cn("border-b pb-6", darkMode ? "border-gray-700" : "border-gray-200")}>
              <h3 className={cn("text-lg font-medium mb-3", darkMode ? "text-white" : "text-gray-900")}>How do video credits work?</h3>
              <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>
                Each video generation uses 10 credits, and each revision uses 2.5 credits. Credits reset monthly with your subscription.
                You can also purchase additional credits anytime for $10 per 10 credits.
              </p>
            </div>

            <div className={cn("border-b pb-6", darkMode ? "border-gray-700" : "border-gray-200")}>
              <h3 className={cn("text-lg font-medium mb-3", darkMode ? "text-white" : "text-gray-900")}>What happens if I reach my plan limits?</h3>
              <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>
                If you run out of credits, you can either wait for your monthly reset or purchase additional credits. 
                You can also upgrade to a higher plan anytime to get more monthly credits.
              </p>
            </div>

            <div className={cn("border-b pb-6", darkMode ? "border-gray-700" : "border-gray-200")}>
              <h3 className={cn("text-lg font-medium mb-3", darkMode ? "text-white" : "text-gray-900")}>Can I cancel my subscription anytime?</h3>
              <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>
                Yes, you can cancel your subscription at any time. You'll continue to have access to your plan features 
                until the end of your current billing period.
              </p>
            </div>

            <div className={cn("pb-6", darkMode ? "" : "")}>
              <h3 className={cn("text-lg font-medium mb-3", darkMode ? "text-white" : "text-gray-900")}>Do you offer refunds?</h3>
              <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>
                We offer a 30-day money-back guarantee for all subscription plans. If you're not satisfied with Viduto, 
                contact our support team for a full refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-blue-500 to-purple-500 py-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-black mb-8 leading-tight">
            Ready to transform your
            <br />
            product marketing?
          </h2>
          <p className="text-xl text-black/80 max-w-2xl mx-auto mb-8 font-light">
            Join thousands of businesses already creating viral videos with Viduto
          </p>
          <Button
            onClick={() => {
              if (!user) {
                setShowAuthModal(true);
              } else {
                // Navigate to top of dashboard
                window.location.href = '/dashboard';
              }
            }}
            className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-full font-medium hover:bg-gray-800 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Start creating videos
          </Button>
        </div>
      </section>

      {/* Add AuthModal */}
      {typeof window !== 'undefined' && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}
