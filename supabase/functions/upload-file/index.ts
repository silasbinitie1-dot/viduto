import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface UploadRequest {
  file: File
  bucket?: string
  path?: string
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

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const bucket = formData.get('bucket') as string || 'user-uploads'
    const customPath = formData.get('path') as string

    if (!file) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: 'File size must be less than 10MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2)
    const fileName = `${timestamp}_${randomString}.${fileExt}`
    const filePath = customPath || `uploads/${fileName}`

    console.log('Uploading file:', { name: file.name, size: file.size, type: file.type })
    console.log('Generated file path:', filePath)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (error) {
      console.error('Supabase storage error:', error)
      throw new Error(`File upload failed: ${error.message}`)
    }

    console.log('File uploaded successfully:', data)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    console.log('Generated public URL:', publicUrl)
    
    // Validate that we're not returning a base64 URL
    if (publicUrl.startsWith('data:')) {
      throw new Error('Upload failed - received base64 URL instead of storage URL')
    }

    // Log the upload
    await supabase
      .from('system_log')
      .insert({
        operation: 'file_uploaded',
        entity_type: 'file',
        entity_id: data.id || crypto.randomUUID(),
        user_email: user.email,
        status: 'success',
        message: `File uploaded successfully: ${file.name}`,
        metadata: {
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          bucket,
          file_path: filePath,
          public_url: publicUrl
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        file_url: publicUrl,
        file_path: filePath,
        bucket: bucket
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in upload-file:', error)
    
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