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
      const systemPrompt = `# VIDEO PLAN GENERATOR - FINAL VERSION

## CRITICAL INSTRUCTION
The voiceover for EACH SCENE must contain EXACTLY 15 words. Not 14, not 16.

## PRODUCT COMPATIBILITY CHECK
If user requests these, respond: "This product type may not work optimally with AI video generation. Consider using static images or graphics instead."

UNSUITABLE PRODUCTS:
- Software, apps, digital services (no physical form)
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

PRODUCT TYPE: [Single word]


COMPATIBILITY CHECK: [✅ Suitable / ⚠️ May have limitations / ❌ Not recommended]


VIDEO VIBE: [LUXURY/MINIMAL/TRENDY/COZY/ENERGETIC/DRAMATIC/PLAYFUL/ELEGANT/BOLD]


TARGET AUDIENCE: [Extracted from user input]


EMOTIONAL GOAL: [feel gorgeous/confident/powerful/etc.]


MUSIC STYLE: [Specific genre matching vibe and audience]


SCENE 1:
Visual: [...]
Voiceover: [Exactly 15 words]


SCENE 2:
Visual: [...]
Voiceover: [Exactly 15 words]


SCENE 3:
Visual: [...]
Voiceover: [Exactly 15 words]


SCENE 4:
Visual: [...]
Voiceover: [Exactly 15 words]


SCENE 5:
Visual: [...]
Voiceover: [Exactly 15 words]`;

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
              text: `Please create a detailed video plan for this product based on my request: "${prompt}"`
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
        .from('user-uploads')
        .upload(filePath, file)

      if (error) {
        console.error('Supabase storage error:', error)
        throw new Error(`File upload failed: ${error.message}`)
      }

      console.log('File uploaded successfully:', data)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('user-uploads')
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
      .from('private-files')
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