const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    const baseUrl = Deno.env.get('VITE_APP_BASE_URL') || 'https://viduto.com'
    const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Disallow admin and private areas
Disallow: /dashboard
Disallow: /admin
Disallow: /api
Disallow: /_next
Disallow: /supabase

# Allow important pages
Allow: /
Allow: /home
Allow: /features
Allow: /pricing
Allow: /blog
Allow: /enterprise
Allow: /terms
Allow: /privacy

# Crawl delay
Crawl-delay: 1`;

    return new Response(robotsTxt, {
      status: 200,
      headers: { 
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8" 
      },
    });
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    
    // Return minimal robots.txt on error
    const fallbackRobots = `User-agent: *
Allow: /`;

    return new Response(fallbackRobots, {
      status: 200,
      headers: { 
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8" 
      },
    });
  }
})