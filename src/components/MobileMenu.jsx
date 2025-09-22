import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const MobileMenu = ({ isOpen, onClose, user, handleAuthRequired }) => {
    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    onClick={onClose}
                />
            )}
            
            <div className={cn(
                "fixed top-20 left-4 right-4 bg-white rounded-2xl shadow-2xl z-50 border border-gray-200 transform transition-all duration-300 origin-top",
                isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
            )}>
                {/* Menu Items */}
                <div className="p-4">
                    <nav className="space-y-3">
                        <Link 
                            to="/features" 
                            onClick={onClose}
                            className="block py-2 px-3 text-gray-700 hover:text-orange-500 hover:bg-gray-50 rounded-lg transition-colors font-normal"
                        >
                            Features
                        </Link>
                        
                        <a 
                            href="https://discord.gg/MdBr54xe" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            onClick={onClose}
                            className="block py-2 px-3 text-gray-700 hover:text-orange-500 hover:bg-gray-50 rounded-lg transition-colors font-normal"
                        >
                            Community
                        </a>
                        
                        <Link 
                            to="/pricing" 
                            onClick={onClose}
                            className="block py-2 px-3 text-gray-700 hover:text-orange-500 hover:bg-gray-50 rounded-lg transition-colors font-normal"
                        >
                            Pricing
                        </Link>
                        
                        <Link 
                            to="/blog" 
                            onClick={onClose}
                            className="block py-2 px-3 text-gray-700 hover:text-orange-500 hover:bg-gray-50 rounded-lg transition-colors font-normal"
                        >
                            Blog
                        </Link>
                    </nav>

                    {/* Action Button */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                        {user ? (
                            <Button
                                asChild
                                className="w-full bg-orange-500 text-white font-normal py-2 rounded-lg hover:bg-orange-500/90 transition-all"
                            >
                                <Link to="/dashboard" onClick={onClose}>Dashboard</Link>
                            </Button>
                        ) : (
                            <Button
                                onClick={() => {
                                    handleAuthRequired();
                                    onClose();
                                }}
                                className="w-full bg-orange-500 text-white font-normal py-2 rounded-lg hover:bg-orange-500/90 transition-all"
                            >
                                Get Started
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};