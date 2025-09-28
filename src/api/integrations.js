import { supabase } from '@/lib/supabase'

export const Core = {
  InvokeLLM: async ({ prompt, image_url, max_tokens = 2000 }) => {
    try {
      // Get the current user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('Not authenticated - please log in again')
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoke-llm`
      
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          image_url,
          max_tokens
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('LLM API Error Response:', errorText)
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        throw new Error(errorData.error || 'Failed to invoke LLM')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error invoking LLM:', error)
      throw error
    }
  },
  
  SendEmail: async (data) => {
    // For demo purposes, log the email
    console.log('Email would be sent:', data)
    return { success: true, message: 'Email sent successfully' }
  },
  
  UploadFile: async ({ file }) => {
    try {
      // Get the current user's session token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.access_token) {
        throw new Error('Not authenticated - please log in again')
      }

      if (!file || !(file instanceof File)) {
        throw new Error('Invalid file provided')
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-file`
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'user-uploads')

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: formData
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload API Error Response:', errorText)
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        throw new Error(errorData.error || 'Failed to upload file')
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error uploading file:', error)
      throw error
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