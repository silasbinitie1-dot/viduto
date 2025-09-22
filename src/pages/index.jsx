import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function IndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to /home immediately when someone visits /
    navigate('/home', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}