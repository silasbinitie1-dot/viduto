import React from 'react';

export function VideoProgress({ videoId }) {
    return (
        <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-3 text-sm text-gray-600">Video is processing...</p>
        </div>
    );
}