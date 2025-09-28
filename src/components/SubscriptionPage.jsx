import React, { useState } from 'react';
import { Check, CreditCard, HelpCircle, Zap, ExternalLink, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createStripeCheckoutSession } from '@/api/functions';
import { toast } from "sonner";

const subscriptionPlans = [
  {
    name: "Starter",
    price: 20,
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
    price: 50,
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
    price: 100,
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
    price: 200,
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

const faqData = [
  {
    question: "How do credits work?",
    answer: "Each video creation costs 10 credits, and revisions cost 2.5 credits each. Credits reset monthly with your subscription and don't roll over to the next month."
  },
  {
    question: "How long does it take to generate a video?",
    answer: "Most videos are ready in about 10-15 minutes, depending on complexity and current queue. Pro and Elite members get priority processing for faster generation times."
  },
  {
    question: "Can I change my plan anytime?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle, and you'll have immediate access to your new credit allowance."
  },
  {
    question: "What happens if I run out of credits?",
    answer: "You can purchase additional credit packs for $10 (10 credits) or upgrade to a higher plan. Your account will pause video creation until you have sufficient credits."
  },
  {
    question: "Do unused credits roll over?",
    answer: "No, credits reset each month and don't carry over. This keeps our pricing simple and fair for all users."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Absolutely! You can cancel your subscription anytime through the billing portal. You'll retain access to your credits until the end of your current billing period."
  }
];

export function SubscriptionPage({ user, darkMode = false, onManageBilling, onUserDataUpdate }) {
    const [loading, setLoading] = useState(null);
    const [expandedFaq, setExpandedFaq] = useState(null);

    const handleSubscribe = async (plan) => {
        setLoading(plan.priceId);
        
        try {
            console.log(`Creating checkout session for ${plan.name} with priceId: ${plan.priceId}`);
            
            const response = await createStripeCheckoutSession({
                priceId: plan.priceId,
                mode: 'subscription'
            });
            
            if (response.data?.url) {
                window.location.href = response.data.url;
            } else if (response.data?.success && response.data?.redirect_url) {
                toast.success('Plan upgraded successfully with prorated billing!');
                setTimeout(() => {
                    window.location.href = response.data.redirect_url;
                }, 1500);
            } else {
                throw new Error('No checkout URL received from Stripe or unexpected response');
            }
            
        } catch (error) {
            console.error('Error creating checkout session:', error);
            toast.error('Error creating order. Please try again.');
            setLoading(null);
        }
    };

    const getCurrentPlan = () => {
        if (user?.subscription_status === 'active' && user?.current_plan) {
            return user.current_plan;
        }
        return 'Free';
    };

    const currentPlan = getCurrentPlan();
    const isSubscribed = user?.subscription_status === 'active';

    return (
        <div className={cn("h-full overflow-y-auto", darkMode ? "bg-gray-900" : "bg-white")}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Current Plan Status */}
                {isSubscribed && (
                    <div className={cn("rounded-2xl p-6 mb-8 border", 
                        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200')}>
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-4">
                                <div className={cn("w-12 h-12 rounded-full flex items-center justify-center",
                                    darkMode ? 'bg-blue-600' : 'bg-blue-100')}>
                                    <Zap className={cn("w-6 h-6", darkMode ? 'text-white' : 'text-blue-600')} />
                                </div>
                                <div>
                                    <h3 className={cn("text-xl font-normal", darkMode ? "text-white" : "text-gray-900")}>
                                        Current Plan: {currentPlan}
                                    </h3>
                                    <p className={cn("font-light", darkMode ? "text-gray-400" : "text-gray-600")}>
                                        {user.credits} credits • Renews {user.subscription_period_end ? 
                                            new Date(user.subscription_period_end).toLocaleDateString() : 'monthly'}
                                    </p>
                                </div>
                            </div>
                            
                            <Button
                                onClick={onManageBilling}
                                variant="outline"
                                className={cn("gap-2 whitespace-nowrap",
                                    darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300')}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Manage Billing
                            </Button>
                        </div>
                    </div>
                )}

                {/* Page Header */}
                <div className="text-center mb-12">
                    <h1 className={cn("text-3xl font-light mb-4", darkMode ? "text-white" : "text-gray-900")}>
                        {isSubscribed ? 'Manage Your Subscription' : 'Choose a plan that fits your video creation needs.'}
                    </h1>
                    <p className={cn("font-light max-w-2xl mx-auto", darkMode ? "text-gray-400" : "text-gray-600")}>
                        {isSubscribed 
                            ? "Upgrade or downgrade your plan with prorated billing." 
                            : "Choose a plan that fits your video creation needs."
                        }
                    </p>
                </div>

                {/* Subscription Plans */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch mb-16">
                    {subscriptionPlans.map((plan) => {
                        const isCurrentPlan = isSubscribed && currentPlan === plan.name;
                        
                        return (
                            <div
                                key={plan.name}
                                className={cn("relative border-2 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 flex flex-col",
                                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
                                    plan.popular ? 'border-orange-500' : '',
                                    isCurrentPlan ? 'ring-2 ring-blue-500' : ''
                                )}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 -right-3 px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full shadow-md z-10">
                                        Popular
                                    </div>
                                )}
                                
                                {isCurrentPlan && (
                                    <div className="absolute -top-3 -left-3 px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full shadow-md z-10">
                                        Current Plan
                                    </div>
                                )}
                                
                                <div className="flex-1">
                                    <h3 className={cn("text-xl font-normal mb-2", darkMode ? "text-white" : "text-gray-900")}>
                                        {plan.name}
                                    </h3>
                                    <div className="flex items-baseline mb-4">
                                        <span className={cn("text-3xl font-light", darkMode ? "text-white" : "text-gray-900")}>
                                            ${plan.price}
                                        </span>
                                        <span className={cn("ml-1 font-light", darkMode ? "text-gray-400" : "text-gray-600")}>
                                            /month
                                        </span>
                                    </div>
                                    
                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center justify-between">
                                            <span className={cn("text-sm font-light", darkMode ? "text-gray-400" : "text-gray-600")}>
                                                Credits
                                            </span>
                                            <span className={cn("text-sm font-normal", darkMode ? "text-gray-300" : "text-gray-700")}>
                                                {plan.credits} / mo
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className={cn("text-sm font-light", darkMode ? "text-gray-400" : "text-gray-600")}>
                                                Video generations
                                            </span>
                                            <span className={cn("text-sm font-normal", darkMode ? "text-gray-300" : "text-gray-700")}>
                                                {plan.videoGenerations} videos
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <ul className="space-y-2 mb-6">
                                        {plan.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-center gap-2">
                                                <Check className={cn("w-4 h-4 flex-shrink-0", 
                                                    darkMode ? "text-green-400" : "text-green-600")} />
                                                <span className={cn("text-sm font-light", 
                                                    darkMode ? "text-gray-300" : "text-gray-700")}>
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                
                                <Button
                                    onClick={() => handleSubscribe(plan)}
                                    disabled={loading === plan.priceId || isCurrentPlan}
                                    className={cn("w-full mt-auto",
                                        isCurrentPlan 
                                            ? (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-500')
                                            : plan.popular 
                                                ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                                                : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white')
                                    )}
                                >
                                    {isCurrentPlan ? 'Current Plan' : `Switch to ${plan.name}`}
                                </Button>
                            </div>
                        );
                    })}
                </div>

                {/* How Credits Work Section */}
                <div className={cn("rounded-2xl p-8 mb-12 border", 
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                    <h3 className={cn("text-2xl font-normal mb-6 text-center", darkMode ? "text-white" : "text-gray-900")}>
                        How Credits Work
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="text-center">
                            <div className={cn("w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                                darkMode ? 'bg-orange-500/20' : 'bg-orange-100')}>
                                <Zap className="w-8 h-8 text-orange-500" />
                            </div>
                            <h4 className={cn("text-lg font-normal mb-2", darkMode ? "text-white" : "text-gray-900")}>
                                10 Credits
                            </h4>
                            <p className={cn("font-light text-sm", darkMode ? "text-gray-400" : "text-gray-600")}>
                                Create a new 30-second professional video from your product image
                            </p>
                        </div>
                        
                        <div className="text-center">
                            <div className={cn("w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                                darkMode ? 'bg-blue-500/20' : 'bg-blue-100')}>
                                <HelpCircle className="w-8 h-8 text-blue-500" />
                            </div>
                            <h4 className={cn("text-lg font-normal mb-2", darkMode ? "text-white" : "text-gray-900")}>
                                2.5 Credits
                            </h4>
                            <p className={cn("font-light text-sm", darkMode ? "text-gray-400" : "text-gray-600")}>
                                Request revisions or modifications to your existing videos
                            </p>
                        </div>
                        
                        <div className="text-center">
                            <div className={cn("w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center",
                                darkMode ? 'bg-green-500/20' : 'bg-green-100')}>
                                <CreditCard className="w-8 h-8 text-green-500" />
                            </div>
                            <h4 className={cn("text-lg font-normal mb-2", darkMode ? "text-white" : "text-gray-900")}>
                                Monthly Reset
                            </h4>
                            <p className={cn("font-light text-sm", darkMode ? "text-gray-400" : "text-gray-600")}>
                                Credits refresh every month on your billing date
                            </p>
                        </div>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="max-w-4xl mx-auto mb-12">
                    <h2 className={cn("text-2xl font-light text-center mb-8", darkMode ? "text-white" : "text-gray-900")}>
                        Frequently Asked Questions
                    </h2>
                    
                    <div className="space-y-4">
                        {faqData.map((faq, index) => (
                            <div
                                key={index}
                                className={cn("border rounded-lg overflow-hidden",
                                    darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white')}
                            >
                                <button
                                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                                    className={cn("w-full px-6 py-4 text-left flex items-center justify-between hover:bg-opacity-50 transition-colors",
                                        darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')}
                                >
                                    <span className={cn("font-normal", darkMode ? "text-white" : "text-gray-900")}>
                                        {faq.question}
                                    </span>
                                    <ChevronDown className={cn("w-5 h-5 transition-transform",
                                        expandedFaq === index ? 'rotate-180' : '',
                                        darkMode ? "text-gray-400" : "text-gray-500")} />
                                </button>
                                
                                {expandedFaq === index && (
                                    <div className={cn("px-6 pb-6 border-t", 
                                        darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50')}>
                                        <p className={cn("font-light leading-relaxed pt-4", 
                                            darkMode ? "text-gray-400" : "text-gray-600")}>
                                            {faq.answer}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Need Help Section */}
                <div className={cn("text-center rounded-2xl p-8 border", 
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200')}>
                    <h3 className={cn("text-xl font-normal mb-4", darkMode ? "text-white" : "text-gray-900")}>
                        Need Help?
                    </h3>
                    <p className={cn("font-light mb-6", darkMode ? "text-gray-400" : "text-gray-600")}>
                        Our support team is here to help you get the most out of Viduto
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <a
                            href="mailto:support@viduto.com"
                            className={cn("px-6 py-3 rounded-full font-normal transition-colors",
                                darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700')}
                        >
                            Email Support
                        </a>
                        <a
                            href="https://discord.gg/MdBr54xe"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn("px-6 py-3 rounded-full font-normal border transition-colors",
                                darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-100')}
                        >
                            Join Discord
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}