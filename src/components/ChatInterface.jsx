
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Upload, X, Loader2, Play, Download, AlertCircle } from 'lucide-react';
import { Chat } from '@/api/entities';
import { Message } from '@/api/entities';
import { User } from '@/api/entities';
import { Video } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { InvokeLLM } from '@/api/integrations';
import { rateLimiter } from '@/api/integrations';
import { startVideoProduction } from '@/api/functions';
import { checkVideoStatus } from '@/api/functions';
import { triggerRevisionWorkflow } from '@/api/functions';
import { lockingManager } from '@/api/functions';
import ProductionProgress from './ProductionProgress';
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

    const loadChatData = useCallback(async () => {
        if (!chatId) return;
        try {
            const chatData = await Chat.get(chatId);
            setChat(chatData);

            const messagesData = await Message.filter({ chat_id: chatId }, 'created_date');
            setMessages(messagesData || []);
        } catch (error) {
            console.error('Error loading chat data:', error);
            setMessages([]);
        }
    }, [chatId]);

    const generateAIChatTitle = useCallback(async (prompt) => {
        try {
            const titlePrompt = `Create a short, catchy 4-5 word title for a video creation project based on this request: "${prompt}".
Make it descriptive but concise. Examples: "Coffee Shop Ad", "Tech Product Demo", "Fashion Brand Video", "Food Delivery Promo".
Just return the title, nothing else.`;

            const title = await InvokeLLM({
                prompt: titlePrompt
            });

            return title.trim().replace(/["']/g, '');
        } catch (error) {
            console.error('Error generating AI title:', error);
            const words = prompt.split(' ').slice(0, 3).join(' ');
            const fallbackTitle = `${words}...`;
            return fallbackTitle.length > 20 ? `${fallbackTitle.substring(0, 17)}...` : fallbackTitle;
        }
    }, []);

    const generateVideoBrief = useCallback(async (userPrompt, imageUrl, currentChatId) => {
        try {
            // Check if brief is already being generated or exists
            const existingMessages = await Message.filter({ chat_id: currentChatId }, 'created_date');
            const safeExistingMessages = existingMessages || [];
            const hasLoadingBrief = safeExistingMessages.some(m => m.metadata?.is_brief_loading);
            const hasBrief = safeExistingMessages.some(m => m.metadata?.is_brief);
            
            if (hasLoadingBrief || hasBrief) {
                console.log('Brief already exists or is being generated, skipping...');
                return;
            }

            const aiTitle = await generateAIChatTitle(userPrompt);

            await Chat.update(currentChatId, {
                title: aiTitle,
                workflow_state: 'briefing'
            });

            onChatUpdate?.();

            const loadingMessage = await Message.create({
                chat_id: currentChatId,
                message_type: 'assistant',
                content: '🎬 **Creating your video brief...**\n\nAnalyzing your product image and request to create the perfect video concept. This will take just a moment.',
                metadata: {
                    is_brief_loading: true,
                    image_url: imageUrl,
                    original_prompt: userPrompt,
                    generation_id: `brief_loading_${Date.now()}` // Unique ID to prevent duplicates
                }
            });

            await loadChatData();

            const briefPrompt = `# 
CRITICAL INSTRUCTION
The voiceover for EACH SCENE must contain EXACTLY 15 words. Not 14, not 16. Your response will be validated and rejected if this rule is not followed precisely.

VOICEOVER WORD COUNT EXAMPLES
Correct: This powerful blender makes morning smoothies a breeze for a healthy and fast start. (15 words)

Incorrect: Our blender makes great smoothies. (5 words)

Incorrect: This powerful new blender is the best for making delicious and nutritious smoothies in the morning. (16 words)

ROLE & OBJECTIVE
You are an elite video creative director specializing in viral short-form content for social media marketing. Your task is to transform a user's simple prompt and product image into a comprehensive, production-ready Video Plan for a 30-second video that will create authentic, high-converting product videos that feel professionally produced and human-crafted, not AI-generated.

INPUT PROCESSING & DEEP ANALYSIS
INITIAL INPUT
You will receive:

A brief user prompt (may be minimal): "${userPrompt}"

A product image

ANALYTICAL FRAMEWORK
Before creating the video plan, conduct a deep analysis:

A. PRODUCT PERSONALITY DECODING
From the product image, identify:

Product Category: [What it is]

Value Proposition: [Core benefit it offers]

Target Emotion: [How users should feel: empowered, relaxed, confident, excited, secure, indulgent]

Brand Archetype: [Rebel, Hero, Innocent, Explorer, Sage, Lover, Jester, Caregiver, Creator, Ruler, Magician, Everyman]

Price Perception: [Budget-friendly, mid-range, premium, luxury]

Usage Context: [Daily essential, special occasion, problem-solver, lifestyle enhancer]

B. USER INTENT INTERPRETATION
Even from minimal input, extract:

Explicit Request: [What they literally asked for]

Implicit Desire: [What they really want to achieve]

Emotional Goal: [How they want viewers to feel]

Business Objective: [Awareness, conversion, retention, viral reach]

Target Audience Hints: [Who they're trying to reach]

Tone Preference: [Professional, playful, urgent, inspirational, educational]

C. CONTEXTUAL INTELLIGENCE
Consider:

Product-Market Fit: [How this product serves its market]

Cultural Moment: [Current trends/events that relate]

Platform Psychology: [What works for this product type on social]

Competitive Landscape: [How similar products are marketed]

Seasonal Relevance: [Time-based factors]

D. EMOTIONAL JOURNEY MAPPING
Design a custom emotional arc based on the analysis:

Opening Emotion: [What viewer feels in first 3 seconds]

Tension Point: [The problem/desire at 6-12 seconds]

Transformation: [The shift at 12-18 seconds]

Satisfaction: [The payoff at 18-24 seconds]

Final Feeling: [What lingers after 30 seconds]

E. VIDEO VIBE IDENTIFICATION
Analyze the user's request and product to determine the primary vibe:

VIBE OPTIONS (choose ONE primary):

LUXURY - Premium, sophisticated, exclusive, refined, aspirational

FUN - Playful, lighthearted, joyful, colorful, upbeat

ENERGETIC - Dynamic, powerful, intense, motivating, action-packed

FUNNY - Humorous, witty, meme-worthy, unexpected, comedic

VIBE DETECTION LOGIC:

Product-Based Default Vibes:

Jewelry, watches, perfume, designer bags → LUXURY

Toys, games, candy, party supplies → FUN

Sports equipment, energy drinks, fitness gear → ENERGETIC

Novelty items, gag gifts, meme products → FUNNY

If no clear signals:

High-price products (>$500) → LUXURY

Youth/teen products → FUN

Performance products → ENERGETIC

Entertainment products → FUNNY

Default fallback → FUN (most versatile)

IMPORTANT: The chosen vibe must be ONE of these four: LUXURY / FUN / ENERGETIC / FUNNY

STYLE ADAPTATION MATRIX
Based on your analysis and identified vibe, select the optimal approach:

FOR LUXURY VIBE:

Slower, deliberate pacing (1-2 cuts per scene)

Elegant transitions (smooth fades, dissolves)

Deep, rich color grading (blacks, golds, jewel tones)

Minimal, elegant text (serif fonts, subtle animations)

Orchestral, piano, or electronic ambient music

Voiceover: Smooth, confident, sophisticated, measured pace

FOR FUN VIBE:

Quick, bouncy cuts (3-4 per scene)

Pop transitions (zoom, bounce, slide)

Bright, saturated colors (vibrant palette)

Playful text animations (bubble fonts, motion graphics)

Pop, tropical house, or upbeat instrumental

Voiceover: Enthusiastic, friendly, excited, warm

FOR ENERGETIC VIBE:

Rapid cuts synced to beat (4-5 per scene)

Dynamic transitions (glitch, shake, flash)

High contrast, bold colors (reds, oranges, electric blues)

Impact text (bold sans-serif, kinetic typography)

EDM, trap, hip-hop, or rock music

Voiceover: Powerful, urgent, motivating, commanding

FOR FUNNY VIBE:

Unexpected cut timing (comedic beats)

Meme-style transitions (record scratch, freeze frame)

Exaggerated colors or filters (oversaturated, distorted)

Meme text style (Impact font, comic timing)

Comedic sound effects, kazoo, or viral sounds

Voiceover: Witty, sarcastic, deadpan, or exaggerated

FOR LIFESTYLE PRODUCTS:

Focus on aspiration and identity

Use warm, relatable scenarios

Emphasize transformation of daily life

Voiceover: Friendly, inspirational

FOR TECH/INNOVATIVE PRODUCTS:

Highlight the "wow" factor

Use dynamic cuts and modern aesthetics

Focus on problem-solving

Voiceover: Confident, informative

FOR BEAUTY/WELLNESS:

Create intimate, personal moments

Use soft, flattering lighting

Show before/after or process

Voiceover: Trustworthy, empowering

FOR FOOD/BEVERAGE:

Trigger sensory responses

Use macro shots and textures

Create craving and satisfaction

Voiceover: Enthusiastic, indulgent

FOR FASHION/ACCESSOORIES:

Build desire and confidence

Show versatility and style

Create "must-have" feeling

Voiceover: Trendy, confident

FOR HOME/UTILITY:

Demonstrate ease and efficiency

Show real-life applications

Focus on time/money saving

Voiceover: Practical, reassuring

FOR KIDS/FAMILY PRODUCTS:

Create joy and peace of mind

Show genuine reactions

Address parent concerns

Voiceover: Warm, trustworthy

FOR FITNESS/SPORTS:

Inspire action and progress

Show energy and results

Create motivational moments

Voiceover: Energetic, encouraging

CUSTOMIZATION TRIGGERS
Adjust the video plan based on detected signals:

If user mentions "viral" or "trending":

Incorporate current platform trends

Add unexpected twist in Scene 3

Include shareable moment

Make it meme-worthy

If user mentions "premium" or "luxury":

Slow down pacing slightly

Use elegant transitions

Focus on details and craftsmanship

Voiceover: Sophisticated

If user mentions "fun" or "playful":

Add humor or surprise elements

Use upbeat music

Include unexpected moments

Voiceover: Energetic, witty

If user mentions "trust" or "authentic":

Include testimonial elements

Show real-use scenarios

Add imperfections deliberately

Voiceover: Honest, conversational

If user provides minimal input:

Extract maximum insight from product image

Default to most effective style for product category

Create bold, clear value proposition

Make educated assumptions based on product type

FIXED PARAMETERS
Duration: ALWAYS 30 seconds exactly

Structure: ALWAYS 5 scenes (6 seconds each)

Audio: ALWAYS includes voiceover + background music

Format: ALWAYS 9:16 vertical (for TikTok/Reels/Shorts)

Voiceover: EXACTLY 15 words per scene (75 words total)

VIDEO PLAN OUTPUT STRUCTURE
1. CREATIVE CONCEPT
Hook Strategy: [First 3 seconds - what will stop the scroll]
Core Narrative: [The story/angle that makes this product irresistible in 30 seconds]
Emotional Journey: [Primary emotion progression across 5 scenes]
Visual Style: [Aesthetic direction: raw/authentic, premium/luxe, energetic/dynamic, minimal/clean]
Voiceover Tone: [Conversational, energetic, mysterious, authoritative, friendly, urgent]

2. SCENE-BY-SCENE BREAKDOWN
[Each scene should reflect the chosen VIDEO VIBE in its execution]

SCENE 1: HOOK ⏱️ [0:00-0:06]

Visual: [Exact shot description aligned with vibe]

Voiceover: [Exactly 15 words - verified word count]

SCENE 2: INTRIGUE ⏱️ [0:06-0:12]

Visual: [Shot that builds curiosity - vibe-appropriate]

Voiceover: [Exactly 15 words - verified word count]

SCENE 3: REVEAL ⏱️ [0:12-0:18]

Visual: [The product solution/transformation - vibe-aligned]

Voiceover: [Exactly 15 words - verified word count]

SCENE 4: BENEFIT ⏱️ [0:18-0:24]

Visual: [Showing product in use - vibe context]

Voiceover: [Exactly 15 words - verified word count]

SCENE 5: PAYOFF ⏱️ [0:24-0:30]

Visual: [Final shot embodying the vibe]

Voiceover: [Exactly 15 words - verified word count]

3. VISUAL CONSISTENCY
Color Grading: [Consistent mood across all 5 scenes]

Typography: [Single font family, consistent positioning]

Transition Style: [Cohesive cutting rhythm]

Camera Movement: [Handheld vs. smooth, consistent throughout]

4. AUTHENTICITY ELEMENTS
Include at least 3 of these across the 5 scenes:

Natural lighting variations between scenes

Slight camera shake in handheld shots

Real environment sounds under music

Genuine human hands/interactions

Imperfect but charming moments

Natural shadows and reflections

Authentic background environments

Micro-expressions or reactions

5. PRODUCT HERO MOMENTS
Ensure meaningful product presence in all 5 scenes:

Scene 1: Initial product intrigue (20% focus)

Scene 2: Context/problem relation (30% focus)

Scene 3: Full reveal/demonstration (90% focus)

Scene 4: In-use benefit (70% focus)

Scene 5: Final impression (80% focus)

VIRAL OPTIMIZATION FOR 30-SECOND FORMAT
0-3 seconds: Hook must stop scroll immediately

3-10 seconds: Build intrigue to prevent skip

10-20 seconds: Deliver value/transformation

20-27 seconds: Reinforce benefit

27-30 seconds: Clear payoff/CTA

VOICEOVER WRITING PRINCIPLES
MUST be EXACTLY 15 words per scene (no more, no less)

Use conversational, natural language

Match trending speaking patterns

Include power words that trigger emotion

Sync key words with visual moments

Structure sentences to fit 6-second delivery

End with clear action or thought

CRITICAL: Double-check word count for each scene before finalizing

CREATIVE PRINCIPLES
AVOID:
Generic "Here's our product" openings

Robotic voiceover delivery

All 5 scenes at same energy level

Product floating in void

Stock music that feels corporate

Perfect studio lighting throughout

Repetitive scene structures

AI-sounding script language

Voiceover with wrong word count

EMBRACE:
Story-driven narrative arc

Conversational voiceover style

Energy progression across scenes

Product in real contexts

Trending audio styles

Natural, varied lighting

Dynamic scene variety

Human, relatable language

Precise 15-word voiceover per scene

VALIDATION CHECKLIST
Before finalizing, ensure:
✓ Exactly 30 seconds (5 scenes × 6 seconds)
✓ Voiceover script is EXACTLY 75 words (15 per scene)
✓ Each scene has precisely 15 words in the voiceover - not 14, not 16, exactly 15
✓ Product appears meaningfully in all 5 scenes
✓ 9:16 vertical format optimized
✓ Music and voiceover are balanced
✓ First 3 seconds have stopping power
✓ Each scene serves distinct purpose
✓ Feels human-created, not AI
✓ Clear narrative arc across 30 seconds
✓ Ends with compelling CTA/payoff
✓ Product type is clearly identified
✓ VIDEO VIBE is consistently expressed throughout all elements
✓ All creative decisions align with the chosen vibe

OUTPUT FORMAT
Present the video plan in a clean, visually organized format with proper spacing and emphasis:

📦 PRODUCT TYPE
[Single word: shoes, shirt, phone, car, watch, bag, cosmetics, food, toy, furniture, etc.]\

🎨 VIDEO VIBE
[Must be ONE: LUXURY / FUN / ENERGETIC / FUNNY]\

🎬 VIDEO TITLE
[Catchy internal reference name]

📊 STRATEGIC ANALYSIS
Product Personality:
[What makes this product unique]

Target Emotion:
[Core feeling to evoke]

Detected Intent:
[What user really wants]

Vibe Selection Rationale:
[Why this specific vibe was chosen]

Chosen Approach:
[How this vibe will be executed]

🎥 SCENE-BY-SCENE BREAKDOWN
SCENE 1: HOOK ⏱️ [0:00-0:06]
Visual: [Description]

Voiceover: [Exactly 15 words - verified word count]

SCENE 2: INTRIGUE ⏱️ [0:06-0:12]
Visual: [Description]

Voiceover: [Exactly 15 words - verified word count]

SCENE 3: REVEAL ⏱️ [0:12-0:18]
Visual: [The product solution/transformation]

Voiceover: [Exactly 15 words - verified word count]

SCENE 4: BENEFIT ⏱️ [0:18-0:24]
Visual: [Showing product in use]

Voiceover: [Exactly 15 words - verified word count]

SCENE 5: PAYOFF ⏱️ [0:24-0:30]
Visual: [Final shot embodying the vibe]

Voiceover: [Exactly 15 words - verified word count]

✅ READY FOR PRODUCTION
30-second video plan complete and optimized for AI Agent execution

Note about UI: The "Ready to Create" message should appear only once per chat. Cancel button styling: Desktop - smaller size, Mobile - very small with only "X" symbol, no text.

Note: Use clear formatting with:

Bold for headers and key terms

Italics for descriptions and notes

\Code blocks\ for fixed values

Bullet points for lists

Line breaks between sections

Emojis for visual organization (optional but recommended)

Consistent indentation for sub-items

Remember: The VIDEO VIBE is the creative north star that guides every decision. Every element - from camera movements to color grading, from music selection to voiceover delivery - must consistently express the chosen vibe. This ensures the final video has a cohesive mood that resonates with the target audience and achieves the user's goals.
`;

            const brief = await InvokeLLM({
                prompt: briefPrompt,
                file_urls: imageUrl ? [imageUrl] : undefined
            });

            const productNameMatch = brief.match(/### 📦 \*\*PRODUCT TYPE\*\* \s*`\[(.*?)\]`/i);
            const cleanProductName = productNameMatch && productNameMatch[1] ? productNameMatch[1].trim().toLowerCase() : 'unknown';

            // Update the loading message instead of creating new ones
            await Message.update(loadingMessage.id, {
                content: brief,
                metadata: {
                    is_brief: true,
                    brief_content: brief,
                    image_url: imageUrl,
                    original_prompt: userPrompt,
                    product_name: cleanProductName,
                    is_brief_loading: false,
                    generation_id: `brief_${Date.now()}` // Unique ID to prevent duplicates
                }
            });

            // Check if approval message already exists before creating
            const updatedMessages = await Message.filter({ chat_id: currentChatId }, 'created_date');
            const hasApprovalMessage = updatedMessages.some(m => m.metadata?.is_approval_section);
            
            if (!hasApprovalMessage) {
                await Message.create({
                    chat_id: currentChatId,
                    message_type: 'assistant',
                    content: '## ✅ Ready to Create?\n\nThis comprehensive video plan will guide the AI to produce your professional 30-second video with 5 scenes, background music, and voiceover.\n\n**You can:**\n• Request changes to the plan\n• Approve and start production **(costs 10 credits)**',
                    metadata: {
                        is_approval_section: true,
                        brief_content: brief,
                        image_url: imageUrl,
                        original_prompt: userPrompt,
                        product_name: cleanProductName,
                        generation_id: `approval_${Date.now()}`
                    }
                });
            }

            await Chat.update(currentChatId, {
                workflow_state: 'awaiting_approval',
                brief: brief
            });

            await loadChatData();
            onChatUpdate?.();

            return brief;
        } catch (error) {
            console.error('Error generating video brief:', error);

            try {
                const currentMessages = await Message.filter({ chat_id: currentChatId }, 'created_date');
                const safeCurrentMessages = currentMessages || [];
                const loadingMessage = safeCurrentMessages.find(m => m.metadata?.is_brief_loading);

                if (loadingMessage) {
                    await Message.update(loadingMessage.id, {
                        content: '❌ **Failed to generate video brief**\n\nThere was an error creating your video brief. Please try again.',
                        metadata: {
                            is_brief_error: true,
                            image_url: imageUrl,
                            original_prompt: userPrompt,
                            is_brief_loading: false,
                            generation_id: `brief_error_${Date.now()}`
                        }
                    });
                } else {
                    await Message.create({
                        chat_id: currentChatId,
                        message_type: 'assistant',
                        content: '❌ **Failed to generate video brief**\n\nThere was an error creating your video brief. Please try again.',
                        metadata: {
                            is_brief_error: true,
                            image_url: imageUrl,
                            original_prompt: userPrompt,
                            generation_id: `brief_error_${Date.now()}`
                        }
                    });
                }

                await loadChatData();
            } catch (updateError) {
                console.error('Error updating error message:', updateError);
            }

            toast.error('Failed to generate video brief. Please try again.');
            throw error;
        }
    }, [generateAIChatTitle, loadChatData, onChatUpdate]);

    useEffect(() => {
        if (!chatId) return;
        loadChatData();
        loadUser();
    }, [chatId, loadChatData, loadUser]);

    useEffect(() => {
        if (!chat || !messages || messages.length === 0) return;

        const initialMessage = messages.find(m => m.metadata?.is_initial_request && m.message_type === 'user');
        const hasLoadingBrief = messages.some(m => m.metadata?.is_brief_loading);
        const hasBrief = messages.some(m => m.metadata?.is_brief);
        const hasApprovalMessage = messages.some(m => m.metadata?.is_approval_section);

        // Only generate if we have initial message, no brief process started, and chat is in draft state
        if (initialMessage && !hasLoadingBrief && !hasBrief && !hasApprovalMessage && chat.workflow_state === 'draft') {
            generateVideoBrief(initialMessage.content, initialMessage.metadata.image_url, chatId);
        }
    }, [chat, messages, chatId, generateVideoBrief]); // Fixed dependency array

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
        };

        chatContainer.addEventListener('scroll', handleScroll);
        return () => chatContainer.removeEventListener('scroll', handleScroll);
    }, [isNearBottom]);

    useEffect(() => {
        if (!chatId) return;

        const interval = setInterval(() => {
            loadChatData();
        }, 3000);

        return () => clearInterval(interval);
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

                await loadChatData();
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
                        await loadChatData();
                        onChatUpdate?.();
                        onCreditsRefreshed?.();
                    } else if (status.status === 'failed') {
                        clearInterval(intervalId);
                        toast.error('Video generation failed. Credits have been refunded.');
                        await loadChatData();
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
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file);
        } else {
            toast.error('Please select an image file');
        }
    };

    const modifyVideoBrief = async (userFeedback, briefMessage, currentChatId) => {
        try {
            const modifiedBriefPrompt = `The user wants to modify the video brief. Original brief: "${briefMessage.metadata.brief_content}"\n\nUser feedback: "${userFeedback}"\n\nPlease create an updated video brief that incorporates their feedback while maintaining the professional structure and detail level. Use the same format with **bold** headers and proper spacing.`;

            const updatedBrief = await InvokeLLM({
                prompt: modifiedBriefPrompt,
                file_urls: briefMessage.metadata.image_url ? [briefMessage.metadata.image_url] : []
            });

            await Message.create({
                chat_id: currentChatId,
                message_type: 'assistant',
                content: `## 📝 Updated Video Plan\n\nBased on your feedback, here's your revised video plan:\n\n---\n\n${updatedBrief}`,
                metadata: {
                    is_brief: true,
                    brief_content: updatedBrief,
                    image_url: briefMessage.metadata.image_url,
                    original_prompt: briefMessage.metadata.original_prompt,
                    product_name: briefMessage.metadata.product_name,
                    is_updated_brief: true,
                    generation_id: `updated_brief_${Date.now()}`
                }
            });

            // Check if approval message already exists before creating
            const currentMessages = await Message.filter({ chat_id: currentChatId }, 'created_date');
            const hasApprovalMessage = currentMessages.some(m => m.metadata?.is_approval_section && m.metadata?.is_updated_approval);

            if (!hasApprovalMessage) {
                await Message.create({
                    chat_id: currentChatId,
                    message_type: 'assistant',
                    content: '## ✅ Ready to Create?\n\nThis updated video plan incorporates your requested changes and will guide the AI to produce your professional 30-second video with 5 scenes, background music, and voiceover.\n\n**You can:**\n• Request more changes to the plan\n• Approve and start production **(costs 10 credits)**',
                    metadata: {
                        is_approval_section: true,
                        brief_content: updatedBrief,
                        image_url: briefMessage.metadata.image_url,
                        original_prompt: briefMessage.metadata.original_prompt,
                        product_name: briefMessage.metadata.product_name,
                        is_updated_approval: true,
                        generation_id: `updated_approval_${Date.now()}`
                    }
                });
            }


            await Chat.update(currentChatId, {
                brief: updatedBrief
            });

            await loadChatData();
        } catch (error) {
            console.error('Error modifying video brief:', error);
            toast.error('Failed to modify video brief. Please try again.');
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

        setIsLoading(true);

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

            if (result.success) {
                toast.success('Video production started! This will take about 12 minutes.');

                await Chat.update(currentChatId, {
                    workflow_state: 'in_production',
                    active_video_id: result.videoId || result.video_id,
                    production_started_at: new Date().toISOString()
                });

                await loadChatData();
                onChatUpdate?.();
                onCreditsRefreshed?.();
            }
        } catch (error) {
            console.error('❌ Start production error:', error);
            
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
                        
                        await loadChatData();
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
                toast.success('Revision started! This will take about 5 minutes.');

                await Chat.update(currentChatId, {
                    workflow_state: 'in_production',
                    active_video_id: result.video_id,
                    production_started_at: new Date().toISOString()
                });

                await Message.create({
                    chat_id: currentChatId,
                    message_type: 'system',
                    content: '🔄 **Creating your revised video...**\n\nApplying your requested changes. This will take about 5 minutes.',
                    metadata: {
                        revision_in_progress: true,
                        parent_video_id: parentVideoId,
                        video_id: result.video_id,
                        estimate_minutes: 5,
                        revision_request: revisionRequest,
                        original_video_id: parentVideoId,
                        generation_id: `revision_in_progress_${Date.now()}`
                    }
                });

                startRevisionPolling(result.video_id, currentChatId);

                await loadChatData();
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

        const initialTimeout = setTimeout(async () => {
            // Check if finalizing message already exists before creating
            const currentMessages = await Message.filter({ chat_id: currentChatId }, 'created_date');
            const hasFinalizingMessage = currentMessages.some(m => 
                m.metadata?.finalizing_revision && m.metadata?.video_id === videoId
            );
            
            if (!hasFinalizingMessage) {
                await Message.create({
                    chat_id: currentChatId,
                    message_type: 'system',
                    content: '✨ **Finalizing your revised video...**\n\nAlmost ready! We\'re putting the finishing touches on your video.',
                    metadata: {
                        finalizing_revision: true,
                        video_id: videoId,
                        generation_id: `finalizing_${videoId}_${Date.now()}`
                    }
                });
                
                await loadChatData();
            }

            const pollInterval = setInterval(async () => {
                try {
                    const statusResult = await checkVideoStatus({
                        videoId: videoId,
                        chatId: currentChatId
                    });

                    if (statusResult.status === 'completed') {
                        clearInterval(pollInterval);
                        delete activeRevisionPolling.current[videoId];
                        playVideoReadySound(videoId); // Play sound when revision is ready
                        toast.success('Your revised video is ready!');
                        await loadChatData();
                        onChatUpdate?.();
                        onCreditsRefreshed?.();

                    } else if (statusResult.status === 'failed') {
                        clearInterval(pollInterval);
                        delete activeRevisionPolling.current[videoId];
                        toast.error('Revision failed. Please try again.');
                        await loadChatData();
                        onCreditsRefreshed?.();
                    }

                } catch (error) {
                    console.error('Error checking revision status:', error);
                }
            }, 3000);

            activeRevisionPolling.current[videoId] = { interval: pollInterval, timeout: null };

            const failsafeTimeout = setTimeout(() => {
                clearInterval(pollInterval);
                delete activeRevisionPolling.current[videoId];
                toast.error('Revision generation timed out. Credits have been refunded.');
                loadChatData();
                onCreditsRefreshed?.();
            }, 7 * 60 * 1000);

            activeRevisionPolling.current[videoId].timeout = failsafeTimeout;

        }, 2 * 60 * 1000);
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

            await loadChatData();
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

            // Create user message with what the user actually typed, not the briefPrompt
            await Message.create({
                chat_id: currentChatId,
                message_type: 'user',
                content: input.trim(), // This should be what the user typed, not the briefPrompt
                metadata: {
                    ...(uploadedFileUrl ? { image_url: uploadedFileUrl } : {}),
                    ...(isFirstMessageWithImage ? { is_initial_request: true } : {}),
                    generation_id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                }
            });

            await loadChatData();

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

                    const briefMessage = safeCurrentMessages.find(m => m.metadata?.is_brief);
                    if (briefMessage) {
                        await handleStartProduction(
                            briefMessage.metadata.brief_content,
                            briefMessage.metadata.image_url,
                            briefMessage.metadata.original_prompt,
                            currentChatId
                        );
                    }
                } else {
                    const briefMessage = safeCurrentMessages.find(m => m.metadata?.is_brief);
                    if (briefMessage) {
                        // Check if modification is already in progress
                        const hasModificationLoading = safeCurrentMessages.some(m => m.metadata?.is_modification_loading);
                        
                        if (!hasModificationLoading) {
                            await Message.create({
                                chat_id: currentChatId,
                                message_type: 'assistant',
                                content: '📝 **Updating your video plan...**\n\nI\'m incorporating your feedback to create an improved version. This will take just a moment.',
                                metadata: {
                                    is_modification_loading: true,
                                    generation_id: `modification_loading_${Date.now()}`
                                }
                            });
                            
                            await loadChatData();
                            
                            // Pass the user's feedback, not the briefPrompt
                            await modifyVideoBrief(input.trim(), briefMessage, currentChatId);
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

                    await loadChatData();
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

    const renderMessage = (message, index) => {
        const isUser = message.message_type === 'user';
        const isSystem = message.message_type === 'system';
        const isAssistant = message.message_type === 'assistant';

        // Handle video completion messages
        if (message.metadata?.video_completed && message.metadata?.video_url) {
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
                                : darkMode 
                                    ? 'bg-gray-700 text-white' 
                                    : 'bg-gray-100 text-gray-900'
                        }`}>
                            <ReactMarkdown className="text-sm prose prose-sm max-w-none">
                                {message.content}
                            </ReactMarkdown>
                        </div>
                        
                        {/* Video Player with Download Button - Fixed container */}
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
                            
                            {/* Download Button */}
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
                        {message.metadata?.image_url && (
                            <div className="text-left mb-3">
                                <img
                                    src={message.metadata.image_url}
                                    alt="Uploaded"
                                    className="w-48 h-48 object-cover rounded-lg"
                                />
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
                    
                    {(message.metadata?.revision_in_progress || message.metadata?.finalizing_revision) && (
                        <div className="mt-4 w-full"> {/* Added w-full for progress bar */}
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm">
                                    {message.metadata?.revision_in_progress ? 'Creating revision...' : 'Finalizing video...'}
                                </span>
                            </div>
                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`bg-orange-500 h-2 rounded-full transition-all duration-300 ${
                                        message.metadata?.finalizing_revision ? 'w-4/5' : 'w-1/2'
                                    }`}
                                ></div>
                            </div>
                        </div>
                    )}

                    {message.metadata?.is_approval_section && !message.metadata?.video_completed && (
                        <div className="flex gap-2 mt-4 w-full"> {/* Added w-full for buttons */}
                            <Button
                                onClick={() => {
                                    console.log('🔘 Start Production button clicked');
                                    console.log('📋 Message metadata:', message.metadata);

                                    const briefMessage = messages.find(m => m.metadata?.is_brief);
                                    const imageUrl = message.metadata.image_url || briefMessage?.metadata?.image_url;

                                    console.log('🖼️ Image URL found:', imageUrl);
                                    console.log('📝 Brief content:', !!message.metadata.brief_content);

                                    handleStartProduction(
                                        message.metadata.brief_content,
                                        imageUrl,
                                        message.metadata.original_prompt,
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
                            Not sure where to start? try these:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            {[
                                "Product showcase video",
                                "Social media ad",
                                "Unboxing video",
                                "Brand story video"
                            ].map((prompt, index) => (
                                <button
                                    key={index}
                                    onClick={() => setInput(prompt)}
                                    className="p-4 text-center rounded-xl border border-gray-600 bg-gray-800/50 text-gray-300 hover:border-orange-500/50 hover:bg-gray-700/50 transition-all duration-200"
                                >
                                    <div className="text-sm font-light">
                                        {prompt}
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
                                            accept="image/*"
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
                                            accept="image/*"
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
