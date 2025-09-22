// Mock integrations for development
export const Core = {
  InvokeLLM: async (data) => {
    console.log('Mock LLM invocation:', data);
    return { result: 'Mock response' };
  },
  SendEmail: async (data) => {
    console.log('Mock email send:', data);
    return { success: true };
  },
  UploadFile: async ({ file }) => {
    console.log('Mock file upload:', file.name);
    return { file_url: URL.createObjectURL(file) };
  },
  GenerateImage: async (data) => {
    console.log('Mock image generation:', data);
    return { image_url: 'https://via.placeholder.com/400x300' };
  },
  ExtractDataFromUploadedFile: async (data) => {
    console.log('Mock data extraction:', data);
    return { extracted_data: {} };
  },
  CreateFileSignedUrl: async (data) => {
    console.log('Mock signed URL creation:', data);
    return { signed_url: 'https://example.com/signed-url' };
  },
  UploadPrivateFile: async (data) => {
    console.log('Mock private file upload:', data);
    return { file_url: 'https://example.com/private-file' };
  }
};

export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.CreateFileSignedUrl;
export const UploadPrivateFile = Core.UploadPrivateFile;