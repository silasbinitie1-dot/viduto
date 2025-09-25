import { supabase } from '@/lib/supabase'

export const Core = {
  InvokeLLM: async ({ prompt, image_url, max_tokens = 2000 }) => {
    try {
      console.log('InvokeLLM called with:', {
        prompt: prompt ? `${prompt.substring(0, 100)}...` : 'No prompt',
        image_url: image_url ? `${image_url.substring(0, 50)}...` : 'No image',
        max_tokens
      });

      // Call the Supabase Edge Function instead of OpenAI directly
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generateVideoBrief`;
      
      const headers = {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      console.log('Calling Edge Function at:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          image_url,
          max_tokens
        })
      });

      console.log('Edge Function response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.error('Edge Function error response:', errorData);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { error: 'Unknown error', details: await response.text() };
        }
        
        throw new Error(errorData.details || errorData.error || `API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Edge Function success, response length:', result.response?.length || 0);
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
    try {
      const { supabase } = await import('@/lib/supabase');
      
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }
      
      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size too large. Please use an image under 10MB.');
      }
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPG or PNG image.');
      }
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      
      console.log('Uploading file to Supabase Storage:', {
        fileName,
        fileSize: file.size,
        fileType: file.type
      });
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('public-files')
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      console.log('File uploaded successfully:', urlData.publicUrl);
      
      return { 
        file_url: urlData.publicUrl,
        file_path: filePath,
        success: true 
      };
      
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  },
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error('File size too large. Please use an image under 10MB.');
      }
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Please upload a JPG or PNG image.');
      }
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;
      
      console.log('Uploading file to Supabase Storage:', {
        fileName,
        fileSize: file.size,
        fileType: file.type
      });
      
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('public-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('public-files')
        .getPublicUrl(filePath);
      
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      console.log('File uploaded successfully:', urlData.publicUrl);
      
      return { 
        file_url: urlData.publicUrl,
        file_path: filePath,
        success: true 
      };
      
    } catch (error) {
      console.error('File upload error:', error);
      throw new Error(`File upload failed: ${error.message}`);
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