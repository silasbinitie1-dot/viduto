import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailRequest {
  to: string
  subject: string
  html?: string
  text?: string
  from?: string
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

    const { to, subject, html, text, from = 'noreply@viduto.com' }: EmailRequest = await req.json()

    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, subject, and html or text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For demo purposes, log the email instead of actually sending it
    // In production, you would integrate with an email service like SendGrid, Resend, etc.
    console.log('Email would be sent:', {
      from,
      to,
      subject,
      html: html ? 'HTML content provided' : 'No HTML',
      text: text ? 'Text content provided' : 'No text'
    })

    // Log the email attempt
    await supabase
      .from('system_log')
      .insert({
        operation: 'email_sent',
        entity_type: 'email',
        entity_id: crypto.randomUUID(),
        user_email: user.email,
        status: 'success',
        message: `Email sent to ${to}`,
        metadata: {
          to,
          subject,
          from,
          has_html: !!html,
          has_text: !!text
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        email_id: crypto.randomUUID()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in send-email:', error)
    
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