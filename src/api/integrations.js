import { supabase } from '@/lib/supabase'

export const Core = {
  InvokeLLM: async ({ prompt, image_url, max_tokens = 2000 }) => {
    try {
      // Call the Supabase Edge Function instead of OpenAI directly
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateVideoBrief`;
      
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          image_url,
          max_tokens
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || `API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Video Brief Generation Error:', error);
      throw new Error(`Failed to generate brief: ${error.message}`);
    }
  },
  
  SendEmail: async (data) => {
    // For demo purposes, log the email
    console.log('Email would be sent:', data)
    return { success: true, message: 'Email sent successfully' }
  },
  
  UploadFile: async ({ file }) => {
    // Mock file upload - convert to base64 data URL for demo
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({ file_url: e.target.result });
      };
      reader.readAsDataURL(file);
    });
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