import { supabase } from '@/lib/supabaseClient'

// Real Supabase integrations with fallback mocks for development
export const Core = {
  InvokeLLM: async (data) => {
    console.log('Mock LLM invocation:', data);
    return { result: 'Mock AI response: I understand your request and will create a professional video.' };
  },
  
  SendEmail: async (data) => {
    console.log('Mock email send:', data);
    return { success: true };
  },
  
  UploadFile: async ({ file }) => {
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
      
      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .upload(fileName, file)

      if (error) {
        console.error('Supabase upload error:', error)
        // Fallback to mock URL
        const mockUrl = `https://mock-storage.viduto.com/uploads/${Date.now()}_${file.name}`
        return { file_url: mockUrl }
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(data.path)

      return { file_url: publicUrl }
    } catch (error) {
      console.error('File upload error:', error)
      // Fallback to mock URL
      const mockUrl = `https://mock-storage.viduto.com/uploads/${Date.now()}_${file.name}`
      return { file_url: mockUrl }
    }
  },
  
  GenerateImage: async (data) => {
    console.log('Mock image generation:', data);
    return { image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' };
  },
  
  ExtractDataFromUploadedFile: async (data) => {
    console.log('Mock data extraction:', data);
    return { extracted_data: { text: 'Mock extracted text', metadata: {} } };
  },
  
  CreateFileSignedUrl: async (data) => {
    console.log('Mock signed URL creation:', data);
    return { signed_url: 'https://mock-storage.viduto.com/signed-url' };
  },
  
  UploadPrivateFile: async (data) => {
    console.log('Mock private file upload:', data);
    return { file_url: 'https://mock-storage.viduto.com/private/file' };
  }
};

export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.CreateFileSignedUrl;
export const UploadPrivateFile = Core.UploadPrivateFile;