import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Upload, X, Plus, Loader2, Play, Edit3, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoPlayer } from './VideoPlayer';
import ProductionProgress from './ProductionProgress';
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
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [currentBrief, setCurrentBrief] = useState(null);
  const [editingBrief, setEditingBrief] = useState(false);
  const [briefText, setBriefText] = useState('');
  const [showGeneratingBrief, setShowGeneratingBrief] = useState(false);
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
        setCurrentBrief(null);
        setBriefText('');
        return;
      }

      setChatLoading(true);
      try {
        const { Chat, Message } = await import('@/api/entities');
        
        const chat = await Chat.get(chatId);
        setCurrentChat(chat);

        const chatMessages = await Message.filter({ chat_id: chatId }, 'created_at');
        setMessages(chatMessages || []);

        // Set current brief from existing messages - only set once
        const briefMessage = chatMessages?.find(msg => msg.metadata?.is_brief);
        if (briefMessage) {
          setCurrentBrief(briefMessage.content);
          setBriefText(briefMessage.content);
        }
      } catch (error) {
        console.error('Error loading chat:', error);
        toast.error('Failed to load chat');
      } finally {
        setChatLoading(false);
      }
    };

    loadChatData();
  }, [chatId]);

  // Generate video brief using AI
  const generateVideoBrief = async (chatMessages, chat, userPrompt = null, imageUrl = null) => {
    setShowGeneratingBrief(true);
    
    try {
      // Use provided parameters or find from messages
      let prompt = userPrompt;
      let image = imageUrl;
      
      if (!prompt || !image) {
        const initialMessage = chatMessages.find(msg => msg.message_type === 'user');
        
        if (!initialMessage) {
          throw new Error('No initial request found');
        }
        
        prompt = initialMessage.content;
        image = initialMessage.metadata?.image_url;
      }

      if (!image) {
        throw new Error('Product image is required for brief generation');
      }

      console.log('Generating brief with OpenAI...', { prompt, image });

      // Call LLM to generate brief
      const { InvokeLLM } = await import('@/api/integrations');
      const llmResponse = await InvokeLLM({
        prompt: prompt,
        image_url: image,
        max_tokens: 2000
      });

      console.log('OpenAI response received:', llmResponse);

      const generatedBrief = llmResponse.response;

      // Create assistant message with the brief
      const { Message } = await import('@/api/entities');
      const briefMessage = await Message.create({
        chat_id: chat.id,
        message_type: 'assistant',
        content: generatedBrief,
        metadata: { 
          is_brief: true,
          brief_generated_at: new Date().toISOString()
        }
      });

      // Update chat state
      const { Chat } = await import('@/api/entities');
      await Chat.update(chat.id, {
        workflow_state: 'awaiting_approval',
        brief: generatedBrief
      });

      // Update local state
      setMessages(prev => [...prev, briefMessage]);
      setCurrentBrief(generatedBrief);
      setBriefText(generatedBrief);
      setCurrentChat(prev => ({ ...prev, workflow_state: 'awaiting_approval', brief: generatedBrief }));
      setShowGeneratingBrief(false);

      toast.success('Video brief generated! Review and approve to start production.');

    } catch (error) {
      console.error('Error generating brief:', error);
      toast.error('Failed to generate video brief. Please try again.');
      setShowGeneratingBrief(false);
    }
  };

  // Handle brief editing
  const handleEditBrief = () => {
    setEditingBrief(true);
    setBriefText(currentBrief || '');
  };

  const handleSaveBrief = async () => {
    try {
      // Update chat with new brief
      const { Chat } = await import('@/api/entities');
      await Chat.update(chatId, { brief: briefText });

      // Update local state without creating new message
      setCurrentBrief(briefText);
      setCurrentChat(prev => ({ ...prev, brief: briefText }));
      
      // Update the existing brief message in local state
      setMessages(prev => prev.map(msg => 
        msg.metadata?.is_brief 
          ? { ...msg, content: briefText, metadata: { ...msg.metadata, brief_updated_at: new Date().toISOString() } }
          : msg
      ));

      setEditingBrief(false);
      toast.success('Brief updated successfully!');
    } catch (error) {
      console.error('Error updating brief:', error);
      toast.error('Failed to update brief');
    }
  };

  // Handle brief approval and start production
  const handleApproveBrief = async () => {
    // Check if user has enough credits before starting production
    try {
      const { User } = await import('@/api/entities');
      const currentUser = await User.me();
      if (!currentUser || currentUser.credits < 10) {
        toast.error('Insufficient credits. You need 10 credits to start video production.');
        return;
      }
    } catch (error) {
      console.error('Error checking user credits:', error);
      toast.error('Failed to verify credits. Please try again.');
      return;
    }

    try {
      setLoading(true);

      // Get the initial message with image URL
      const initialMessage = messages.find(msg => msg.message_type === 'user' && msg.metadata?.image_url);
      const imageUrl = initialMessage?.metadata?.image_url;

      // Call the production function
      const { triggerInitialVideoWorkflow } = await import('@/api/functions');
      const result = await triggerInitialVideoWorkflow({ 
        chat_id: chatId,
        brief: currentBrief || briefText,
        image_url: imageUrl
      });

      console.log('Video production started:', result);

      // Update chat state to production
      const { Chat } = await import('@/api/entities');
      await Chat.update(chatId, {
        workflow_state: 'in_production',
        production_started_at: new Date().toISOString(),
        active_video_id: result.video_id
      });

      setCurrentChat(prev => ({ 
        ...prev, 
        workflow_state: 'in_production',
        production_started_at: new Date().toISOString(),
        active_video_id: result.video_id
      }));

      // Add production tracking
      const videoId = result.video_id;
      setProductionVideos(prev => new Map(prev).set(videoId, {
        messageId: `brief_${chatId}`,
        startedAt: Date.now(),
        chatId: chatId,
        videoId: videoId
      }));

      // Refresh credits
      onCreditsRefreshed?.();

      toast.success('Video production started! This will take about 10 minutes.');

    } catch (error) {
      console.error('Error starting production:', error);
      toast.error(error.message || 'Failed to start video production. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

      // Check if chat is in production state
      if (currentChat?.workflow_state === 'in_production' && currentChat?.production_started_at) {
        const videoId = `video_${chatId}_production`;
        productionMap.set(videoId, {
          messageId: `production_${chatId}`,
          startedAt: new Date(currentChat.production_started_at).getTime(),
          chatId: chatId,
          videoId: videoId
        });
      }

      setProductionVideos(productionMap);
    };

    checkProduction();
  }, [messages, chatId, currentChat]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedFile) {
      if (!newMessage.trim()) {
        toast.error('Please enter a description for your video');
      } else {
        toast.error('Please upload a product image');
      }
      return;
    }
    
    if (isSubmitting) return;

    setIsSubmitting(true);
    setLoading(true);

    try {
      let currentChatId = chatId;
      let chat = currentChat;

      // Create new chat if none exists
      if (!currentChatId) {
        const { Chat } = await import('@/api/entities');
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
        console.log('ChatInterface - Uploading file:', { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type });
        const { UploadFile } = await import('@/api/integrations');
        const uploadResult = await UploadFile({ file: selectedFile });
        console.log('ChatInterface - Upload result:', uploadResult);
        fileUrl = uploadResult.file_url;
        
        // Validate that we got a proper URL, not base64
        if (fileUrl && fileUrl.startsWith('data:')) {
          throw new Error('File upload failed - received base64 URL instead of storage URL');
        }
      }

      // Create user message
      const { Message } = await import('@/api/entities');
      const userMessage = await Message.create({
        chat_id: currentChatId,
        message_type: 'user',
        content: newMessage.trim(),
        metadata: { image_url: fileUrl }
      });

      // Update messages immediately
      setMessages(prev => [...prev, userMessage]);

      // Check if this is the first message with image
      const isFirstMessage = messages.length === 0;
      
      // Clear form
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // If this is the first message, trigger brief generation
      if (isFirstMessage && fileUrl) {
        // Show generating brief indicator immediately
        setShowGeneratingBrief(true);
        // Generate brief in background - don't await to avoid blocking UI
        generateVideoBrief([userMessage], chat, newMessage.trim(), fileUrl);
      } else {
        // This is a revision request
        const { triggerRevisionWorkflow } = await import('@/api/functions');
        const result = await triggerRevisionWorkflow({ 
          chat_id: currentChatId,
          message_id: userMessage.id 
        });
        
        console.log('Revision workflow started:', result);
        
        // Add production tracking for revision
        if (result.video_id) {
          setProductionVideos(prev => new Map(prev).set(result.video_id, {
            messageId: userMessage.id,
            startedAt: Date.now(),
            chatId: currentChatId,
            videoId: result.video_id,
            isRevision: true
          }));
        }
        
        onCreditsRefreshed?.();
        toast.success('Video revision started! This will take about 5 minutes.');
      }

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
      
      // Update chat state back to awaiting approval
      const { Chat } = await import('@/api/entities');
      await Chat.update(chatId, {
        workflow_state: 'awaiting_approval',
        production_started_at: null
      });

      setCurrentChat(prev => ({ 
        ...prev, 
        workflow_state: 'awaiting_approval',
        production_started_at: null
      }));
      
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

  // Get the current brief from messages - only run once when messages change
  useEffect(() => {
    if (!currentBrief) {
      const briefMessage = messages.find(msg => msg.metadata?.is_brief);
      if (briefMessage) {
        setCurrentBrief(briefMessage.content);
        setBriefText(briefMessage.content);
      }
    }
  }, [messages, currentBrief]);

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
                {message.message_type === 'user' && (
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
                )}

                {/* AI Brief Message */}
                {message.message_type === 'assistant' && message.metadata?.is_brief && !showGeneratingBrief && (
                  <div className="flex justify-start">
                    <div className={`max-w-[90%] rounded-2xl p-6 ${
                      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-blue-50 border border-blue-200'
                    }`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-normal ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          📋 Video Brief
                        </h3>
                        {!editingBrief && (
                          <div className="flex gap-2">
                            <Button
                              onClick={handleEditBrief}
                              variant="outline"
                              size="sm"
                              className={`gap-2 ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}`}
                            >
                              <Edit3 className="w-4 h-4" />
                              Edit
                            </Button>
                          </div>
                        )}
                      </div>

                      {editingBrief ? (
                        <div className="space-y-4">
                          <textarea
                            value={briefText}
                            onChange={(e) => setBriefText(e.target.value)}
                            className={`w-full h-64 p-4 rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={handleSaveBrief}
                              className="bg-orange-500 text-white hover:bg-orange-600"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Save Changes
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingBrief(false);
                                setBriefText(currentBrief || '');
                              }}
                              variant="outline"
                              className={darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className={`prose prose-sm max-w-none ${
                            darkMode ? 'prose-invert' : ''
                          }`}>
                            <div className={`whitespace-pre-wrap font-light leading-relaxed ${
                              darkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {currentBrief || message.content}
                            </div>
                          </div>

                          {currentChat?.workflow_state === 'awaiting_approval' && (
                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                              <Button
                                onClick={handleApproveBrief}
                                disabled={loading}
                                className="bg-orange-500 text-white hover:bg-orange-600 gap-2"
                              >
                                {loading ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                                Approve & Start Production (10 credits)
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Regular AI Response with Video */}
                {message.message_type === 'assistant' && !message.metadata?.is_brief && message.metadata?.video_url && (
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

            {/* Brief Generation Loading */}
            {showGeneratingBrief && (
              <div className="flex justify-start">
                <div className={`max-w-[80%] rounded-2xl p-6 ${
                  darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                    <div>
                      <h3 className={`text-lg font-normal ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Generating Video Brief...
                      </h3>
                      <p className={`text-sm font-light ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Our AI is analyzing your request and creating a detailed video plan
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Production Progress */}
            {Array.from(productionVideos.values()).map((production) => (
              <ProductionProgress
                key={production.videoId}
                videoId={production.videoId}
                startedAt={production.startedAt}
                chatId={chatId}
                darkMode={darkMode}
                onCancel={handleCancelProduction}
                isCancelling={cancelling.has(production.videoId)}
                isRevision={production.isRevision || false}
              />
            ))}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Form - Only show if not in production and not awaiting approval */}
      {currentChat?.workflow_state !== 'in_production' && currentChat?.workflow_state !== 'awaiting_approval' && (
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
              <div className="flex-1">
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
                  disabled={isSubmitting || showGeneratingBrief}
                />
              </div>
              
              <div className="flex flex-col gap-2 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <Button
                  type="button" 
                  onClick={() => {
                    if (!newMessage.trim()) {
                      toast.error('Please enter a description for your video');
                      return;
                    }
                    if (!selectedFile) {
                      fileInputRef.current?.click();
                      return;
                    }
                    handleSubmit(new Event('submit'));
                  }}
                  size="icon"
                  disabled={isSubmitting || showGeneratingBrief}
                  className={`w-10 h-10 ${
                    !newMessage.trim() 
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                      : !selectedFile 
                        ? 'bg-blue-500 text-white hover:bg-blue-600' 
                        : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : !newMessage.trim() ? (
                    <Edit3 className="w-4 h-4" />
                  ) : !selectedFile ? (
                    <Upload className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}