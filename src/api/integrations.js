import { supabase } from '@/lib/supabase'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

export const Core = {
  InvokeLLM: async ({ prompt, image_url, max_tokens = 2000 }) => {
    try {
      const systemPrompt = `CRITICAL INSTRUCTION
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

A brief user prompt (may be minimal)
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

OUTPUT FORMAT
Present the video plan in a clean, visually organized format:

📦 PRODUCT TYPE
[Single word: shoes, shirt, phone, car, watch, bag, cosmetics, food, toy, furniture, etc.]

🎨 VIDEO VIBE
[Must be ONE: LUXURY / FUN / ENERGETIC / FUNNY]

🎬 VIDEO TITLE
[Catchy internal reference name]

📊 STRATEGIC ANALYSIS
Product Personality: [What makes this product unique]
Target Emotion: [Core feeling to evoke]
Detected Intent: [What user really wants]
Vibe Selection Rationale: [Why this specific vibe was chosen]
Chosen Approach: [How this vibe will be executed]

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
30-second video plan complete and optimized for AI Agent execution`;

      const messages = [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            ...(image_url ? [{
              type: "image_url",
              image_url: {
                url: image_url,
                detail: "high"
              }
            }] : [])
          ]
        }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: max_tokens,
        temperature: 0.7
      });

      return {
        response: completion.choices[0].message.content,
        usage: {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens
        }
      };
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`Failed to generate brief: ${error.message}`);
    }
  },
  
  SendEmail: async (data) => {
    // For demo purposes, log the email
    console.log('Email would be sent:', data)
    return { success: true, message: 'Email sent successfully' }
  },
  
  UploadFile: async ({ file }) => {
    try {
      if (!file || !(file instanceof File)) {
        throw new Error('Invalid file provided')
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2)
      const fileName = `${timestamp}_${randomString}.${fileExt}`
      const filePath = `uploads/${fileName}`

      console.log('Uploading file:', { name: file.name, size: file.size, type: file.type })
      console.log('Generated file path:', filePath)

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(filePath, file)

      if (error) {
        console.error('Supabase storage error:', error)
        throw new Error(`File upload failed: ${error.message}`)
      }

      console.log('File uploaded successfully:', data)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      console.log('Generated public URL:', publicUrl)
      
      // Validate that we're not returning a base64 URL
      if (publicUrl.startsWith('data:')) {
        throw new Error('Upload failed - received base64 URL instead of storage URL')
      }

      return { file_url: publicUrl }
    } catch (error) {
      console.error('Upload error:', error)
      throw new Error(`Failed to upload file: ${error.message}`)
    }
  },
  
  GenerateImage: async (data) => {
    // For demo purposes, return a placeholder
    return {
      image_url: "https://images.unsplash.com/photo-1526948128573-703ee1aeb6fa?q=80&w=800&auto=format&fit=crop",
      success: true
    }
  },
  
  ExtractDataFromUploadedFile: async (data) => {
    // For demo purposes, return mock extracted data
    return {
      extracted_data: { text: "Mock extracted text", metadata: {} },
      success: true
    }
  },
  
  CreateFileSignedUrl: async (data) => {
    // For demo purposes, return the same URL
    return {
      signed_url: data.file_url || "https://example.com/signed-url",
      expires_in: 3600
    }
  },
  
  UploadPrivateFile: async (data) => {
    // Similar to UploadFile but for private storage
    const fileExt = data.file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `private/${fileName}`

    const { data: uploadData, error } = await supabase.storage
      .from('uploads')
      .upload(filePath, data.file)

    if (error) {
      throw new Error(`Private file upload failed: ${error.message}`)
    }

    return { file_path: filePath, success: true }
  }
}

// Export individual functions for convenience
export const InvokeLLM = Core.InvokeLLM
export const SendEmail = Core.SendEmail
export const UploadFile = Core.UploadFile
export const GenerateImage = Core.GenerateImage
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile
export const CreateFileSignedUrl = Core.CreateFileSignedUrl
export const UploadPrivateFile = Core.UploadPrivateFile