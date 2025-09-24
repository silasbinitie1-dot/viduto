import { supabase } from '@/lib/supabase'

export const Core = {
  InvokeLLM: async (data) => {
    // For demo purposes, return a mock response
    // In production, this would call your LLM service
    return {
      response: "This is a mock LLM response. In production, this would call your actual LLM service.",
      usage: { tokens: 100 }
    }
  },
  
  SendEmail: async (data) => {
    // For demo purposes, log the email
    console.log('Email would be sent:', data)
    return { success: true, message: 'Email sent successfully' }
  },
  
  UploadFile: async ({ file }) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `uploads/${fileName}`

    const { data, error } = await supabase.storage
      .from('files')
      .upload(filePath, file)

    if (error) {
      throw new Error(`File upload failed: ${error.message}`)
    }

    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(filePath)

    return { file_url: publicUrl }
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