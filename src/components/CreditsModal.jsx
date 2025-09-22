
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Zap } from 'lucide-react';
import { createStripeCheckoutSession } from '@/api/functions';
import { toast } from "sonner";

export const CreditsModal = ({ isOpen, onClose, onPurchaseComplete, darkMode = false }) => {
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handlePurchaseCredits = async () => {
        setLoading(true);
        try {
            const { data } = await createStripeCheckoutSession({
                priceId: 'price_1RxTVjDaWkYYoAByvUfEwWY9',
                mode: 'payment'
            });
            if (data && data.url) {
                window.location.href = data.url;
            } else {
                throw new Error('No checkout URL received');
            }
        } catch (error) {
            console.error('Error purchasing credits:', error);
            toast.error('שגיאה ברכישת קרדיטים. אנא נסה שוב.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300 animate-fadeIn" 
            onClick={onClose}
        >
            <div 
                className={`p-8 rounded-2xl max-w-md w-full relative shadow-2xl border transform transition-transform duration-300 animate-scaleIn ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
                onClick={e => e.stopPropagation()}
            >
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onClose} 
                    className={`absolute top-3 right-3 rounded-full ${
                        darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                >
                    <X className="w-5 h-5" />
                </Button>
                
                <div className="text-center mb-6">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        darkMode ? 'bg-orange-500/20' : 'bg-orange-100'
                    }`}>
                        <Zap className="w-8 h-8 text-orange-500" />
                    </div>
                    <h2 className={`text-2xl font-light mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Buy More Credits
                    </h2>
                    <p className={`font-light ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Add more credits to continue creating amazing videos
                    </p>
                </div>

                <div className="space-y-4">
                    <div className={`border rounded-lg p-4 text-center ${
                        darkMode ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-200'
                    }`}>
                        <h3 className={`font-normal mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Credit Pack</h3>
                        <p className={`text-2xl font-light mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>$10</p>
                        <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>10 credits</p>
                        <Button
                            onClick={handlePurchaseCredits}
                            disabled={loading}
                            className="w-full bg-orange-500 text-white font-normal rounded-lg hover:bg-orange-600 transition-colors"
                        >
                            {loading ? 'Processing...' : 'Purchase Now'}
                        </Button>
                    </div>

                    <div className="text-center">
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            Credits will be added to your account immediately after purchase
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
