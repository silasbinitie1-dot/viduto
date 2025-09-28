import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Upload, X, Loader2, Play, Download, AlertCircle } from 'lucide-react';
import { Chat, Message, User, Video } from '@/api/entities';
import { UploadFile, InvokeLLM } from '@/api/integrations';
import { rateLimiter } from '@/integrations/Core';
import { startVideoProduction } from '@/functions/startVideoProduction';
import { checkVideoStatus } from '@/functions/checkVideoStatus';
import { triggerRevisionWorkflow } from '@/functions/triggerRevisionWorkflow';
import { lockingManager } from '@/functions/lockingManager';
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

            const prompt = `
Create a production-ready plan from the user's input.

User input:
"""${userText}"""

Follow these EXACT rules and structure.

# VIDEO PLAN GENERATOR - FINAL VERSION

## CRITICAL INSTRUCTION
The voiceover for EACH SCENE must contain EXACTLY 15 words. Not 14, not 16.

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
PRODUCT PERSONALITY, USER INTENT, AUDIENCE TARGETING, VIBE SELECTION.

## MINIMAX HAILUO 02 STRENGTHS TO LEVERAGE
Glass/metal reflections, water/steam, particle systems, lighting transitions, texture reveals, atmospherics.

## STRATEGIC SCENE ALLOCATION
SCENE 1: TikTok hook. SCENES 2-5: safe reliable scenes.

## VIBE-SPECIFIC ADAPTATIONS
LUXURY, MINIMAL, TRENDY, COZY, ENERGETIC, DRAMATIC, PLAYFUL, ELEGANT, BOLD (use appropriate staging).

## PRODUCT-SPECIFIC SCENE SELECTION
Jewelry/watches, fashion, beauty, tech, food/beverage, health/supplements.

## SCENE 1 HOOKS BY PRODUCT TYPE
Use appropriate hook per category.

## AUDIENCE-APPROPRIATE TARGETING
Match vibe to audience & goal.

## FALLBACK MECHANISMS
If unclear → default to TECH. Conflicts → TRENDY. Contradictions → adapt to TRENDY.

## WORD COUNT ENFORCEMENT
Each voiceover MUST be exactly 15 words using:
"[Emotional opener 3-4 words] + [Benefit 6-8 words] + [Call to feeling 4-5 words]"

## VALIDATION CHECKLIST
✓ Hook ✓ MiniMax strengths ✓ Product always visible ✓ 15 words per scene ✓ Vibe alignment ✓ Avoid problematic elements.

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
**Visual:** [...]
**Voiceover:** [Exactly 15 words]

&nbsp;

**SCENE 2:**
**Visual:** [...]
**Voiceover:** [Exactly 15 words]

&nbsp;

**SCENE 3:**
**Visual:** [...]
**Voiceover:** [Exactly 15 words]

&nbsp;

**SCENE 4:**
**Visual:** [...]
**Voiceover:** [Exactly 15 words]

&nbsp;

**SCENE 5:**
**Visual:** [...]
**Voiceover:** [Exactly 15 words]
`;

            const brief = await InvokeLLM({
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
                    content: '## ✅ Ready to Create?\n\nThis updated video plan incorporates your requested changes and will guide the AI to produce your professional 30-second video with 5 scenes, background music, and voiceover.\n\n**You can:**\n• Request more changes to the plan\n• Approve and start production **(costs 10 credits)**',
                    metadata: {
                        is_approval_section: true,
                        brief_content: updatedBrief,
                        image_url: originalImgUrl,
                        llm_image_url: llmSafeUrl || undefined,
                        original_prompt: briefMessage.metadata.original_prompt,
                        product_name: updatedProductName,
                        is_updated_approval: true,
                        generation_id: `updated_approval_${Date.now()}`
                    }
                });
            }

            await Chat.update(currentChatId, { brief: updatedBrief });

            // Mark related "modification loading" message as resolved if provided
            if (loadingMessageId) {
                await Message.update(loadingMessageId, {
                    metadata: {
                        is_modification_loading: false,
                        modification_resolved_at: new Date().toISOString()
                    }
                });
            }

            await loadChatData(true);
        } catch (error) {
            console.error('Error modifying video brief:', error);
            toast.error('Failed to modify video brief. Please try again.');
            if (loadingMessageId) {
                await Message.update(loadingMessageId, {
                    metadata: {
                        is_modification_loading: false,
                        modification_failed: true,
                        modification_resolved_at: new Date().toISOString()
                    }
                });
            }
            await loadChatData(true);
        }
    };

    const handleStartProduction = async (brief, imageUrl, originalPrompt, currentChatId) => {
        console.log('🎬 handleStartProduction called with:', { brief: !!brief, imageUrl, originalPrompt: !!originalPrompt, currentChatId });

        await loadUser();
        if ((user?.credits || 0) < 10) {
            toast.error('You don\'t have enough credits for this request, upgrade plan and try again.');
            setShowCreditsModal(true);
            return;
        }

        // Check rate limits before starting
        try {
            // Ensure user object is loaded and has an email before attempting rate limit check
            if (!user || !user.email) {
                console.warn('User email not available for rate limiting, skipping check.');
            } else {
                const rateLimitCheck = await rateLimiter({ operation: 'start_video', key: user.email });
                if (rateLimitCheck.error) {
                    toast.error(rateLimitCheck.message || 'Too many concurrent operations. Please wait.');
                    return;
                }
            }
        } catch (rateLimitError) {
            console.warn('Rate limit check failed:', rateLimitError);
            // Continue anyway if rate limiter is down or misconfigured
        }

        if (isLoading) return; // Prevent double click
        setIsLoading(true);

        // NEW: show instant feedback and placeholder in chat to avoid perceived delay
        const tempId = `temp_start_${Date.now()}`;
        setMessages((prev) => [
            ...prev,
            {
                id: tempId,
                chat_id: currentChatId,
                message_type: 'system',
                content: '🎬 Starting your video...',
                metadata: {
                    starting_placeholder: true,
                    generation_id: tempId
                }
            }
        ]);
        const startingToast = toast.loading('Starting your video...');

        try {
            try {
                const lockStatus = await lockingManager({
                    action: 'status',
                    chatId: currentChatId
                });

                if (lockStatus.data?.is_locked) {
                    console.log('Chat is locked, attempting to release...');
                    await lockingManager({
                        action: 'release',
                        chatId: currentChatId
                    });
                }
            } catch (lockError) {
                console.warn('Lock status check/release failed:', lockError);
            }

            const payload = {
                chatId: currentChatId,
                brief: brief || originalPrompt,
                imageUrl: imageUrl,
                creditsUsed: 10
            };
            console.log('📤 Sending payload to startVideoProduction:', payload);

            const result = await startVideoProduction(payload);

            // Dismiss the loading toast and replace placeholder
            toast.dismiss(startingToast);

            if (result.success) {
                toast.success('Video production started! This will take about 6 minutes.');

                // Optimistically update chat state to render progress immediately
                setChat((prev) => ({
                    ...(prev || {}),
                    id: currentChatId,
                    workflow_state: 'in_production',
                    active_video_id: result.videoId || result.video_id,
                    production_started_at: new Date().toISOString()
                }));

                // Replace placeholder with a persisted system message for clarity
                // First remove the placeholder locally
                setMessages((prev) => prev.filter((m) => m.id !== tempId));
                // Then create a persisted message
                await Message.create({
                    chat_id: currentChatId,
                    message_type: 'system',
                    content: "🔧 Preparing your video environment...\n\n✨ AI is creating your video. This will take about 6 minutes. Progress may appear to jump at first — that's normal.",
                    metadata: {
                        production_initiated: true,
                        estimate_minutes: 6,
                        video_id: result.videoId || result.video_id,
                        generation_id: `production_start_${Date.now()}`
                    }
                });

                await Chat.update(currentChatId, {
                    workflow_state: 'in_production',
                    active_video_id: result.videoId || result.video_id,
                    production_started_at: new Date().toISOString()
                });

                await loadChatData(true); // Force load after production started
                onChatUpdate?.();
                onCreditsRefreshed?.();
            }
        } catch (error) {
            console.error('❌ Start production error:', error);
            toast.dismiss(startingToast);
            // Remove placeholder on error
            setMessages((prev) => prev.filter((m) => m.id !== tempId));

            if (error.message?.includes('CHAT_LOCKED') || error.response?.status === 423) {
                const shouldForceUnlock = window.confirm(
                    'The chat appears to be locked from a previous operation. Would you like to force unlock and try again?'
                );
                
                if (shouldForceUnlock) {
                    try {
                        await lockingManager({
                            action: 'force_release',
                            chatId: currentChatId,
                            forceUnlock: true,
                            reason: 'User requested force unlock'
                        });
                        
                        toast.success('Lock released successfully. Please try starting production again.');
                        
                        await Chat.update(currentChatId, {
                            workflow_state: 'awaiting_approval'
                        });
                        
                        await loadChatData(true); // Force load after force unlock
                        onChatUpdate?.();
                    } catch (forceUnlockError) {
                        console.error('Force unlock failed:', forceUnlockError);
                        toast.error('Failed to force unlock. Please contact support.');
                    }
                }
            } else if (error.message?.includes('INSUFFICIENT_CREDITS')) {
                setShowCreditsModal(true);
            } else {
                toast.error('Failed to start video production. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleRevisionRequest = async (revisionRequest, parentVideoId, originalBrief, originalImageUrl, currentChatId) => {
        await loadUser();
        if ((user?.credits || 0) < 2.5) { // Updated credit check to 2.5
            toast.error('You don\'t have enough credits for this request, upgrade plan and try again.');
            setShowCreditsModal(true);
            return;
        }

        setIsLoading(true);

        try {
            const result = await triggerRevisionWorkflow({
                revisionRequest,
                parentVideoId,
                chatId: currentChatId,
                brief: originalBrief,
                imageUrl: originalImageUrl,
                creditsUsed: 2.5 // Updated creditsUsed to 2.5
            });

            if (result.success) {
                toast.success('Revision started! This will take about 3 minutes.'); // UPDATED 3 minutes

                await Chat.update(currentChatId, {
                    workflow_state: 'in_production',
                    active_video_id: result.video_id,
                    production_started_at: new Date().toISOString()
                });

                await Message.create({
                    chat_id: currentChatId,
                    message_type: 'system',
                    content: '🔄 **Creating your revised video...**\n\nApplying your requested changes. This will take about 3 minutes.', // UPDATED 3 minutes
                    metadata: {
                        revision_in_progress: true,
                        parent_video_id: parentVideoId,
                        video_id: result.video_id,
                        estimate_minutes: 3, // UPDATED to 3
                        revision_request: revisionRequest,
                        original_video_id: parentVideoId,
                        generation_id: `revision_in_progress_${Date.now()}`
                    }
                });

                startRevisionPolling(result.video_id, currentChatId);

                await loadChatData(true); // Force load after revision started
                onChatUpdate?.();
                onCreditsRefreshed?.();
            }
        } catch (error) {
            if (error.message?.includes('INSUFFICIENT_CREDITS')) {
                setShowCreditsModal(true);
            } else {
                toast.error('Failed to start revision. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const startRevisionPolling = (videoId, currentChatId) => {
        if (activeRevisionPolling.current[videoId]) {
            clearInterval(activeRevisionPolling.current[videoId].interval);
            clearTimeout(activeRevisionPolling.current[videoId].timeout);
            delete activeRevisionPolling.current[videoId];
        }

        // Store the initial timeout handle immediately so it can be cleared if needed
        const initialTimeoutHandle = setTimeout(async () => {
            // Check if finalizing message already exists before creating
            const currentMessages = await Message.filter({ chat_id: currentChatId }, 'created_date');
            const hasFinalizingMessage = currentMessages.some(m =>
                m.metadata?.finalizing_revision && m.metadata?.video_id === videoId
            );
            
            if (!hasFinalizingMessage) {
                await Message.create({
                    chat_id: currentChatId,
                    message_type: 'system',
                    content: '✨ **Finalizing your revised video...**\n\nAlmost ready!',
                    metadata: {
                        finalizing_revision: true,
                        video_id: videoId,
                        generation_id: `finalizing_${videoId}_${Date.now()}`
                    }
                });
                
                await loadChatData(true); // Force load after finalizing message
            }

            const pollIntervalHandle = setInterval(async () => {
                try {
                    const statusResult = await checkVideoStatus({
                        videoId: videoId,
                        chatId: currentChatId
                    });

                    if (statusResult.status === 'completed') {
                        clearInterval(pollIntervalHandle);
                        if (activeRevisionPolling.current[videoId]?.timeout) {
                            clearTimeout(activeRevisionPolling.current[videoId].timeout); // Clear failsafe
                        }
                        delete activeRevisionPolling.current[videoId];
                        playVideoReadySound(videoId);
                        toast.success('Your revised video is ready!');
                        await loadChatData(true); // Force load after revision completed
                        onChatUpdate?.();
                        onCreditsRefreshed?.();

                    } else if (statusResult.status === 'failed') {
                        clearInterval(pollIntervalHandle);
                        if (activeRevisionPolling.current[videoId]?.timeout) {
                            clearTimeout(activeRevisionPolling.current[videoId].timeout); // Clear failsafe
                        }
                        delete activeRevisionPolling.current[videoId];
                        toast.error('Revision failed. Please try again.');
                        await loadChatData(true); // Force load after revision failed
                        onCreditsRefreshed?.();
                    }

                } catch (error) {
                    console.error('Error checking revision status:', error);
                }
            }, 3000);

            // This failsafe starts 2 minutes AFTER the initial request (initialTimeoutHandle),
            // and should time out 7 minutes AFTER the initial request.
            // So, 5 minutes from when this `initialTimeoutHandle` callback executes.
            const failsafeTimeoutHandle = setTimeout(() => {
                clearInterval(pollIntervalHandle);
                delete activeRevisionPolling.current[videoId];
                toast.error('Revision generation timed out. Credits have been refunded.');
                loadChatData(true); // Force load after revision timeout
                onCreditsRefreshed?.();
            }, 5 * 60 * 1000); // 5 minutes after 'finalizing' message appears

            // Update the stored handles once polling and its failsafe are set up
            activeRevisionPolling.current[videoId] = {
                interval: pollIntervalHandle,
                timeout: failsafeTimeoutHandle
            };

        }, 2 * 60 * 1000); // Initial buffer before "finalizing" message appears

        // Store the initial timeout handle immediately
        activeRevisionPolling.current[videoId] = { interval: null, timeout: initialTimeoutHandle };
    };

    const handleCancelProduction = async (currentChatId, videoId) => {
        if (isCancelling) return;
        
        setIsCancelling(true);
        
        try {
            const videos = await Video.filter({ video_id: String(videoId) }, '-updated_date', 1);
            if (videos && videos.length > 0) {
                await Video.update(videos[0].id, {
                    status: 'cancelled',
                    cancelled_by: user?.email || 'user',
                    cancellation_reason: 'User requested cancellation',
                    processing_completed_at: new Date().toISOString()
                });
            }

            await Chat.update(currentChatId, {
                workflow_state: 'completed',
                active_video_id: null
            });

            if (user) {
                const currentCredits = Number(user.credits || 0);
                // Determine refund amount based on whether it was a revision or full production
                const isRevisionCancellation = messages.some(m => 
                    m.metadata?.revision_in_progress && m.metadata?.video_id === String(videoId)
                );
                const refundAmount = isRevisionCancellation ? 2.5 : 10; // 2.5 for revision, 10 for full production
                const newCredits = currentCredits + refundAmount;
                
                await User.update(user.id, { 
                    credits: newCredits 
                });
                
                setUser({ ...user, credits: newCredits });

                const refundMessage = `🚫 **Video production cancelled**\n\nYou successfully cancelled the video production. Your ${refundAmount} credits have been refunded to your account.`;

                await Message.create({
                    chat_id: currentChatId,
                    message_type: 'system',
                    content: refundMessage,
                    metadata: {
                        video_cancelled: true,
                        credits_refunded: refundAmount,
                        cancelled_video_id: String(videoId),
                        generation_id: `cancellation_${Date.now()}`
                    }
                });
            }

            try {
                await lockingManager({
                    action: 'release',
                    chatId: currentChatId
                });
            } catch (lockError) {
                console.error('Failed to release lock after cancellation:', lockError);
            }

            await loadChatData(true); // Force load after cancellation
            onChatUpdate?.();
            onCreditsRefreshed?.();

            toast.success('Video production cancelled successfully. Credits have been refunded.');

        } catch (error) {
            console.error('Error cancelling production:', error);
            toast.error('Failed to cancel production. Please try again.');
        } finally {
            setIsCancelling(false);
        }
    };

    const processChatMessage = async (currentChatId) => {
        setIsLoading(true);
        let uploadedFileUrl = fileUrl;

        try {
            // Check for existing lock to prevent duplicate processing
            try {
                const { data: lockStatus } = await lockingManager({
                    action: 'status',
                    chatId: currentChatId
                });

                if (lockStatus?.is_locked) {
                    toast.error(`Chat is currently locked: ${lockStatus.lock_reason}`);
                    setIsLoading(false);
                    return;
                }
            } catch (lockError) {
                console.warn('Lock status check failed:', lockError);
            }

            if (selectedFile && !fileUrl) {
                const { file_url } = await UploadFile({ file: selectedFile });
                uploadedFileUrl = file_url;
                setFileUrl(file_url);
            }

            const existingMessages = await Message.filter({ chat_id: currentChatId }, 'created_date');
            const safeExistingMessages = existingMessages || [];

            const isFirstMessageWithImage = safeExistingMessages.length === 0 && uploadedFileUrl;

            // NEW: enrich metadata with original file info and preview availability
            const originalName = selectedFile?.name || '';
            const originalType = (selectedFile?.type || '').toLowerCase();
            const ext = originalName.toLowerCase().includes(".") ? originalName.toLowerCase().split(".").pop() : '';
            // Update preview_unavailable logic to reflect new allowed types.
            // If the file was uploaded, it should be a supported type for LLM, so no preview unavailable
            // unless it's a WEBP that needs client-side conversion (which is handled by getLlmSafeImageUrl).
            const previewUnavailable = false; // With current restrictions, if `selectedFile` exists, it's previewable or convertible.

            // Create user message
            await Message.create({
                chat_id: currentChatId,
                message_type: 'user',
                content: input.trim(), // This should be what the user typed, not the briefPrompt
                metadata: {
                    ...(uploadedFileUrl ? { image_url: uploadedFileUrl } : {}),
                    ...(isFirstMessageWithImage ? { is_initial_request: true } : {}),
                    ...(uploadedFileUrl ? {
                        original_file_name: originalName,
                        original_file_type: originalType,
                        preview_unavailable: Boolean(previewUnavailable)
                    } : {}),
                    generation_id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                }
            });

            await loadChatData(true); // Force load after user message

            const updatedChatData = await Chat.get(currentChatId);
            setChat(updatedChatData);

            const currentMessages = await Message.filter({ chat_id: currentChatId }, 'created_date');
            const safeCurrentMessages = currentMessages || [];

            const isInitialRequest = safeCurrentMessages.length === 1 && safeCurrentMessages[0].metadata?.is_initial_request;
            const briefMessageExists = safeCurrentMessages.some(m => m.metadata?.is_brief && !m.metadata?.video_completed);
            const isBriefResponse = briefMessageExists && updatedChatData?.workflow_state === 'awaiting_approval';

            const completedVideoMessage = safeCurrentMessages
                .filter(m => m.metadata?.video_completed && m.message_type === 'assistant')
                .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
            const isRevisionRequest = !!completedVideoMessage && updatedChatData?.workflow_state === 'completed';

            if (isInitialRequest) {
                console.log('Generating video brief for initial request...');
                // Pass the user's actual input to generateVideoBrief, not the briefPrompt
                await generateVideoBrief(input.trim(), uploadedFileUrl, currentChatId);
            } else if (isBriefResponse) {
                const lowerInput = input.toLowerCase();
                if (lowerInput.includes('approve') || lowerInput.includes('start') || lowerInput.includes('proceed') ||
                    lowerInput.includes('yes') || lowerInput.includes('looks good') || lowerInput.includes('perfect') ||
                    lowerInput.includes('create')) {

                    // Use the latest brief (not the first found)
                    const briefMessages = safeCurrentMessages.filter(m => m.metadata?.is_brief);
                    const briefMessage = briefMessages[briefMessages.length - 1];

                    if (briefMessage) {
                        await handleStartProduction(
                            briefMessage.metadata.brief_content,
                            briefMessage.metadata.image_url,
                            briefMessage.metadata.original_prompt,
                            currentChatId
                        );
                    }
                } else {
                    // Use the latest brief (not the first found)
                    const briefMessages = safeCurrentMessages.filter(m => m.metadata?.is_brief);
                    const briefMessage = briefMessages[briefMessages.length - 1];

                    if (briefMessage) {
                        // Only consider "active" loading (not already resolved)
                        const hasActiveModificationLoading = safeCurrentMessages.some(m => 
                            m.metadata?.is_modification_loading && !m.metadata?.modification_resolved_at
                        );
                        
                        if (!hasActiveModificationLoading) {
                            const loadingMessage = await Message.create({
                                chat_id: currentChatId,
                                message_type: 'assistant',
                                content: '📝 **Updating your video plan...**\n\nI\'m incorporating your feedback to create an improved version. This will take just a moment.',
                                metadata: {
                                    is_modification_loading: true,
                                    generation_id: `modification_loading_${Date.now()}`
                                }
                            });
                            
                            await loadChatData(true); // Force load after modification loading message
                            
                            await modifyVideoBrief(input.trim(), briefMessage, currentChatId, loadingMessage.id);
                        }
                    }
                }
            } else if (isRevisionRequest) {
                if (completedVideoMessage) {
                    // Pass the user's revision request, not the briefPrompt
                    await handleRevisionRequest(
                        input.trim(),
                        completedVideoMessage.metadata.video_id,
                        updatedChatData?.brief,
                        completedVideoMessage.metadata.image_url || safeCurrentMessages.find(m => m.metadata?.image_url)?.metadata?.image_url,
                        currentChatId
                    );
                }
            } else {
                // Check if generic help message already exists to prevent duplicates
                const hasGenericMessage = safeCurrentMessages.some(m => 
                    m.content.includes('I can help you create and refine video content')
                );
                
                if (!hasGenericMessage) {
                    await Message.create({
                        chat_id: currentChatId,
                        message_type: 'assistant',
                        content: 'I can help you create and refine video content. To get started, please upload a product image and describe the video you\'d like to create.',
                        metadata: {
                            generation_id: `generic_help_${Date.now()}`
                        }
                    });

                    await loadChatData(true); // Force load after generic message
                }
            }

            onChatUpdate?.();
            setInput('');
            setSelectedFile(null);
            setFileUrl('');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error processing message:', error);

            let errorMessage = 'Failed to send message. Please try again.';
            if (error.message?.includes('CHAT_LOCKED')) {
                errorMessage = 'Another video process is currently running. Please wait for it to complete.';
            } else if (error.message?.includes('INSUFFICIENT_CREDITS')) {
                errorMessage = 'Insufficient credits. Please purchase more credits to continue.';
            } else if (error.message?.includes('timeout')) {
                errorMessage = 'Request timed out. Please check your connection and try again.';
            }

            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() && !selectedFile) return;

        shouldAutoScroll.current = true;

        if (!chatId) {
            const fallbackTitle = input.trim().length > 0
                ? (input.trim().length > 30 ? `${input.trim().substring(0, 27)}...` : input.trim())
                : 'New Video Project';

            const newChat = await Chat.create({
                title: fallbackTitle,
                workflow_state: 'draft'
            });

            onNewChat?.(newChat.id);

            await processChatMessage(newChat.id);
        } else {
            await processChatMessage(chatId);
        }
    };

    const handleDownloadVideo = async (videoUrl, videoId) => {
        try {
            // Show loading state
            const downloadingToast = toast.loading('Downloading video...');
            
            // Fetch the video file
            const response = await fetch(videoUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch video');
            }
            
            // Get the video as a blob
            const blob = await response.blob();
            
            // Create download link
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = `viduto-video-${videoId || Date.now()}.mp4`;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
            
            // Success message
            toast.dismiss(downloadingToast);
            toast.success('Video downloaded successfully!');
            
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download video. Please try again.');
        }
    };

    // Auto-suppress legacy "Want to make changes?" CTA messages once a video is completed (initial or revision)
    useEffect(() => {
        (async () => {
            if (!messages || messages.length === 0) return;

            const hasCompletedVideo = messages.some(m => m?.metadata?.video_completed);
            if (!hasCompletedVideo) return;

            const legacyCtas = messages.filter(m =>
                m?.message_type === 'assistant' &&
                typeof m?.content === 'string' &&
                !m?.metadata?.hidden_legacy_cta &&
                /want to make changes\?/i.test(m.content)
            );

            if (legacyCtas.length === 0) return;

            for (const m of legacyCtas) {
                await Message.update(m.id, {
                    metadata: { ...(m.metadata || {}), hidden_legacy_cta: true }
                });
            }

            await loadChatData(true); // Force load after suppressing messages
        })();
    }, [messages, loadChatData]);

    const renderMessage = (message, index) => {
        const isUser = message.message_type === 'user';
        const isSystem = message.message_type === 'system';
        const isAssistant = message.message_type === 'assistant';

        // Hide any message that was flagged as legacy CTA
        if (message?.metadata?.hidden_legacy_cta) {
            return null;
        }

        // NEW: Force-hide the legacy "Want to make changes?" CTA unconditionally
        if ((isAssistant || isSystem) && typeof message.content === 'string') {
            const lower = message.content.toLowerCase();
            if (
                lower.includes('want to make changes?') ||
                lower.includes("describe any adjustments you'd like")
            ) {
                return null;
            }
        }

        // Hide legacy "ready" and "want to make changes" messages if any completed video exists
        if (
            isAssistant &&
            typeof message.content === 'string'
        ) {
            const lower = message.content.toLowerCase();
            const hasCompletedVideo = Array.isArray(messages) && messages.some(m => m?.metadata?.video_completed);
            if (
                hasCompletedVideo &&
                (
                    lower.includes('want to make changes?') ||
                    lower.includes('🎉') ||
                    lower.includes('your video is ready!') ||
                    lower.includes('your professional 30-second video has been created')
                )
            ) {
                return null;
            }
        }

        // Handle video completion messages: show video, then a separate blue guidance message
        if (message.metadata?.video_completed && message.metadata?.video_url) {
            const guidanceCopy = `🎉 **Your video is ready!**

✨ AI isn't perfect—first drafts may need tweaks. That's totally normal.

Try asking for changes like:
- "Change the second scene to something more fun and attention‑grabbing"
- "Change the text from … to …"

💳 **Each revision costs 2.5 credits.**  
✅ Usually **2–3 revisions** are enough to get an excellent final result.`;

            return (
                <>
                    {/* Video block */}
                    <div key={(message.id || index) + '_video'} className={`flex gap-3 mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {!isUser && (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                                V
                            </div>
                        )}
                        <div className={`max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
                            <div className="relative inline-block rounded-xl overflow-hidden shadow-lg">
                                <video
                                    src={message.metadata.video_url}
                                    controls
                                    className="block max-w-sm w-full h-auto"
                                    style={{ aspectRatio: '9/16' }}
                                    playsInline
                                    preload="metadata"
                                >
                                    Your browser does not support the video tag.
                                </video>

                                <div className="absolute bottom-2 right-2">
                                    <Button
                                        onClick={() => handleDownloadVideo(message.metadata.video_url, message.metadata.video_id)}
                                        size="sm"
                                        variant="secondary"
                                        className="bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-sm"
                                    >
                                        <Download className="w-4 h-4 mr-1" />
                                        Download
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Blue guidance message below the video */}
                    <div key={(message.id || index) + '_guidance'} className={`flex gap-3 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {!isUser && (
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                                V
                            </div>
                        )}
                        <div className={`max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
                            <div className={`rounded-2xl px-4 py-3 border ${
                                darkMode
                                    ? 'bg-blue-900/50 text-blue-100 border-blue-700'
                                    : 'bg-blue-50 text-blue-900 border-blue-200'
                            }`}>
                                <ReactMarkdown
                                    className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                                    components={{
                                        a: ({ children, ...props }) => (
                                            <a {...props} target="_blank" rel="noopener noreferrer" className="underline">
                                                {children}
                                            </a>
                                        ),
                                        p: ({ children }) => <p className="my-1 leading-relaxed">{children}</p>,
                                        ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                                        li: ({ children }) => <li className="my-0.5">{children}</li>,
                                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                    }}
                                >
                                    {guidanceCopy}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </>
            );
        }

        return (
            <div key={message.id || index} className={`flex gap-3 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-sm">
                        V
                    </div>
                )}
                <div className={`max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
                    <div className={`rounded-2xl px-4 py-3 ${
                        isUser 
                            ? 'bg-orange-500 text-white' 
                            : isSystem
                                ? darkMode 
                                    ? 'bg-blue-900/50 text-blue-100 border border-blue-700' 
                                    : 'bg-blue-50 text-blue-900 border border-blue-200'
                                : darkMode 
                                    ? 'bg-gray-700 text-white' 
                                    : 'bg-gray-100 text-gray-900'
                    }`}>
                        {/* UPDATED: smarter preview handling */}
                        {message.metadata?.image_url && !message.metadata?.preview_unavailable && (
                            <div className="text-left mb-3">
                                <img
                                    src={message.metadata.image_url}
                                    alt="Uploaded"
                                    className="w-48 h-48 object-cover rounded-lg"
                                    onError={(e) => {
                                        // If preview fails, hide image and show info
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                        {message.metadata?.image_url && message.metadata?.preview_unavailable && (
                            <div className={`text-left mb-3 p-3 rounded-lg border ${darkMode ? 'border-gray-600 bg-gray-800 text-gray-300' : 'border-gray-300 bg-white text-gray-700'}`}>
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-orange-500" />
                                    <span className="text-sm">
                                        Preview not available for this file type ({message.metadata?.original_file_name || 'image'}). It will be handled during processing.
                                    </span>
                                </div>
                            </div>
                        )}

                        <ReactMarkdown 
                            className={`text-sm prose prose-sm max-w-none ${
                                isUser ? 'prose-invert' : darkMode ? 'prose-invert' : ''
                            }`}
                            components={{
                                a: ({ children, ...props }) => (
                                    <a {...props} target="_blank" rel="noopener noreferrer" className="underline">
                                        {children}
                                    </a>
                                ),
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>

                    {/* Handle embedded video URLs in regular messages - Fixed container */}
                    {message.metadata?.video_url && !message.metadata?.video_completed && (
                        <div className="mt-3 relative inline-block rounded-xl overflow-hidden shadow-lg">
                            <video
                                src={message.metadata.video_url}
                                controls
                                className="block max-w-sm w-full h-auto"
                                style={{ aspectRatio: '9/16' }}
                                playsInline
                                preload="metadata"
                            >
                                Your browser does not support the video tag.
                            </video>
                            
                            {/* Download Button for embedded videos too */}
                            <div className="absolute bottom-2 right-2">
                                <Button
                                    onClick={() => handleDownloadVideo(message.metadata.video_url, message.metadata.video_id)}
                                    size="sm"
                                    variant="secondary"
                                    className="bg-black/50 hover:bg-black/70 text-white border-none backdrop-blur-sm"
                                >
                                    <Download className="w-4 h-4 mr-1" />
                                    Download
                                </Button>
                            </div>
                        </div>
                    )}
                    
                    {/* UPDATED: richer revision progress with countdown and stages */}
                    {(message.metadata?.revision_in_progress || message.metadata?.finalizing_revision) && (
                        <div className="mt-4 w-full">
                            <RevisionProgressInline
                                startedAt={new Date(chat?.production_started_at || Date.now()).getTime()}
                                darkMode={darkMode}
                            />
                        </div>
                    )}

                    {message.metadata?.is_approval_section && !message.metadata?.video_completed && (
                        <div className="flex gap-2 mt-4 w-full"> {/* Added w-full for buttons */}
                            <Button
                                onClick={() => {
                                    console.log('🔘 Start Production button clicked');
                                    console.log('📋 Message metadata:', message.metadata);

                                    // Use the latest brief (not the first found)
                                    const briefMessage = [...messages].reverse().find(m => m.metadata?.is_brief);
                                    const imageUrl = message.metadata.image_url || briefMessage?.metadata?.image_url;

                                    console.log('🖼️ Image URL found:', imageUrl);
                                    console.log('📝 Brief content:', !!message.metadata.brief_content);

                                    handleStartProduction(
                                        briefMessage.metadata.brief_content,
                                        imageUrl,
                                        briefMessage.metadata.original_prompt,
                                        chatId
                                    );
                                }}
                                disabled={isLoading || (user?.credits || 0) < 10}
                                className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                                Start Production (10 credits)
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (!chatId) {
        return (
            <div className="flex flex-col h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black">
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center max-w-2xl mx-auto">
                        <div className="w-20 h-20 rounded-full mx-auto mb-8 flex items-center justify-center">
                            <img
                                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b4aa46f5d6326ab93c3ed0/5a6f76fa6_vidutologotransparent.png"
                                alt="Viduto Logo"
                                className="w-16 h-16"
                            />
                        </div>

                        <h2 className="text-3xl font-light mb-4 text-white">
                            What should we create today?
                        </h2>
                        <p className="text-lg font-light mb-8 text-gray-300">
                            Try this prompt templates:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            {promptTemplates.map((tpl, index) => (
                                <button
                                    key={index}
                                    onClick={() => setInput(tpl.text)}
                                    className="p-4 text-center rounded-xl border border-gray-600 bg-gray-800/50 text-gray-300 hover:border-orange-500/50 hover:bg-gray-700/50 transition-all duration-200"
                                >
                                    <div className="text-sm font-light">
                                        {tpl.label}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-700 p-6 bg-gray-800/50">
                    <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
                        <div className="relative">
                            <Textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Let's start viduting..."
                                className="min-h-[60px] max-h-48 resize-none text-base pr-16 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                            />

                            <div className="absolute bottom-3 right-3">
                                {!selectedFile ? (
                                    <>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/webp,image/png,image/jpeg"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isLoading}
                                            className="h-10 w-10 border-gray-600 text-gray-300 hover:bg-gray-700"
                                        >
                                            <Upload className="w-4 h-4" />
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        type="submit"
                                        disabled={isLoading || (!input.trim() && !selectedFile)}
                                        size="icon"
                                        className="h-10 w-10 bg-orange-500 text-white hover:bg-orange-600"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {selectedFile && (
                            <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-gray-700/50">
                                <span className="text-sm flex-1 text-gray-300">
                                    📷 {selectedFile.name}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = '';
                                        }
                                    }}
                                    className="text-gray-400 hover:text-gray-200"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto">
                {messages && messages.length > 0 ? (
                    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                        {/* Loader for older messages at top */}
                        {isFetchingOlder && (
                            <div className="flex justify-center">
                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Loading earlier messages...
                                </div>
                            </div>
                        )}

                        {messages.map((message, index) => renderMessage(message, index))}

                        {chat?.workflow_state === 'in_production' && chat?.active_video_id && chat?.production_started_at && !messages.some(m => (m.metadata?.revision_in_progress || m.metadata?.finalizing_revision) && m.metadata?.video_id === chat.active_video_id) && (
                            <div className="mb-4">
                                <ProductionProgress
                                    videoId={chat.active_video_id}
                                    startedAt={new Date(chat.production_started_at).getTime()}
                                    chatId={chatId}
                                    darkMode={darkMode}
                                    onCancel={() => handleCancelProduction(chatId, chat.active_video_id)}
                                    isCancelling={isCancelling}
                                />
                                {/* NEW: explanatory microcopy to reduce confusion on early progress */}
                                <div className={`mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                    Note: Initial setup takes a few seconds, and progress may appear to jump at first — that's normal.
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                ) : (
                    <div className="flex items-center justify-center min-h-full px-4 py-6">
                        <div className="text-center">
                            <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                                darkMode ? 'bg-orange-500/20' : 'bg-orange-100'
                            }`}>
                                <img
                                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68b4aa46f5d6326ab93c3ed0/5a6f76fa6_vidutologotransparent.png"
                                    alt="Viduto Logo"
                                    className="w-16 h-16"
                                />
                            </div>
                            <h3 className={`text-xl font-light mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                Start the conversation
                            </h3>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                Upload an image and describe your video idea to get started
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className={`border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} px-4 py-4 md:px-6`}>
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleSendMessage} className="relative">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={chat?.workflow_state === 'in_production' ? "Video is generating..." : "Type your message..."}
                            disabled={chat?.workflow_state === 'in_production' || isLoading}
                            className={`min-h-[50px] max-h-32 resize-none pr-16 ${
                                darkMode
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                    : 'bg-white border-gray-300'
                            } ${(chat?.workflow_state === 'in_production' || isLoading) ? 'opacity-50' : ''}`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && chat?.workflow_state !== 'in_production' && !isLoading) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                        />

                        <div className="absolute bottom-2 right-2">
                            {messages.length === 0 ? (
                                !selectedFile ? (
                                    <>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/webp,image/png,image/jpeg"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isLoading || chat?.workflow_state === 'in_production'}
                                            className={darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
                                        >
                                            <Upload className="w-4 h-4" />
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        type="submit"
                                        disabled={isLoading || (!input.trim() && !selectedFile) || chat?.workflow_state === 'in_production'}
                                        size="sm"
                                        className="bg-orange-500 hover:bg-orange-600 text-white"
                                    >
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </Button>
                                )
                            ) : (
                                <Button
                                    type="submit"
                                    disabled={isLoading || !input.trim() || chat?.workflow_state === 'in_production'}
                                    size="sm"
                                    className={`${
                                        chat?.workflow_state === 'in_production' || isLoading
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-orange-500 hover:bg-orange-600'
                                    } text-white`}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                            )}
                        </div>

                        {selectedFile && messages.length === 0 && (
                            <div className={`flex items-center gap-2 mt-2 p-2 rounded ${
                                darkMode ? 'bg-gray-700' : 'bg-gray-50'
                            }`}>
                                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    📷 {selectedFile.name}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedFile(null);
                                        if (fileInputRef.current) {
                                            fileInputRef.current.value = '';
                                        }
                                    }}
                                    className={darkMode ? 'text-gray-400 hover:text-gray-200' : ''}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            <CreditsModal
                isOpen={showCreditsModal}
                onClose={() => setShowCreditsModal(false)}
                onPurchaseComplete={() => {
                    setShowCreditsModal(false);
                    loadUser();
                    onCreditsRefreshed?.();
                }}
                darkMode={darkMode}
            />
        </div>
    );
}