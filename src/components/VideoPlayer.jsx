
import React, { useState, useEffect } from 'react';
import { Video as VideoEntity } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';

export function VideoPlayer({ videoId, videoUrl, darkMode = false }) {
    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If we have a direct videoUrl, use it immediately
        if (videoUrl) {
            setVideo({ video_url: videoUrl });
            setLoading(false);
            return;
        }

        // Otherwise, try to fetch by videoId
        if (videoId) {
            setLoading(true);
            VideoEntity.get(videoId)
                .then((fetchedVideo) => {
                    setVideo(fetchedVideo);
                    setLoading(false);
                })
                .catch((error) => {
                    console.error('Error fetching video:', error);
                    setLoading(false);
                });
        }
    }, [videoId, videoUrl]);

    if (loading) {
        return (
            <div className={`rounded-lg p-4 text-center ${
                darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-500'
            }`}>
                Loading video...
            </div>
        );
    }

    if (!video || !video.video_url) {
        return (
            <div className={`rounded-lg p-4 text-center ${
                darkMode ? 'bg-gray-800 text-red-400' : 'bg-gray-200 text-red-500'
            }`}>
                Video not available
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl mx-auto">
            <video
                controls
                src={video.video_url}
                className="w-full h-auto rounded-lg shadow-lg"
                style={{ maxHeight: '600px' }}
                preload="metadata"
            >
                Your browser does not support the video tag.
            </video>

            <div className="mt-3 flex flex-wrap gap-2">
                <a href={video.video_url} download target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className={darkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : ''}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                    </Button>
                </a>
                <a href={video.video_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" className={darkMode ? 'bg-gray-800 text-gray-100 hover:bg-gray-700' : ''}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open in new tab
                    </Button>
                </a>
            </div>
        </div>
    );
}
