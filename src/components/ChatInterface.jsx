import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, Upload, X, Loader2, Play, Download, AlertCircle } from "lucide-react";
import { Chat, Message, User, Video } from "@/api/entities";
import { Core } from "@/api/integrations";
import { 
  rateLimiter, 
  startVideoProduction, 
  checkVideoStatus, 
  triggerRevisionWorkflow, 
  lockingManager 
} from "@/api/functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ProductionProgress from "./ProductionProgress";
import RevisionProgressInline from "./RevisionProgressInline";
import { VideoPlayer } from "./VideoPlayer";

export default function ChatInterface({ 
  chatId, 
  onChatUpdate, 
  onCreditsRefreshed, 
  onNewChat, 
  darkMode = false 
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [currentChat, setCurrentChat] = useState(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingRevision, setIsGeneratingRevision] = useState(false);
  const [videoProgress, setVideoProgress] = useState(null);
  const [revisionProgress, setRevisionProgress] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [revisionPollingInterval, setRevisionPollingInterval] = useState(null);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const loadMessages = useCallback(async (chatIdToLoad) => {
    if (!chatIdToLoad) {
      setMessages([]);
      setCurrentChat(null);
      return;
    }

    try {
      const chat = await Chat.get(chatIdToLoad);
      setCurrentChat(chat);

      const chatMessages = await Message.filter({ chat_id: chatIdToLoad }, 'created_at');
      setMessages(chatMessages || []);

      if (chat.workflow_state === 'in_production') {
        const activeVideo = await Video.get(chat.active_video_id);
        if (activeVideo && activeVideo.status === 'processing') {
          if (activeVideo.is_revision) {
            setIsGeneratingRevision(true);
            setRevisionProgress({
              videoId: activeVideo.video_id,
              startedAt: new Date(activeVideo.processing_started_at).getTime()
            });
            startRevisionPolling(activeVideo.video_id);
          } else {
            setIsGeneratingVideo(true);
            setVideoProgress({
              videoId: activeVideo.video_id,
              startedAt: new Date(activeVideo.processing_started_at).getTime()
            });
            startVideoPolling(activeVideo.video_id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
      setCurrentChat(null);
    }
  }, []);

  useEffect(() => {
    loadMessages(chatId);
  }, [chatId, loadMessages]);

  const startVideoPolling = useCallback((videoId) => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    const interval = setInterval(async () => {
      try {
        const result = await checkVideoStatus({ videoId, chatId });
        
        if (result.status === 'completed') {
          clearInterval(interval);
          setPollingInterval(null);
          setIsGeneratingVideo(false);
          setVideoProgress(null);
          
          await loadMessages(chatId);
          if (onCreditsRefreshed) {
            onCreditsRefreshed();
          }
        } else if (result.status === 'failed') {
          clearInterval(interval);
          setPollingInterval(null);
          setIsGeneratingVideo(false);
          setVideoProgress(null);
          
          toast.error(result.error || 'Video generation failed');
          await loadMessages(chatId);
          if (onCreditsRefreshed) {
            onCreditsRefreshed();
          }
        }
      } catch (error) {
        console.error('Error checking video status:', error);
      }
    }, 5000);

    setPollingInterval(interval);
  }, [chatId, loadMessages, onCreditsRefreshed, pollingInterval]);

  const startRevisionPolling = useCallback((videoId) => {
    if (revisionPollingInterval) {
      clearInterval(revisionPollingInterval);
    }

    const interval = setInterval(async () => {
      try {
        const result = await checkVideoStatus({ videoId, chatId });
        
        if (result.status === 'completed') {
          clearInterval(interval);
          setRevisionPollingInterval(null);
          setIsGeneratingRevision(false);
          setRevisionProgress(null);
          
          await loadMessages(chatId);
          if (onCreditsRefreshed) {
            onCreditsRefreshed();
          }
        } else if (result.status === 'failed') {
          clearInterval(interval);
          setRevisionPollingInterval(null);
          setIsGeneratingRevision(false);
          setRevisionProgress(null);
          
          toast.error(result.error || 'Video revision failed');
          await loadMessages(chatId);
          if (onCreditsRefreshed) {
            onCreditsRefreshed();
          }
        }
      } catch (error) {
        console.error('Error checking revision status:', error);
      }
    }, 5000);

    setRevisionPollingInterval(interval);
  }, [chatId, loadMessages, onCreditsRefreshed, revisionPollingInterval]);

  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      if (revisionPollingInterval) {
        clearInterval(revisionPollingInterval);
      }
    };
  }, [pollingInterval, revisionPollingInterval]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return null;

    setIsUploading(true);
    try {
      const result = await Core.UploadFile({ file: selectedFile });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return result.file_url;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const generateBrief = async (userMessage, imageUrl) => {
    setIsGeneratingBrief(true);
    try {
      const briefResponse = await Core.InvokeLLM({
        prompt: userMessage,
        image_url: imageUrl,
        max_tokens: 2000
      });

      if (!briefResponse.success) {
        throw new Error(briefResponse.error || 'Failed to generate brief');
      }

      const briefMessage = await Message.create({
        chat_id: chatId,
        message_type: 'assistant',
        content: briefResponse.response,
        metadata: {
          brief_generated: true,
          tokens_used: briefResponse.usage?.total_tokens || 0
        }
      });

      await Chat.update(chatId, {
        brief: briefResponse.response,
        workflow_state: 'awaiting_approval'
      });

      setMessages(prev => [...prev, briefMessage]);

      const approvalMessage = await Message.create({
        chat_id: chatId,
        message_type: 'assistant',
        content: `## ✅ Ready to Create?

This updated video plan incorporates your requested changes and is optimized for maximum engagement.

**What happens next:**
- Click "Create Video" to start production (takes about 10 minutes)
- This will use 10 credits from your account
- You can request revisions afterward for 2.5 credits each

Ready to bring your vision to life?`,
        metadata: {
          approval_request: true,
          brief_ready: true
        }
      });

      setMessages(prev => [...prev, approvalMessage]);

    } catch (error) {
      console.error('Error generating brief:', error);
      toast.error('Failed to generate video plan');
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const handleCreateVideo = async () => {
    if (!currentChat || !currentChat.brief) {
      toast.error('No video plan available');
      return;
    }

    if (!user || (user.credits || 0) < 10) {
      toast.error('Insufficient credits. You need 10 credits to create a video.');
      return;
    }

    setIsGeneratingVideo(true);

    try {
      await lockingManager({
        action: 'acquire',
        chatId: chatId,
        reason: 'Video production in progress'
      });

      const systemMessage = await Message.create({
        chat_id: chatId,
        message_type: 'system',
        content: `🔧 Preparing your video environment...

✨ AI is creating your video. This will take about 6 minutes. Progress may appear to jump at first — that's normal.`,
        metadata: {
          production_initiated: true,
          estimate_minutes: 6,
          credits_used: 10
        }
      });

      setMessages(prev => [...prev, systemMessage]);

      const initialMessage = messages.find(msg => 
        msg.message_type === 'user' && msg.metadata?.image_url
      );

      if (!initialMessage?.metadata?.image_url) {
        throw new Error('Original product image not found');
      }

      const result = await startVideoProduction({
        chat_id: chatId,
        brief: currentChat.brief,
        image_url: initialMessage.metadata.image_url,
        is_revision: false,
        credits_used: 10
      });

      if (result.success) {
        setVideoProgress({
          videoId: result.video_id,
          startedAt: Date.now()
        });
        startVideoPolling(result.video_id);

        if (onCreditsRefreshed) {
          onCreditsRefreshed();
        }
      } else {
        throw new Error(result.error || 'Failed to start video production');
      }

    } catch (error) {
      console.error('Error creating video:', error);
      toast.error(error.message || 'Failed to start video creation');
      setIsGeneratingVideo(false);
      
      try {
        await lockingManager({
          action: 'release',
          chatId: chatId
        });
      } catch (unlockError) {
        console.error('Error releasing lock:', unlockError);
      }
    }
  };

  const handleRevisionRequest = async (revisionText) => {
    if (!currentChat || !currentChat.active_video_id) {
      toast.error('No active video found for revision');
      return;
    }

    if (!user || (user.credits || 0) < 2.5) {
      toast.error('Insufficient credits. You need 2.5 credits to create a revision.');
      return;
    }

    setIsGeneratingRevision(true);

    try {
      const result = await triggerRevisionWorkflow({
        message_id: 'revision_request',
        chat_id: chatId
      });

      if (result.success) {
        setRevisionProgress({
          videoId: result.video_id,
          startedAt: Date.now()
        });
        startRevisionPolling(result.video_id);

        if (onCreditsRefreshed) {
          onCreditsRefreshed();
        }
      } else {
        throw new Error(result.error || 'Failed to start revision');
      }

    } catch (error) {
      console.error('Error creating revision:', error);
      toast.error(error.message || 'Failed to start revision');
      setIsGeneratingRevision(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim() && !selectedFile) return;

    const messageText = inputValue.trim();
    setInputValue("");

    let imageUrl = null;
    if (selectedFile) {
      imageUrl = await handleUpload();
      if (!imageUrl) return;
    }

    setIsLoading(true);

    try {
      let newChat = currentChat;
      
      if (!chatId) {
        newChat = await Chat.create({
          title: messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText,
          workflow_state: 'draft'
        });
        
        if (onChatUpdate) {
          onChatUpdate(newChat.id);
        }
      }

      const userMessage = await Message.create({
        chat_id: newChat?.id || chatId,
        message_type: 'user',
        content: messageText,
        metadata: imageUrl ? { image_url: imageUrl, is_initial_request: !currentChat } : { is_initial_request: !currentChat }
      });

      setMessages(prev => [...prev, userMessage]);

      if (!currentChat && imageUrl) {
        await generateBrief(messageText, imageUrl);
      } else if (currentChat?.workflow_state === 'completed') {
        await handleRevisionRequest(messageText);
      } else {
        await generateBrief(messageText, imageUrl);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message) => {
    const isUser = message.message_type === 'user';
    const isSystem = message.message_type === 'system';
    
    if (message.metadata?.video_only && message.metadata?.video_url) {
      return (
        <div key={message.id} className="flex justify-start mb-6">
          <div className={`max-w-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-6 shadow-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <VideoPlayer videoUrl={message.metadata.video_url} darkMode={darkMode} />
          </div>
        </div>
      );
    }

    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-2xl px-4 py-3 rounded-2xl ${
          isUser 
            ? 'bg-orange-500 text-white' 
            : isSystem
              ? (darkMode ? 'bg-blue-900/50 text-blue-200 border border-blue-700' : 'bg-blue-50 text-blue-800 border border-blue-200')
              : (darkMode ? 'bg-gray-800 text-gray-100 border border-gray-700' : 'bg-white text-gray-900 border border-gray-200')
        } shadow-sm`}>
          
          {message.metadata?.image_url && (
            <div className="mb-3">
              <img 
                src={message.metadata.image_url} 
                alt="Uploaded" 
                className="max-w-full h-auto rounded-lg border border-gray-200"
                style={{ maxHeight: '200px' }}
              />
            </div>
          )}
          
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.content}
          </div>
          
          {message.metadata?.approval_request && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                onClick={handleCreateVideo}
                disabled={isGeneratingVideo || !user || (user.credits || 0) < 10}
                className="w-full bg-orange-500 text-white font-normal rounded-lg hover:bg-orange-600 transition-colors"
              >
                {isGeneratingVideo ? 'Creating Video...' : 'Create Video (10 credits)'}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!chatId) {
    return (
      <div className={`h-full flex flex-col items-center justify-center p-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="text-center max-w-md">
          <div className={`w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center ${darkMode ? 'bg-orange-500/20' : 'bg-orange-100'}`}>
            <Play className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-2xl font-light mb-4">Ready to create your first video?</h2>
          <p className={`font-light mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Start a new project to begin creating professional videos with AI
          </p>
          <Button
            onClick={onNewChat}
            className="bg-orange-500 text-white font-normal px-6 py-3 rounded-full hover:bg-orange-600 transition-colors"
          >
            Start New Project
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`border-b p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <h1 className={`text-lg font-normal truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {currentChat?.title || 'New Video Project'}
          </h1>
          <Button
            onClick={onNewChat}
            variant="outline"
            size="sm"
            className={darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
          >
            New Project
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(renderMessage)}
        
        {isGeneratingBrief && (
          <div className="flex justify-start mb-4">
            <div className={`max-w-2xl px-4 py-3 rounded-2xl ${darkMode ? 'bg-gray-800 text-gray-100 border border-gray-700' : 'bg-white text-gray-900 border border-gray-200'} shadow-sm`}>
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                <span className="text-sm">Creating your video plan...</span>
              </div>
            </div>
          </div>
        )}

        {isGeneratingVideo && videoProgress && (
          <div className="flex justify-center mb-6">
            <ProductionProgress 
              videoId={videoProgress.videoId}
              startedAt={videoProgress.startedAt}
              darkMode={darkMode}
            />
          </div>
        )}

        {isGeneratingRevision && revisionProgress && (
          <div className="flex justify-center mb-6">
            <RevisionProgressInline 
              startedAt={revisionProgress.startedAt}
              darkMode={darkMode}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={`border-t p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1 relative">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={currentChat?.workflow_state === 'completed' ? "Describe any changes you'd like..." : "Describe your video idea..."}
              className={`min-h-[44px] max-h-32 resize-none pr-12 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : ''}`}
              disabled={isLoading || isGeneratingBrief || isGeneratingVideo || isGeneratingRevision}
            />
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="ghost"
              size="icon"
              className={`absolute right-2 top-2 w-8 h-8 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
              disabled={isLoading || isGeneratingBrief || isGeneratingVideo || isGeneratingRevision}
            >
              <Upload className="w-4 h-4" />
            </Button>
          </div>

          {selectedFile && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-200'}`}>
              <span className={`text-sm truncate max-w-32 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {selectedFile.name}
              </span>
              <Button
                type="button"
                onClick={() => setSelectedFile(null)}
                variant="ghost"
                size="icon"
                className="w-6 h-6"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          <Button
            type="submit"
            disabled={(!inputValue.trim() && !selectedFile) || isLoading || isGeneratingBrief || isGeneratingVideo || isGeneratingRevision || isUploading}
            className="bg-orange-500 text-white font-normal px-6 rounded-lg hover:bg-orange-600 transition-colors"
          >
            {isLoading || isGeneratingBrief || isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}