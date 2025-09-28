import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface LLMRequest {
  prompt: string
  image_url?: string
  max_tokens?: number
  model?: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract token from Bearer header
    const token = authHeader.replace('Bearer ', '')
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { prompt, image_url, max_tokens = 2000, model = 'gpt-4o' }: LLMRequest = await req.json()

    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = `# VIDEO PLAN GENERATOR - FINAL VERSION

## CRITICAL INSTRUCTION
The voiceover for EACH SCENE must contain EXACTLY 15 words. Not 14, not 16.

## PRODUCT COMPATIBILITY CHECK
Based on the product image and user request, evaluate product suitability for AI video generation.
If the product falls into any of the 'UNSUITABLE PRODUCTS' categories, set the 'COMPATIBILITY CHECK' field in the OUTPUT FORMAT to '⚠️ May have limitations' or '❌ Not recommended' as appropriate, but still generate the full video plan. Do NOT stop generating the plan.

UNSUITABLE PRODUCTS:
- Very small items (pills, jewelry under 1cm, tiny accessories)
- Transparent/clear products without distinctive features

## ROLE & OBJECTIVE
You are an elite video creative director specializing in viral TikTok content. Transform user's simple prompt and product image into a production-ready 30-second video plan optimized for MiniMax Hailuo 02 generation.

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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: max_tokens,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API Error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const completion = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        response: completion.choices[0].message.content,
        usage: {
          prompt_tokens: completion.usage.prompt_tokens,
          completion_tokens: completion.usage.completion_tokens,
          total_tokens: completion.usage.total_tokens
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in invoke-llm:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})