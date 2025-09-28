import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Upload, X, Loader2, Play, Download, AlertCircle } from 'lucide-react';
import { Chat, Message, User, Video } from '@/api/entities';
import { UploadFile, InvokeLLM } from '@/api/integrations';
import { rateLimiter, startVideoProduction, checkVideoStatus, triggerRevisionWorkflow, lockingManager } from '@/api/functions';
import ProductionProgress from './ProductionProgress';
import RevisionProgressInline from "./RevisionProgressInline";
import { CreditsModal } from './CreditsModal';
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";

export default function ChatInterface({ chatId, onChatUpdate, onCreditsRefreshed, onNewChat, darkMode }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chat, setChat] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileUrl, setFileUrl] = useState('');
    const [user, setUser] = useState(null);
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const shouldAutoScroll = useRef(true);
    const lastMessageCount = useRef(0);
    const activeRevisionPolling = useRef({});
    const videoCompletionSounds = useRef(new Set()); // Track which videos have played sound

    // NEW: Throttling and backoff guards to prevent 429
    const lastLoadAtRef = useRef(0);
    const backoffUntilRef = useRef(0);
    const loadingInFlightRef = useRef(0); // Changed to a number to distinguish from boolean

    // Pagination config (initial load fast, then optionally load older on demand)
    const INITIAL_MESSAGES_LIMIT = 50;
    const LOAD_MORE_STEP = 50;
    const [messagesLimit, setMessagesLimit] = useState(INITIAL_MESSAGES_LIMIT);
    const [isFetchingOlder, setIsFetchingOlder] = useState(false);
    const [hasMoreMessages, setHasMoreMessages] = useState(true);

    // Allowed image types only
    const allowedImageExts = new Set(["jpg","jpeg","png","webp"]);
    const allowedMimeTypes = new Set(["image/jpeg","image/jpg","image/png","image/webp"]);
    
    const isLikelyImage = (file) => {
        const type = String(file?.type || "").toLowerCase();
        const name = String(file?.name || "").toLowerCase();
        const ext = name.includes(".") ? name.split(".").pop() : "";
        return allowedMimeTypes.has(type) || allowedImageExts.has(ext);
    };

    // Prompt templates for quick start on the new project screen (labels + body text without title)
    const promptTemplates = [
        {
            label: "Running Shoes",
            text: "My product is Nike-style running shoes with really good cushioning, super lightweight. My target audience are people who run or go to the gym regularly, like 25-45 year olds. My goal is to get them pumped up to hit their fitness goals and want to buy these shoes. My style is modern. My preferred colors are bright colors that pop, maybe blue and orange."
        },
        {
            label: "Diamond Necklace",
            text: "My product is a beautiful diamond necklace, perfect for anniversaries or special nights out. My target audience are women buying for themselves or men buying gifts, around 30-50. My goal is to make them feel absolutely gorgeous and worth it. My style is luxury. My preferred colors are sparkly silver with soft romantic lighting."
        },
        {
            label: "Health Supplement",
            text: "My product is high-quality vitamin D pills that actually work for boosting immunity. My target audience are health-focused people who care about what they put in their bodies, 35-65. My goal is to make them feel good about making a smart health choice they can trust. My style is minimalist. My preferred colors are clean whites and natural greens, nothing flashy."
        },
        {
            label: "Gaming Keyboard",
            text: "My product is an epic mechanical gaming keyboard with crazy RGB lights and smooth keys. My target audience are serious gamers and PC builders, mostly teens to 30s. My goal is to get them hyped about upgrading their gaming setup. My style is bold. My preferred colors are rainbow RGB effects with sleek black."
        }
    ];

    // Helpers: LLM-safe image handling (memoized to avoid changing deps on each render)
    const getExtFromUrl = useCallback((url) => {
        try {
            const clean = url.split('?')[0];
            const ext = clean.split('.').pop() || '';
            return ext.toLowerCase();
        } catch {
            return '';
        }
    }, []);

    const blobToJpegViaCanvas = useCallback(async (blob) => {
        try {
            const bitmap = await createImageBitmap(blob);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);
            const jpegBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
            return jpegBlob;
        } catch (e) {
            console.warn('blobToJpegViaCanvas failed:', e);
            return null;
        }
    }, []);

    const convertWebpUrlToJpeg = useCallback(async (url) => {
        try {
            const resp = await fetch(url, { mode: 'cors' });
            if (!resp.ok) return null;
            const blob = await resp.blob();
            // minimal guard: ensure it's actually an image
            if (!String(blob.type || '').toLowerCase().startsWith('image/')) return null;

            const jpegBlob = await blobToJpegViaCanvas(blob);
            if (!jpegBlob) return null;

            const file = new File([jpegBlob], `converted_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const { file_url } = await UploadFile({ file });
            return file_url || null;
        } catch (e) {
            console.warn('convertWebpUrlToJpeg failed:', e);
            return null;
        }
    }, [blobToJpegViaCanvas]);

    const getLlmSafeImageUrl = useCallback(async (url) => {
        if (!url) return null;
        const ext = getExtFromUrl(url);

        // HEIC/HEIF/TIFF אינם נתמכים ב-InvokeLLM — לא נעביר תמונה כדי למנוע 400
        // NOTE: With the new file upload restrictions, these types should ideally not reach here.
        // This check acts as a secondary safeguard if a pre-existing URL of these types is processed.
        if (['heic', 'heif', 'tif', 'tiff'].includes(ext)) {
            return null;
        }

        // WEBP ממירים ל-JPEG בצד לקוח כדי למנוע Unsupported file type
        if (ext === 'webp') {
            const converted = await convertWebpUrlToJpeg(url);
            return converted || null;
        }

        // JPG/PNG (ועוד פורמטים שכבר עובדים) — מעבירים כרגיל
        return url;
    }, [getExtFromUrl, convertWebpUrlToJpeg]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const isNearBottom = useCallback(() => {
        const chatContainer = messagesEndRef.current?.parentElement?.parentElement; // Adjusted to find the actual scrollable container
        if (!chatContainer) return true;

        const { scrollTop, scrollHeight, clientHeight } = chatContainer;
        const threshold = 100;
        return scrollHeight - scrollTop - clientHeight < threshold;
    }, []);

    const loadUser = useCallback(async () => {
        try {
            const currentUser = await User.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Error loading user:', error);
        }
    }, []);

    const loadChatData = useCallback(async (force = false, overrideLimit = null) => {
        // Ensure clean state when no chatId
        if (!chatId) {
            setChat(null);
            setMessages([]);
            return;
        }

        const now = Date.now();
        const effectiveLimit = overrideLimit ?? messagesLimit;
        const isHidden = typeof document !== 'undefined' ? document.hidden : false;

        // Respect backoff ONLY when set (e.g., after a real 429)
        if (!force && now < backoffUntilRef.current) {
            return;
        }

        // Avoid overlapping fetches
        if (!force && loadingInFlightRef.current) {
            return;
        }

        // Throttle frequency based on workflow state (faster in production)
        const minIntervalMs = (chat?.workflow_state === 'in_production') ? 3000 : 10000;
        if (!force && (now - lastLoadAtRef.current < minIntervalMs)) {
            return;
        }

        // If tab is hidden, slow down further unless forced
        if (!force && isHidden && (now - lastLoadAtRef.current < 12000)) {
            return;
        }

        loadingInFlightRef.current = true;
        try {
            // Fetch chat first so UI can render header/state quickly
            const chatData = await Chat.get(chatId);
            setChat(chatData);

            // Then fetch the latest N messages (ascending by created_date)
            const fetched = await Message.filter({ chat_id: chatId }, 'created_date', effectiveLimit);
            const safeMessages = fetched || [];
            setMessages(safeMessages);

            // If we exactly hit the limit, there may be more to load
            setHasMoreMessages(safeMessages.length >= effectiveLimit);

            lastLoadAtRef.current = Date.now();
        } catch (error) {
            // Robust status extraction without forcing 429 on any error
            let status = null;
            if (error?.response?.status != null) status = error.response.status;
            else if (error?.status != null) status = error.status;
            else if (String(error || '').includes('429')) status = 429;

            if (status === 429) {
                // Back off only for rate limits
                backoffUntilRef.current = Date.now() + 20000; // 20s
                console.warn('Rate limit (429). Backing off for 20s.');
            } else if (status === 404) {
                // Chat not found — clear local state
                console.warn(`Chat ${chatId} not found (404). Clearing state.`);
                setChat(null);
                setMessages([]);
            } else {
                // Log other errors but allow normal polling retries (no long backoff)
                console.error('Error loading chat data:', error);
            }
        } finally {
            loadingInFlightRef.current = false;
        }
    }, [chatId, messagesLimit, chat?.workflow_state]);

    // Create initial video brief (first-time) - new
    const generateVideoBrief = useCallback(async (userText, imageUrl, currentChatId) => {
        try {
            // Prevent duplicate "loading" messages
            const existing = await Message.filter({ chat_id: currentChatId }, 'created_date');
            const hasActiveLoading = (existing || []).some(m => m.metadata?.is_brief_loading && !m.metadata?.brief_loading_resolved_at);
            if (hasActiveLoading) return;

            // Show loading placeholder
            const loadingMsg = await Message.create({
                chat_id: currentChatId,
                message_type: 'assistant',
                content: '🧠 Analyzing your request...\n\nCreating a professional 30‑second video plan you can approve.',
                metadata: {
                    is_brief_loading: true,
                    generation_id: `brief_loading_${Date.now()}`
                }
            });

            const llmSafeUrl = await getLlmSafeImageUrl(imageUrl);

const prompt = `Create a video plan for: ${userText}`;            const brief = await InvokeLLM({
                prompt,
                file_urls: llmSafeUrl ? [llmSafeUrl] : undefined,
                add_context_from_internet: false
            });

            // Extract product type (supports bold/plain/old formats)
            const productTypeRegexBold = /\*\*PRODUCT TYPE:\*\*\s*\[(.*?)\]/i;
            const productTypeRegexPlain = /PRODUCT TYPE:\s*\[(.*?)\]/i;
            const productTypeRegexOld = /📦 \*\*PRODUCT TYPE\*\*\s*\[(.*?)\]/i;
            const productMatch =
                brief.match(productTypeRegexBold) ||
                brief.match(productTypeRegexPlain) ||
                brief.match(productTypeRegexOld);
            const productName = productMatch && productMatch[1]
                ? productMatch[1].trim().toLowerCase()
                : 'unknown';

            // Post the brief message
            await Message.create({
                chat_id: currentChatId,
                message_type: 'assistant',
                content: `## 📝 Your Video Plan\n\n${brief}`,
                metadata: {
                    is_brief: true,
                    brief_content: brief,
                    image_url: imageUrl || undefined,
                    llm_image_url: llmSafeUrl || undefined,
                    original_prompt: userText,
                    product_name: productName,
                    generation_id: `brief_${Date.now()}`
                }
            });

            // Post approval CTA
            await Message.create({
                chat_id: currentChatId,
                message_type: 'assistant',
                content: '## ✅ Ready to Create?\n\nThis plan will guide the AI to produce your professional 30‑second video with 5 scenes, background music, and voiceover.\n\nYou can:\n• Request changes to the plan\n• Approve and start production (costs 10 credits)',
                metadata: {
                    is_approval_section: true,
                    brief_content: brief,
                    image_url: imageUrl || undefined,
                    llm_image_url: llmSafeUrl || undefined,
                    original_prompt: userText,
                    product_name: productName,
                    generation_id: `approval_${Date.now()}`
                }
            });

            // Update chat to awaiting approval
            await Chat.update(currentChatId, { brief, workflow_state: 'awaiting_approval' });

            // Resolve loading placeholder
            await Message.update(loadingMsg.id, {
                metadata: {
                    is_brief_loading: false,
                    brief_loading_resolved_at: new Date().toISOString()
                }
            });

            await loadChatData(true);
        } catch (err) {
            console.error('generateVideoBrief error:', err);
            try {
                const fallback = await Message.create({
                    chat_id: currentChatId,
                    message_type: 'system',
                    content: '❌ Failed to generate the video plan. Please try again.',
                    metadata: { brief_generation_failed: true, generation_id: `brief_fail_${Date.now()}` }
                });
                await loadChatData(true);
            } catch {}
            toast.error('Failed to generate the video plan. Please try again.');
        }
    }, [getLlmSafeImageUrl, loadChatData]);


    // Ensure initial data load still happens and add visibility-based resume
    useEffect(() => {
        if (!chatId) return;
        // Reset pagination state when switching chats for snappy initial render
        setMessages([]);
        setMessagesLimit(INITIAL_MESSAGES_LIMIT);
        setHasMoreMessages(true);
        setIsFetchingOlder(false);
        lastLoadAtRef.current = 0;
        backoffUntilRef.current = 0;

        loadChatData(true);
        loadUser();
    }, [chatId, loadChatData, loadUser]);

    // NEW: resume polling when tab becomes visible
    useEffect(() => {
        const onVis = () => {
            if (!document.hidden) {
                // Force a refresh immediately when returning to the tab
                loadChatData(true);
            }
        };
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, [loadChatData]);

    // Auto-generate brief on first message — remove generateVideoBrief from deps to silence linter
    useEffect(() => {
        if (!chat || !messages || messages.length === 0) return;

        const initialMessage = messages.find(m => m.metadata?.is_initial_request && m.message_type === 'user');
        const hasLoadingBrief = messages.some(m => m.metadata?.is_brief_loading);
        const hasBrief = messages.some(m => m.metadata?.is_brief);
        const hasApprovalMessage = messages.some(m => m.metadata?.is_approval_section);

        if (initialMessage && !hasLoadingBrief && !hasBrief && !hasApprovalMessage && chat.workflow_state === 'draft') {
            generateVideoBrief(initialMessage.content, initialMessage.metadata.image_url, chatId);
        }
    }, [chat, messages, chatId]); // removed generateVideoBrief from deps

    useEffect(() => {
        if (!messages || messages.length === 0) return;

        const messageCountChanged = messages.length !== lastMessageCount.current;
        const isUserNearBottom = isNearBottom();

        if (messageCountChanged && (isUserNearBottom || shouldAutoScroll.current)) {
            scrollToBottom();
        }

        lastMessageCount.current = messages.length;
    }, [messages, isNearBottom]);

    useEffect(() => {
        const chatContainer = messagesEndRef.current?.parentElement?.parentElement;
        if (!chatContainer) return;

        const handleScroll = () => {
            shouldAutoScroll.current = isNearBottom();

            // If user scrolls near the top, load older messages (if available)
            if (chatContainer.scrollTop < 80) {
                // Inline the load-more logic to avoid referencing handleTopLoadMore before init
                if (!hasMoreMessages || isFetchingOlder) return;
                setIsFetchingOlder(true);
                const newLimit = messagesLimit + LOAD_MORE_STEP;
                setMessagesLimit(newLimit);
                Promise.resolve(loadChatData(true, newLimit))
                    .finally(() => setIsFetchingOlder(false));
            }
        };

        chatContainer.addEventListener('scroll', handleScroll);
        return () => chatContainer.removeEventListener('scroll', handleScroll);
    }, [isNearBottom, hasMoreMessages, isFetchingOlder, messagesLimit, loadChatData]);

    useEffect(() => {
        if (!chatId) return;

        const interval = setInterval(() => {
            loadChatData();
        }, 3000);

        return () => clearInterval(interval);
    }, [chatId, loadChatData]);

    useEffect(() => {
        if (!chatId) return;

        const videoPollingInterval = setInterval(() => {
            loadChatData();
        }, 3000);

        // Cleanup function for this specific interval
        return () => clearInterval(videoPollingInterval);
    }, [chatId, loadChatData]);

    // Enhanced sound effect for video completion
    const playVideoReadySound = useCallback((videoId) => {
        // Prevent duplicate sounds for the same video
        if (videoCompletionSounds.current.has(videoId)) {
            return;
        }
        
        videoCompletionSounds.current.add(videoId);
        
        try {
            // Create a more pleasant notification sound
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (!audioContext) {
                console.warn('AudioContext not supported by this browser.');
                return;
            }
            
            // Create a pleasant 3-note ascending chord
            const playNote = (frequency, startTime, duration) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(frequency, startTime);
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0, startTime);
                gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
                
                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };
            
            // Play a pleasant 3-note ascending chord
            const currentTime = audioContext.currentTime;
            playNote(523.25, currentTime, 0.3); // C5
            playNote(659.25, currentTime + 0.1, 0.3); // E5
            playNote(783.99, currentTime + 0.2, 0.4); // G5
            
            console.log(`🔊 Video ready sound played for video: ${videoId}`);
        } catch (error) {
            console.log('Audio notification not supported or failed to play:', error);
        }
    }, []);

    useEffect(() => {
        if (!chatId || !chat || chat.workflow_state !== 'in_production' || !chat.active_video_id || !chat.production_started_at) {
            return;
        }

        const isRevisionCurrentlyBeingPolledSeparately = messages.some(m =>
            (m.metadata?.revision_in_progress || m.metadata?.finalizing_revision) && m.metadata?.video_id === chat.active_video_id
        );

        if (isRevisionCurrentlyBeingPolledSeparately) {
            console.log(`Video ${chat.active_video_id} is a revision, deferring polling to dedicated handler.`);
            return;
        }

        const startTime = new Date(chat.production_started_at).getTime();
        const now = Date.now();
        const elapsed = now - startTime;

        const WAIT_BEFORE_CHECK = 30 * 1000;
        const TOTAL_TIMEOUT = 15 * 60 * 1000;

        let timeoutId;
        let intervalId;

        async function handleTimeout() {
            console.log('Video generation timeout - refunding credits');
            if (intervalId) clearInterval(intervalId);
            if (timeoutId) clearTimeout(timeoutId);

            toast.error('Video generation timed out after 15 minutes. Credits have been refunded.');

            try {
                await Message.create({
                    chat_id: chatId,
                    message_type: 'system',
                    content: '❌ **Video generation timed out**\n\nThe video took longer than expected to generate. Your credits have been automatically refunded. Please try again.',
                    metadata: {
                        timeout: true,
                        credits_refunded: chat.brief && chat.active_video_id ? 2.5 : 10, // Adjusted refund for revision if applicable
                        timeout_after_minutes: 15,
                        generation_id: `timeout_message_${Date.now()}`
                    }
                });

                await Chat.update(chatId, {
                    workflow_state: 'completed',
                    active_video_id: null
                });

                try {
                    await lockingManager({
                        action: 'release',
                        chatId: chatId
                    });
                } catch (lockError) {
                    console.error('Failed to release lock after timeout:', lockError);
                }

                await loadChatData(true); // Force load after timeout
                onChatUpdate?.();
            } catch (error) {
                console.error('Error creating timeout message or updating chat state:', error);
            }

            onCreditsRefreshed?.();
        }

        function startChecking() {
            console.log('Starting video status checks after 10 minutes...');
            let checkCount = 0;

            const checkVideoStatusWithTimeout = async () => {
                try {
                    checkCount++;
                    const currentElapsed = Date.now() - startTime;

                    if (currentElapsed >= TOTAL_TIMEOUT) {
                        clearInterval(intervalId);
                        await handleTimeout();
                        return;
                    }

                    const status = await checkVideoStatus({
                        videoId: chat.active_video_id,
                        chatId: chatId
                    });

                    console.log(`Video status check ${checkCount}: ${status.status}`);

                    if (status.status === 'completed') {
                        clearInterval(intervalId);
                        playVideoReadySound(chat.active_video_id); // Play sound when main video is ready
                        toast.success('Your video is ready!');
                        await loadChatData(true); // Force load after completion
                        onChatUpdate?.();
                        onCreditsRefreshed?.();
                    } else if (status.status === 'failed') {
                        clearInterval(intervalId);
                        toast.error('Video generation failed. Credits have been refunded.');
                        await loadChatData(true); // Force load after failure
                        onChatUpdate?.();
                        onCreditsRefreshed?.();
                    }

                } catch (error) {
                    console.error('Error checking video status:', error);
                    const currentElapsed = Date.now() - startTime;

                    if (currentElapsed >= TOTAL_TIMEOUT) {
                        clearInterval(intervalId);
                        await handleTimeout();
                    }
                }
            };

            intervalId = setInterval(checkVideoStatusWithTimeout, 5000);

            checkVideoStatusWithTimeout();
        }

        if (elapsed < WAIT_BEFORE_CHECK) {
            const waitTime = WAIT_BEFORE_CHECK - elapsed;
            console.log(`Waiting ${Math.round(waitTime / 1000)}s more before checking video status (started ${Math.round(elapsed / 1000)}s ago)...`);

            timeoutId = setTimeout(() => {
                startChecking();
            }, waitTime);
        } else if (elapsed < TOTAL_TIMEOUT) {
            console.log(`Already past initial wait time (${Math.round(elapsed / 1000)}s ago), starting checks now...`);
            startChecking();
        } else {
            console.log(`Video already timed out (started ${Math.round(elapsed / 1000)}s ago). Triggering timeout handler.`);
            handleTimeout();
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            if (intervalId) clearInterval(intervalId);
        };
    }, [chat?.workflow_state, chat?.active_video_id, chat?.production_started_at, chat?.brief, chatId, loadChatData, onChatUpdate, onCreditsRefreshed, messages, chat, playVideoReadySound]);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        // Only allow WEBP, PNG, JPEG
        if (!file || !isLikelyImage(file)) {
            // Show clear English error and reset input
            toast.error('Unsupported image format. Please upload a WEBP, PNG, or JPEG image.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            setSelectedFile(null);
            setFileUrl('');
            return;
        }
        setSelectedFile(file);
    };

    const modifyVideoBrief = async (userFeedback, briefMessage, currentChatId, loadingMessageId) => {
        try {
            const originalImgUrl = briefMessage?.metadata?.image_url;
            const llmSafeUrl = await getLlmSafeImageUrl(originalImgUrl);

            const modifiedBriefPrompt = `
The user wants to modify the video brief. Original brief:
"""${briefMessage.metadata.brief_content}"""

User feedback:
"""${userFeedback}"""

Update the plan to incorporate the feedback while maintaining the following exact structure and rules.

# VIDEO PLAN GENERATOR - FINAL VERSION

## CRITICAL INSTRUCTION
The voiceover for EACH SCENE must contain EXACTLY 15 words. Not 14, not 16. Your response will be validated and rejected if this rule is not followed precisely.

## PRODUCT COMPATIBILITY CHECK
If user requests these, respond: "This product type may not work optimally with AI video generation. Consider using static images or graphics instead."

UNSUITABLE PRODUCTS:
- Software, apps, digital services (no physical form)
- Very small items (pills, jewelry under 1cm, tiny accessories)
- Transparent/clear products without distinctive features
- Text-heavy products (books, documents, signs)
- Products requiring human demonstration (fitness equipment, tools)

## ROLE & OBJECTIVE
You are an elite video creative director specializing in viral TikTok content. Transform user's simple prompt and product image into a production-ready 30-second video plan optimized for MiniMax Hailuo 02 generation.

## INTERNAL ANALYSIS (DO NOT INCLUDE IN OUTPUT)
Analyze these elements internally before creating the plan:

PRODUCT PERSONALITY: Category, colors, features, value proposition, target emotion, price perception
USER INTENT: Explicit request, implicit desire, emotional goal, business objective, audience hints
AUDIENCE TARGETING: Age range, gender, context (self-purchase vs gifts), emotional goals
VIBE SELECTION: Match product type + user preference + audience + emotional goal

## MINIMAX HAILUO 02 STRENGTHS TO LEVERAGE
- Glass and metallic surfaces (excellent reflections)
- Water effects (droplets, steam, mist, bubbles)
- Particle systems (dust, sparkles, floating elements)
- Lighting transitions (temperature shifts, gradual changes)
- Texture reveals (macro details, surface interactions)
- Environmental atmospherics (fog, haze, controlled smoke)

## STRATEGIC SCENE ALLOCATION
SCENE 1: TIKTOK HOOK - Dynamic, attention-grabbing opener (controlled risk for impact)
SCENES 2-5: SAFE FOUNDATION - Conservative, reliable scenes ensuring completion

## VIBE-SPECIFIC ADAPTATIONS

LUXURY: Black marble, gold accents, elegant smoke, sophisticated lighting, champagne elements
MINIMAL: Pure white surfaces, clean lines, subtle shadows, even lighting, simple movements
TRENDY: Concrete textures, neon accents, gradient lighting, colorful particles, Instagram-worthy
COZY: Natural wood, soft fabrics, golden hour warmth, floating dust, intimate atmospherics
ENERGETIC: Metal surfaces, high contrast, bright highlights, rapid light pulses, dynamic backgrounds
DRAMATIC: Dark surfaces, moody shadows, cinematic lighting, smoke effects, film-noir style
PLAYFUL: Bright colors, cheerful lighting, confetti effects, bubbles, whimsical particles
ELEGANT: Silk textures, refined surfaces, soft lighting, graceful movements, sophisticated beauty
BOLD: Strong contrasts, powerful textures, confident lighting, striking effects, commanding presence

## PRODUCT-SPECIFIC SCENE SELECTION

JEWELRY/WATCHES: Glass reflections + lighting expertise + texture revelation
FASHION/ACCESSORIES: Particle effects + environmental staging + texture focus
BEAUTY/SKINCARE: Water effects + atmospheric lighting + transformation moments
TECH/ELECTRONICS: Glass mastery + particle systems + clean presentations
FOOD/BEVERAGE: Water specialties + steam effects + natural staging
HEALTH/SUPPLEMENTS: Clean presentations + professional staging + trust-building effects

## SCENE 1 HOOKS BY PRODUCT TYPE

LUXURY PRODUCTS: Product emerging from dramatic colored smoke with backlighting reveal
FASHION ITEMS: Color-changing LED lighting cycling through hues with camera orbit
BEAUTY PRODUCTS: Golden particles swirling around product with upward camera movement
TECH GADGETS: Holographic light effects pulsing with smooth tracking shot
FOOD/DRINKS: Steam effects with natural lighting and gentle product reveal

## AUDIENCE-APPROPRIATE TARGETING
Women 30-50 + "feel gorgeous" → Elegant, sophisticated scenes with warm lighting
Men 25-40 + "feel confident" → Bold, dramatic scenes with strong contrasts
Mixed audience + "gift giving" → Universal appeal with premium presentation

## FALLBACK MECHANISMS
Product category unclear → Default to TECH staging
VIBE conflicts with product → Default to TRENDY (most versatile)
Contradictory requests → Alert user and adapt to TRENDY

## WORD COUNT ENFORCEMENT
Each voiceover MUST be exactly 15 words using formula:
"[Emotional opener 3-4 words] + [Product benefit 6-8 words] + [Call to feeling 4-5 words]"

## VALIDATION CHECKLIST
✓ Scene 1 has TikTok-appropriate hook with dynamic elements
✓ All scenes use MiniMax strengths (water, glass, particles, lighting)
✓ Product appears prominently in all 5 scenes
✓ Voiceover is exactly 15 words per scene (75 total)
✓ Chosen vibe aligns with product + audience + emotional goal
✓ No unsuitable products flagged
✓ Scenes avoid problematic elements (walking, complex physics, rapid motion)

## OUTPUT FORMAT

**PRODUCT TYPE:** [Single word]

&nbsp;

**COMPATIBILITY CHECK:** [✅ Suitable / ⚠️ May have limitations / ❌ Not recommended]

&nbsp;

**VIDEO VIBE:** [LUXURY/MINIMAL/TRENDY/COZY/ENERGETIC/DRAMATIC/PLAYFUL/ELEGANT/BOLD]

&nbsp;

**TARGET AUDIENCE:** [Extracted from user input]

&nbsp;

**EMOTIONAL GOAL:** [feel gorgeous/confident/powerful/etc.]

&nbsp;

**MUSIC STYLE:** [Specific genre matching vibe and audience]

&nbsp;

**SCENE 1:**

**Visual:** [Attention-grabbing scene using MiniMax strengths and product-appropriate effects]

**Voiceover:** [Exactly 15 words - attention-grabbing opener]

&nbsp;

**SCENE 2:**

**Visual:** [Safe scene leveraging MiniMax strengths with controlled movement and lighting]

**Voiceover:** [Exactly 15 words - building desire]

&nbsp;

**SCENE 3:**

**Visual:** [Safe scene leveraging MiniMax strengths with controlled movement and lighting]

**Voiceover:** [Exactly 15 words - key benefit]

&nbsp;

**SCENE 4:**

**Visual:** [Safe scene leveraging MiniMax strengths with controlled movement and lighting]

**Voiceover:** [Exactly 15 words - lifestyle integration]

&nbsp;

**SCENE 5:**

**Visual:** [Safe scene leveraging MiniMax strengths with controlled movement and lighting]

**Voiceover:** [Exactly 15 words - emotional payoff]
`;

            const updatedBrief = await InvokeLLM({
                prompt: modifiedBriefPrompt,
                file_urls: llmSafeUrl ? [llmSafeUrl] : undefined,
                add_context_from_internet: false
            });

            // התאמת זיהוי סוג המוצר לפורמט החדש (מודגש) + תמיכה בישנים
            const productTypeRegexBold = /\*\*PRODUCT TYPE:\*\*\s*\[(.*?)\]/i;
            const productTypeRegexPlain = /PRODUCT TYPE:\s*\[(.*?)\]/i;
            const productTypeRegexOld = /📦 \*\*PRODUCT TYPE\*\*\s*\[(.*?)\]/i;
            const productNameMatch = updatedBrief.match(productTypeRegexBold) || updatedBrief.match(productTypeRegexPlain) || updatedBrief.match(productTypeRegexOld);
            const updatedProductName = productNameMatch && productNameMatch[1]
                ? productNameMatch[1].trim().toLowerCase()
                : (briefMessage?.metadata?.product_name || 'unknown');

            await Message.create({
                chat_id: currentChatId,
                message_type: 'assistant',
                content: `## 📝 Updated Video Plan\n\nBased on your feedback, here's your revised video plan:\n\n---\n\n${updatedBrief}`,
                metadata: {
                    is_brief: true,
                    brief_content: updatedBrief,
                    image_url: originalImgUrl,
                    llm_image_url: llmSafeUrl || undefined,
                    original_prompt: briefMessage.metadata.original_prompt,
                    product_name: updatedProductName,
                    is_updated_brief: true,
                    generation_id: `updated_brief_${Date.now()}`
                }
            });

            const currentMessages = await Message.filter({ chat_id: currentChatId }, 'created_date');
            const hasApprovalMessageForThisBrief = currentMessages.some(m =>
                m.metadata?.is_approval_section && m.metadata?.brief_content === updatedBrief
            );

            if (!hasApprovalMessageForThisBrief) {
                await Message.create({
                    chat_id: currentChatId,
                    message_type: 'assistant',
                    content: '## ✅ Ready to Create?\n\nThis updated video plan incorporates your requested changes.',
                    metadata: {