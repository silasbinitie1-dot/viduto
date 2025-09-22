/* Auto-dated weekly posts: newest today, oldest weeksAgo = posts.length - 1 */
const formatDate = (d) => d.toISOString().slice(0, 10);
const dateWeeksAgo = (weeks) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - weeks * 7);
  return formatDate(d);
};

export const postsData = [
  {
    id: "p12",
    slug: "complete-guide-to-text-based-video-creation",
    title: "Complete Guide to Text-Based Video Creation [No Skills Needed]",
    meta_description: "Master text-based video creation without any technical skills. Create professional videos just by typing. Examples and templates included.",
    excerpt: "If you can write an email, you can create professional videos. Type what you want, get a polished video in minutes.",
    cover_image_url: "https://images.unsplash.com/photo-1483058712412-4245e9b90334?q=80&w=1600&auto=format&fit=crop",
    author: "Viduto Team",
    tags: ["Guides", "Text-to-Video", "AI"],
    reading_time: "7 min",
    content: `## The Skill Making Editing Obsolete
If you can type, you can create professional videos—no courses, no tutorials.

### What is Text-Based Video Creation?
Describe your video in plain English. AI creates it professionally.
- You write: "Show my product with energetic music and modern transitions."
- You get: A polished 30-second video ready for Reels, TikTok, Shorts.

### The Process
1. Write your core description (what to show, how it should feel, who it's for).
2. Add specifics (features to highlight, lifestyle context, CTA).
3. Upload assets (logos, product images).
4. Let AI work (~10 minutes).
5. Refine with simple instructions (“Make the opening more dramatic”).

### Templates
- Product Launch: "Create exciting product reveal with anticipation and powerful ending."
- Social: "Trendy, fast-paced lifestyle edit of [product] for IG Reels."
- Business Intro: "Professional overview with trustworthy tone and modern style."

### Why Text Wins
- Cost: $20/month vs. thousands in agency fees.
- Speed: 10 minutes vs. 30 hours of production.
- Accessibility: Anyone can do it.

### Real-World Wins
- E‑commerce: "Show product from 3 angles with upbeat music" → ready for product page.
- Social: "Trendy lifestyle edit with viral transitions" → publish same day.

Typing is the new editing.`
  },
  {
    id: "p11",
    slug: "ten-minute-video-creation",
    title: "10-Minute Video Creation: Faster Than Agencies Reply to Emails",
    meta_description: "Create professional videos in 10 minutes while agencies take weeks. The exact process and comparisons. Start from $20/month.",
    excerpt: "Create a professional 30-second video in 10 minutes—while agencies are still reading your brief.",
    cover_image_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=1600&auto=format&fit=crop",
    author: "Viduto Team",
    tags: ["Speed", "Workflow", "Marketing"],
    reading_time: "6 min",
    content: `## The 10-Minute Promise
Create a professional 30-second video in about 10 minutes.

### Breakdown
- Minutes 0–2: Describe your vision + upload image (optional)
- Minutes 2–10: AI handles scenes, product integration, music, transitions, optimization
- Minute 10: Download and publish

### Real-Time Comparison
- Agency: days to weeks.
- Viduto: 10 minutes to done.

### Speed Advantage
Respond to trends, launch products immediately, test multiple versions in an hour.

### Quality Without Sacrifice
Professional scenes, smooth transitions, optimized for engagement.`
  },
  {
    id: "p10",
    slug: "vibe-clipping-video-creation",
    title: "Vibe Clipping: The Future of Video Creation Through Conversation",
    meta_description: "Create professional videos through natural conversation instead of editing. Vibe Clipping makes video creation accessible to everyone.",
    excerpt: "Describe what you want. Get a video. Refine with natural language. That's Vibe Clipping.",
    cover_image_url: "https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?q=80&w=1600&auto=format&fit=crop",
    author: "Viduto Team",
    tags: ["Concepts", "Innovation"],
    reading_time: "6 min",
    content: `## What is Vibe Clipping?
Video creation through conversation. No timelines. No technical knowledge.

### Why It Matters
- Speed: Describe in 30 seconds what takes hours to edit.
- Accessibility: If you can type, you can create.
- Quality: Professional results with quick refinements.

### Real Conversations
"Make it premium." → Elegant showcase.
"Add more energy in the middle." → Faster pacing, dynamic transitions.`
  },
  {
    id: "p9",
    slug: "create-professional-product-scenes-from-photos",
    title: "How to Create Professional Product Scenes from Photos [2025 Tutorial]",
    meta_description: "Turn product photos into professional scenes in minutes—lifestyle, studio, or dynamic showcases.",
    excerpt: "Your product photos can become a complete video library—no filming required.",
    cover_image_url: "https://images.unsplash.com/photo-1526948128573-703ee1aeb6fa?q=80&w=1600&auto=format&fit=crop",
    author: "Viduto Team",
    tags: ["Product Video", "How-To"],
    reading_time: "7 min",
    content: `## Scene Generation 101
Place your actual product naturally into lifestyle, studio, or dynamic scenes—without filming.

### Steps
1. Pick your best photo (1920×1080+ ideal).
2. Upload to Viduto.
3. Describe the scene ("Minimalist home", "Professional office", "Outdoor morning light").
4. Get a 30-second video in ~10 minutes.

### Why It Converts
Authenticity beats generic stock: trust rises and sales follow.

### Styles to Try
- Lifestyle integration
- Studio presentations
- Dynamic showcases with reveals and zooms`
  },
  {
    id: "p8",
    slug: "no-video-editing-software-needed",
    title: "Why You Don't Need Video Editing Software Anymore [2025 Truth]",
    meta_description: "Complex editing software is obsolete. Create professional videos using plain English—no technical skills.",
    excerpt: "Cancel the $660/year subscription. Create better videos faster without software.",
    cover_image_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1600&auto=format&fit=crop",
    author: "Viduto Team",
    tags: ["Opinion", "Cost Saving"],
    reading_time: "6 min",
    content: `## The Software Trap
Years learning tools, paying subscriptions, constant upgrades. You don't need any of it.

### The Alternative
- Browser-based
- No installs
- Type → Get video
- 10 minutes per video

### Real Stories
Marketers and founders cancelling software, creating more and better content—faster.`
  },
  {
    id: "p7",
    slug: "pay-as-you-go-video-creation-pricing",
    title: "Pay-As-You-Go Video Creation: The Smart Pricing Model [2025 Guide]",
    meta_description: "Flexible pay-as-you-go video creation from $20/month. No contracts, scale up or down instantly.",
    excerpt: "Use only what you need. Scale with success. No penalties—ever.",
    cover_image_url: "https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=1600&auto=format&fit=crop",
    author: "Viduto Team",
    tags: ["Pricing", "Strategy"],
    reading_time: "7 min",
    content: `## Why Flexible Pricing Wins
Stop overpaying for unused retainers and annual licenses.

### How It Works
- Start at $20/month
- Credits-based
- Scale up/down any time
- Unused credits roll over

### ROI at Any Level
Begin with $20, prove ROI, then scale confidently—no lock-in.`
  },
  {
    id: "p6",
    slug: "video-production-cost-2025-price-guide",
    title: "How Much Does Video Production Really Cost? [2025 Price Guide]",
    meta_description: "Transparent breakdown of video production costs vs. AI solutions. Save thousands with Viduto.",
    excerpt: "Agencies: $3.5k–$17k per 30s commercial. Viduto: $20/month. Here's the math.",
    cover_image_url: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1600&auto=format&fit=crop",
    author: "Viduto Team",
    tags: ["Pricing", "Analysis"],
    reading_time: "8 min",
    content: `## The Costs Nobody Shows
Agencies, freelancers, software, hidden fees—add them up.

### 12-Month Scenario (5 vids/month)
- Traditional: $30k–$300k+
- Viduto: $348/year + 10 hours total time

### Value Beyond Price
Consistent quality, 10-minute turnaround, zero hidden fees.`
  },
  {
    id: "p5",
    slug: "guide-to-video-customization-without-editing",
    title: "Complete Guide to Video Customization Without Editing Software",
    meta_description: "Customize every aspect of videos using plain English. Modify scenes, mood, pacing, and more in seconds.",
    excerpt: "Say what you want changed—AI understands and updates your video quickly.",
    cover_image_url: "https://images.unsplash.com/photo-1532619187608-e5375cab36aa?q=80&w=1600&auto=format&fit=crop",
    author: "Viduto Team",
    tags: ["How-To", "Customization"],
    reading_time: "7 min",
    content: `## Natural-Language Customization
Traditional editing: menus, keyframes, rendering. New way: say it and it's done.

### What You Can Change
- Scenes and context
- Mood and color
- Pacing and energy
- Style and brand feel

### Real Dialogues
"More energy" → faster pace + dynamic transitions. "More premium" → elegant grading + calmer pacing.`
  },
  {
    id: "p4",
    slug: "create-viral-social-media-videos-2025-strategy",
    title: "How to Create Viral Social Media Videos in Minutes [2025 Strategy]",
    meta_description: "Exact strategy for creating viral videos in 10 minutes. TikTok, Reels, Shorts included.",
    excerpt: "Hook in 3 seconds, 30-second sweet spot, data-driven optimization built in.",
    cover_image_url: "https://images.unsplash.com/photo-1492724441997-5dc865305da7?q=80&w=1600&auto=format&fit=crop",
    author: "Viduto Team",
    tags: ["Viral", "Social Media"],
    reading_time: "7 min",
    content: `## What Drives Virality
3-second hook, movement, contrast, and loopability.

### 10-Minute Process
1. Define hook
2. Upload assets
3. Generate and post

### Testing Wins
Create 10 versions in 100 minutes, scale the winners.`
  },
  {
    id: "p3",
    slug: "ai-video-creation-vs-traditional-editing-2025-cost-analysis",
    title: "AI Video Creation vs Traditional Editing: 2025 Cost Analysis",
    meta_description: "Detailed cost and time comparison. Why businesses save 90%+ with AI.",
    excerpt: "Time is money: 8–20 hours per video vs. 10 minutes. The numbers are clear.",
    cover_image_url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1600&auto=format&fit=crop",
    author: "Viduto Team",
    tags: ["Analysis", "Cost"],
    reading_time: "8 min",
    content: `## True Cost Breakdown
Software, assets, plugins, time—the traditional stack is expensive.

### AI with Viduto
- $20/month
- 10 minutes per video
- Revisions by plain language

### Business Scenario
10 videos/month: save $5k–$10k monthly and launch faster.`
  },
  {
    id: "p2",
    slug: "turn-product-photos-into-videos-2025-tutorial",
    title: "How to Turn Product Photos into Videos [2025 Tutorial]",
    meta_description: "Transform product images into professional marketing videos in 10 minutes.",
    excerpt: "Use your existing photos to create authentic product videos—no shoots required.",
    cover_image_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop",
    author: "Viduto Team",
    tags: ["Product Video", "Tutorial"],
    reading_time: "7 min",
    content: `## From Photos to Video
Upload product images, describe the vision, get a 30s video in ~10 minutes.

### Why It Works
Authentic representation, perfect consistency, zero filming.

### Real Results
156% conversion lift after rolling videos across catalog.`
  },
  {
    id: "p1",
    slug: "how-to-make-videos-from-text-2025-complete-guide",
    title: "How to Make Videos from Text in 2025 [Complete Guide]",
    meta_description: "Create professional videos from text in 10 minutes. No editing skills needed. Pricing from $20/month.",
    excerpt: "Type your idea, upload your product image, and get a polished video—fast.",
    cover_image_url: "https://images.unsplash.com/photo-1532614338840-ab30cf10ed36?q=80&w=1600&auto=format&fit=crop",
    author: "Viduto Team",
    tags: ["Guides", "Text-to-Video"],
    reading_time: "8 min",
    content: `## Can You Really Create Videos by Typing?
Yes—about 10 minutes from idea to professional output.

### How It Works
Describe → AI scripts, scenes, voiceover, music → 30s video

### Traditional vs. Text-Based
- Agency: $2k–$5k, weeks
- Viduto: from $20/month, minutes

### First Video in 4 Steps
Write request → Upload image → Generate → Refine

### Who Uses It
Small businesses, e‑commerce, marketers, creators.`
  },
].map((post, idx, arr) => ({
  ...post,
  // Newest today (weeksAgo = 0). Oldest is (arr.length-1) weeks ago.
  published_at: dateWeeksAgo((arr.length - 1) - idx),
}));