import React from 'react';
import { Button } from "@/components/ui/button";

export const CtaSection = ({ onAuthRequired }) => {
  return (
    <section className="bg-gradient-to-br from-purple-600 to-blue-600 text-white py-20">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-normal mb-4">Ready to create amazing videos?

        </h2>
        <p className="text-xl mb-8 opacity-90 font-light">
          Join thousands of creators and start turning your product images into viral ads today.
        </p>
        <Button
          size="lg"
          onClick={onAuthRequired}
          className="bg-white text-blue-600 hover:bg-gray-100 font-normal text-lg px-8 py-4">

          Get Started For Free
        </Button>
      </div>
    </section>);

};