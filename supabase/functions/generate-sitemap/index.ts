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
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>${baseUrl}/</loc>
<changefreq>weekly</changefreq>
<priority>1.0</priority>
</url>
<url>
<loc>${baseUrl}/home</loc>
<changefreq>weekly</changefreq>
<priority>1.0</priority>
</url>
<url>
<loc>${baseUrl}/features</loc>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>
<url>
<loc>${baseUrl}/pricing</loc>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>
<url>
<loc>${baseUrl}/enterprise</loc>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>
<url>
<loc>${baseUrl}/blog</loc>
<changefreq>weekly</changefreq>
<priority>0.8</priority>
</url>
<url>
<loc>${baseUrl}/terms</loc>
<changefreq>monthly</changefreq>
<priority>0.5</priority>
</url>
<url>
<loc>${baseUrl}/privacy</loc>
<changefreq>monthly</changefreq>
<priority>0.5</priority>
</url>
</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8" 
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Return minimal sitemap on error
    const baseUrl = Deno.env.get('VITE_APP_BASE_URL') || 'https://viduto.com'
    const fallbackXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>${baseUrl}/</loc>
<changefreq>weekly</changefreq>
<priority>1.0</priority>
</url>
</urlset>`;

    return new Response(fallbackXml, {
      status: 200,
      headers: { 
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8" 
      },
    });
  }
})