
import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { checkVideoStatus } from '@/api/functions';
import { toast } from "sonner";

export default function ProductionProgress({ 
    videoId, 
    startedAt, 
    chatId, 
    darkMode = false, 
    onCancel, 
    isCancelling = false,
    isRevision = false,
    onVideoCompleted
}) {
    const [progress, setProgress] = useState(0);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [estimatedDuration] = useState(isRevision ? 5 * 60 * 1000 : 12 * 60 * 1000); // 5 or 12 minutes in ms
    const [videoStatus, setVideoStatus] = useState('processing');
    const [pollingActive, setPollingActive] = useState(true);
    
    // Polling for video status using the actual edge function
    useEffect(() => {
        if (!pollingActive) return;
        
        const pollStatus = async () => {
            try {
                const { checkVideoStatus } = await import('@/api/functions');
                const statusResult = await checkVideoStatus({
                    video_id: videoId,
                    chat_id: chatId
                });
                
                if (statusResult.status === 'completed' && statusResult.video_url) {
                    setVideoStatus('completed');
                    setProgress(100);
                    setPollingActive(false);
                    toast.success('Video completed successfully!');
                    onVideoCompleted?.(statusResult.video_url);
                } else if (statusResult.status === 'failed') {
                    setVideoStatus('failed');
                    setPollingActive(false);
                    toast.error('Video generation failed');
                } else {
                    // Update progress from server
                    if (statusResult.progress !== undefined) {
                        setProgress(statusResult.progress);
                    }
                }
            } catch (error) {
                console.error('Error polling video status:', error);
                // Continue polling even if there's an error
            }
        };
        
        // Poll immediately, then every 10 seconds
        pollStatus();
        const pollInterval = setInterval(pollStatus, 10000);
        
        return () => clearInterval(pollInterval);
    }, [pollingActive, onVideoCompleted]);

    useEffect(() => {
        if (!pollingActive) return;

        const timeInterval = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - startedAt) / 1000); // seconds
            setTimeElapsed(elapsed);
            
            // Only update progress from time if we're not getting it from server
            if (videoStatus === 'processing') {
                const progressPercent = Math.min((elapsed * 1000 / estimatedDuration) * 95, 95);
                setProgress(Math.max(progress, progressPercent));
            }
        }, 1000);

        return () => clearInterval(timeInterval);
    }, [startedAt, pollingActive, estimatedDuration, progress, videoStatus]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const getStatusMessage = () => {
        if (videoStatus === 'processing') {
            const estimateSeconds = estimatedDuration; // 5 or 12 minutes
            
            if (timeElapsed * 1000 < estimateSeconds) {
                const remaining = estimateSeconds - (timeElapsed * 1000);
                const remainingMinutes = Math.ceil(remaining / 60000);
                return `Creating your ${isRevision ? 'revised ' : ''}video... About ${remainingMinutes} minutes remaining`;
            } else {
                return `Finalizing your ${isRevision ? 'revised ' : ''}video... Almost ready!`;
            }
        } else if (videoStatus === 'completed') {
            return 'Video completed successfully!';
        } else if (videoStatus === 'failed') {
            return 'Video generation failed';
        }
        
        return 'Processing...';
    };

    return (
        <div className={`rounded-xl p-6 shadow-lg border ${
            darkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
        }`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    <div>
                        <h3 className={`text-lg font-normal ${
                            darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                            {isRevision ? 'Creating Revision' : 'Creating Video'}
                        </h3>
                    </div>
                </div>

                <Button
                    onClick={() => onCancel?.(chatId, videoId)}
                    disabled={isCancelling}
                    variant="outline"
                    size="icon"
                    className={`w-8 h-8 rounded-full ${
                        darkMode 
                            ? 'border-gray-600 text-gray-400 hover:text-gray-200 hover:bg-gray-700' 
                            : 'border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    }`}
                    title="Cancel production"
                >
                    {isCancelling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <X className="w-4 h-4" />
                    )}
                </Button>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className={`w-full rounded-full h-3 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                    <div
                        className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                
                <div className="flex justify-between items-center mt-2">
                    <span className={`text-sm font-medium ${
                        darkMode ? 'text-orange-400' : 'text-orange-600'
                    }`}>
                        {Math.round(progress)}%
                    </span>
                    <span className={`text-sm ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                        {formatTime(timeElapsed)}
                    </span>
                </div>
            </div>

            {/* Status Message */}
            <div className={`text-sm font-light ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
                {getStatusMessage()}
            </div>

            {progress >= 99 && (
                <div className={`mt-3 p-3 rounded-lg ${
                    darkMode ? 'bg-orange-900/20 border border-orange-700' : 'bg-orange-50 border border-orange-200'
                }`}>
                    <p className={`text-sm ${
                        darkMode ? 'text-orange-300' : 'text-orange-700'
                    }`}>
                        🎬 Your video is almost ready! It will appear automatically when processing completes.
                    </p>
                </div>
            )}
        </div>
    );
}
