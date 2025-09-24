import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Upload, X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chat, Message } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { VideoPlayer } from './VideoPlayer';
import ProductionProgress from './ProductionProgress';
import { triggerInitialVideoWorkflow, triggerRevisionWorkflow } from '@/api/functions';
import { toast } from "sonner";

export function ChatInterface({ chatId, onChatUpdate, onCreditsRefreshed, onNewChat, darkMode = false }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(true);
  const [currentChat, setCurrentChat] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productionVideos, setProductionVideos] = useState(new Map());
  const [cancelling, setCancelling] = useState(new Set());
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat and messages
  useEffect(() => {
    const loadChatData = async () => {
      if (!chatId) {
        setChatLoading(false);
        setMessages([]);
        setCurrentChat(null);
        return;
      }

      setChatLoading(true);
      try {
        const chat = await Chat.get(chatId);
        setCurrentChat(chat);

        const chatMessages = await Message.filter({ chat_id: chatId }, 'created_date');
        const chatMessages = await Message.filter({ chat_id: chatId }, 'created_at');
        setMessages(chatMessages || []);
      } catch (error) {
        console.error('Error loading chat:', error);
        toast.error('Failed to load chat');
      } finally {
        setChatLoading(false);
      }
    };

    loadChatData();
  }, [chatId]);

  // Check for production videos
  useEffect(() => {
    const checkProduction = () => {
      const productionMap = new Map();
      
      messages.forEach(msg => {
        if (msg.message_type === 'user' && msg.metadata?.video_production_started) {
          const videoId = msg.metadata.video_id || `msg_${msg.id}`;
          productionMap.set(videoId, {
            messageId: msg.id,
            startedAt: new Date(msg.metadata.video_production_started).getTime(),
            chatId: chatId,
            videoId: videoId
          });
        }
      });

      setProductionVideos(productionMap);
    };

    checkProduction();
  }, [messages, chatId]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !selectedFile) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setLoading(true);

    try {
      let currentChatId = chatId;
      let chat = currentChat;

      // Create new chat if none exists
      if (!currentChatId) {
        chat = await Chat.create({
          title: newMessage.trim() || 'Creating brief...',
          status: 'active',
          workflow_state: 'draft'
        });
        currentChatId = chat.id;
        setCurrentChat(chat);
        onChatUpdate?.(currentChatId);
      }

      // Handle file upload if present
      let fileUrl = null;
      if (selectedFile) {
        const uploadResult = await UploadFile({ file: selectedFile });
        fileUrl = uploadResult.file_url;
      }

      // Create user message
      const userMessage = await Message.create({
        chat_id: currentChatId,
        message_type: 'user',
        content: newMessage.trim(),
        metadata: fileUrl ? { 
          image_url: fileUrl,
          is_initial_request: messages.length === 0
        } : { is_initial_request: messages.length === 0 }
      });

      // Update messages immediately
      setMessages(prev => [...prev, userMessage]);

      // Clear form
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Trigger video workflow
      if (messages.length === 0) {
        // Initial video
        await triggerInitialVideoWorkflow({ 
          chat_id: currentChatId,
          message_id: userMessage.id 
        });
      } else {
        // Revision
        await triggerRevisionWorkflow({ 
          chat_id: currentChatId,
          message_id: userMessage.id 
        });
      }

      // Refresh credits
      onCreditsRefreshed?.();

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const handleCancelProduction = async (chatId, videoId) => {
    setCancelling(prev => new Set(prev).add(videoId));
    
    try {
      // Remove from production tracking
      setProductionVideos(prev => {
        const newMap = new Map(prev);
        newMap.delete(videoId);
        return newMap;
      });
      
      toast.success('Video production cancelled');
    } catch (error) {
      console.error('Error cancelling production:', error);
      toast.error('Failed to cancel production');
    } finally {
      setCancelling(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
  };

  if (chatLoading) {
    return (
      <div className={`h-full flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Header */}
      <div className={`border-b p-4 flex items-center justify-between ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      }`}>
        <h2 className={`text-lg font-normal ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {currentChat?.title || 'New Project'}
        </h2>
        <Button
          onClick={onNewChat}
          variant="outline"
          size="sm"
          className={`gap-2 ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}`}
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !chatId ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                darkMode ? 'bg-orange-500/20' : 'bg-orange-100'
              }`}>
                <Upload className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className={`text-xl font-normal mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Start Your First Video
              </h3>
              <p className={`font-light ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Upload a product image and describe your video idea to get started.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div key={message.id} className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    darkMode ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white'
                  }`}>
                    <p className="font-light">{message.content}</p>
                    {message.metadata?.image_url && (
                      <div className="mt-3">
                        <img
                          src={message.metadata.image_url}
                          alt="Uploaded"
                          className="max-w-full h-auto rounded-lg"
                          style={{ maxHeight: '200px' }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Production Progress */}
                {productionVideos.has(message.metadata?.video_id || `msg_${message.id}`) && (
                  <ProductionProgress
                    videoId={message.metadata?.video_id || `msg_${message.id}`}
                    startedAt={productionVideos.get(message.metadata?.video_id || `msg_${message.id}`).startedAt}
                    chatId={chatId}
                    darkMode={darkMode}
                    onCancel={handleCancelProduction}
                    isCancelling={cancelling.has(message.metadata?.video_id || `msg_${message.id}`)}
                  />
                )}

                {/* AI Response with Video */}
                {message.metadata?.video_url && (
                  <div className="flex justify-start">
                    <div className={`max-w-[80%] rounded-2xl p-4 ${
                      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
                    }`}>
                      <VideoPlayer
                        videoUrl={message.metadata.video_url}
                        darkMode={darkMode}
                      />
                      {message.metadata.ai_response && (
                        <p className={`mt-4 font-light ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {message.metadata.ai_response}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Form */}
      <div className={`border-t p-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {selectedFile && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className={`text-sm font-medium flex-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {selectedFile.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className={`text-gray-400 hover:text-gray-600 transition-colors ${
                  darkMode ? 'hover:text-gray-300' : ''
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={messages.length === 0 ? "Describe your video idea..." : "Ask for changes or create a new video..."}
                className={`w-full p-3 rounded-xl border resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="icon"
                className={`w-10 h-10 ${
                  darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''
                }`}
                disabled={isSubmitting}
              >
                <Upload className="w-4 h-4" />
              </Button>
              
              <Button
                type="submit"
                size="icon"
                disabled={(!newMessage.trim() && !selectedFile) || isSubmitting}
                className="w-10 h-10 bg-orange-500 text-white hover:bg-orange-600"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}