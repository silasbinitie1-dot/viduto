import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    // Initialize Supabase client (not needed for this function but keeping for consistency)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // This is a public endpoint - no authentication required
    const body = await req.json().catch(() => ({}))

    const summary = {
      site: "Viduto",
      homepage: "https://viduto.com/home",
      features_url: "https://viduto.com/features",
      pricing_url: "https://viduto.com/pricing",
      blog_url: "https://viduto.com/blog",
      description: "Viduto turns your real product images into professional 30‑second videos via AI in about 10 minutes.",
      key_features: [
        "Use your real product (no generic stock)",
        "Text-based creation (describe your vision)",
        "Fully customizable (scenes, pacing, mood, VO, music)",
        "Viral-ready content optimized for conversions"
      ],
      video_generation_time_minutes: "about 10",
      revision_cost_credits: 2.5,
      pricing_summary: "Flexible, credit-based pricing starting at $20/month. New users get 20 free credits. Revisions cost 2.5 credits.",
      how_it_works: [
        "Upload a product image",
        "Describe your video in plain English",
        "Receive a 30-second production in ~10 minutes"
      ],
      faqs: [
        { q: "Do I need editing experience?", a: "No. Just upload your product image and describe your idea." },
        { q: "How long does it take?", a: "About 10 minutes for a 30-second video." },
        { q: "How much is a revision?", a: "Each revision costs 2.5 credits." },
        { q: "What's included for free?", a: "New users get 20 free credits to try Viduto with full access to all features." }
      ]
    }

    return new Response(
      JSON.stringify({ success: true, data: summary }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in get-site-summary:', error)
    
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