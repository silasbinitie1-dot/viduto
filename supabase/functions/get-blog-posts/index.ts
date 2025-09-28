import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

function toSlug(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/\[.*?\]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function wordsCount(s = '') {
  return (s.trim().match(/\b\w+\b/g) || []).length;
}

function estimateReadingTime(content = '') {
  const minutes = Math.max(1, Math.round(wordsCount(content) / 200));
  return `${minutes} min`;
}

function formatDate(d) {
  const dd = new Date(d);
  dd.setHours(12, 0, 0, 0);
  return dd.toISOString().slice(0, 10);
}

function dateWeeksAgo(weeks) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - weeks * 7);
  return formatDate(d);
}

function pickCover(index) {
  // Only video-themed images
  const imgs = [
    'https://images.unsplash.com/photo-1497015289633-94624697534a?q=80&w=1600&auto=format&fit=crop', // camera close-up
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1600&auto=format&fit=crop', // film reel
    'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?q=80&w=1600&auto=format&fit=crop', // editing timeline
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1600&auto=format&fit=crop', // studio lights
    'https://images.unsplash.com/photo-1512428559087-560fa5ceab42?q=80&w=1600&auto=format&fit=crop', // video screen wall
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1600&auto=format&fit=crop', // projector vibe
    'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=1600&auto=format&fit=crop', // microphone + audio
    'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?q=80&w=1600&auto=format&fit=crop', // edit suite
    'https://images.unsplash.com/photo-1517022812141-23620dba5c23?q=80&w=1600&auto=format&fit=crop', // clapboard
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1600&auto=format&fit=crop', // screens & content
    'https://images.unsplash.com/photo-1509098681021-2a0b0b89a3b8?q=80&w=1600&auto=format&fit=crop', // camera rig
    'https://images.unsplash.com/photo-1484704849700-f032a568e944?q=80&w=1600&auto=format&fit=crop', // studio set
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1600&auto=format&fit=crop'  // neon video vibe
  ];
  return imgs[index % imgs.length];
}

function sanitizeContent(lines) {
  // Convert bullets, detect headings, normalize spacing into Markdown
  const out = [];
  const L = lines.length;

  const isLikelyHeading = (text, prevEmpty, nextNonEmpty) => {
    const t = text.trim();
    if (!t) return false;
    if (/^(\*|\d+\.)\s/.test(t)) return false; // bullets/numbers
    if (/^Meta Description:/i.test(t)) return false;
    if (/^Target Keywords:/i.test(t)) return false;
    if (t.length > 120) return false;
    if (!prevEmpty || !nextNonEmpty) return false; // Must be preceded by empty line (or start of doc) and followed by a non-empty line
    // Heuristics: title case or ends with ?/: or contains parentheses for subheads
    return /[A-Za-z]/.test(t) && (/[?:]$/.test(t) || /[()]/.test(t) || /^[A-Z][^.!?]{3,}$/.test(t));
  };

  for (let i = 0; i < L; i++) {
    const raw = lines[i] ?? '';
    const t = raw.trim();

    // Skip separators like "_____"
    if (/^_{3,}$/.test(t)) continue;

    // Convert unordered list
    if (/^\*\s+/.test(t)) {
      out.push(t.replace(/^\*\s+/, '- '));
      continue;
    }

    // Convert ordered "Step X:" into a subheading
    if (/^Step\s+\d+:/i.test(t)) {
      out.push(`### ${t.replace(/^Step\s+(\d+):/i, 'Step $1:').trim()}`);
      continue;
    }

    // Convert numbered list like "1. ..." (keep as is)
    if (/^\d+\.\s+/.test(t)) {
      out.push(t);
      continue;
    }

    // Detect standalone headings
    const prevEmpty = (i === 0) || !(lines[i - 1] || '').trim();
    const nextNonEmpty = (i < L - 1) && !!(lines[i + 1] || '').trim();
    if (isLikelyHeading(t, prevEmpty, nextNonEmpty)) {
      out.push(`## ${t}`);
      continue;
    }

    // Normal paragraph (keep raw to preserve punctuation)
    out.push(raw); // Use raw here to preserve leading spaces/indentation for non-heading, non-list lines if desired
  }

  // Normalize blank lines and trim trailing spaces
  const cleaned = out
    .map((l) => l.replace(/\s+$/g, '')) // Remove trailing whitespace from each line
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // Reduce 3 or more consecutive newlines to two (single blank line)
    .trim(); // Trim leading/trailing blank lines for the whole content

  return cleaned;
}

function buildExcerpt(content) {
  const firstPara = (content || '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^meta description:/i.test(l) && !/^target keywords:/i.test(l))[0] || '';
  const clean = firstPara.replace(/^#+\s*/, '');
  return clean.length > 180 ? clean.slice(0, 177) + '...' : clean;
}

// Convert HTML into clean line-based text that our parser can handle
function htmlToPlainText(html) {
  let s = html || '';
  // drop styles/scripts
  s = s.replace(/<style[\s\S]*?<\/style>/gi, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  // lists
  s = s.replace(/<li[^>]*>/gi, '\n* ');
  s = s.replace(/<\/li>/gi, '');
  s = s.replace(/<\/(ul|ol)>/gi, '\n');
  // headings and paragraphs to newlines
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|h[1-6])>/gi, '\n');
  // remove opening tags but keep content
  s = s.replace(/<[^>]+>/g, '');
  // normalize whitespace
  s = s.replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ');
  s = s.split('\n').map(l => l.trimEnd()).join('\n');
  return s;
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

    // This is a public endpoint - no authentication required
    const body = await req.json().catch(() => ({}))
    const fileUrl = body?.fileUrl || `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/public/blog-content/blog-posts.html`

    const res = await fetch(fileUrl)
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch blog file' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const raw = await res.text()
    const input = /<html/i.test(raw) ? htmlToPlainText(raw) : raw.replace(/\r\n/g, '\n')

    const lines = input.split('\n')

    const posts = []
    let current = null

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i]
      const line = rawLine.trim()

      if (/^Post\s+\d+:/i.test(line)) {
        if (current) posts.push(current)
        const title = line.split(':').slice(1).join(':').trim()
        current = {
          title,
          meta_description: '',
          target_keywords: [],
          contentLines: []
        }
        continue
      }

      if (!current) continue

      if (/^Meta Description:/i.test(line)) {
        current.meta_description = line.split(':').slice(1).join(':').trim()
        continue
      }

      if (/^Target Keywords:/i.test(line)) {
        const rest = line.split(':').slice(1).join(':').trim()
        current.target_keywords = rest
          ? rest.split(',').map((k) => k.trim()).filter(Boolean)
          : []
        continue
      }

      // skip separators like "_____" - this prevents them from being added to contentLines
      if (/^_{3,}$/.test(line)) continue

      current.contentLines.push(rawLine)
    }

    if (current) posts.push(current)

    const finalized = posts.map((p, idx, arr) => {
      // Convert asterisk bullets to markdown bullets
      const content = sanitizeContent(p.contentLines || [])
      const excerpt = buildExcerpt(content)
      const slug = toSlug(p.title)
      const tags = [] // remove tags from previews per request
      const reading_time = estimateReadingTime(content)
      const published_at = dateWeeksAgo((arr.length - 1) - idx)
      let cover_image_url = pickCover(idx)

      // Specific override for the first post cover (reported as not loading)
      if (/^how to make videos from text in 2025/i.test(p.title)) {
        cover_image_url = 'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?q=80&w=1600&auto=format&fit=crop'
      }

      return {
        id: `p${idx + 1}`,
        slug,
        title: p.title,
        meta_description: p.meta_description || excerpt,
        excerpt,
        cover_image_url,
        author: 'Viduto Team',
        tags,
        reading_time,
        content,
        published_at
      }
    })

    finalized.sort((a, b) => (a.published_at < b.published_at ? 1 : -1))
    
    return new Response(
      JSON.stringify({ posts: finalized }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
    
  } catch (error) {
    console.error('Error in get-blog-posts:', error)
    
    return new Response(
      JSON.stringify({ error: error.message || 'Internal error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})