// Base44 Core Integrations - properly structured
export const Core = {
  InvokeLLM: async (data) => {
    const response = await fetch('/api/integrations/invoke-llm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`LLM invocation failed: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  SendEmail: async (data) => {
    const response = await fetch('/api/integrations/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Email send failed: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  UploadFile: async ({ file }) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/integrations/upload-file', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`File upload failed: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  GenerateImage: async (data) => {
    const response = await fetch('/api/integrations/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Image generation failed: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  ExtractDataFromUploadedFile: async (data) => {
    const response = await fetch('/api/integrations/extract-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Data extraction failed: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  CreateFileSignedUrl: async (data) => {
    const response = await fetch('/api/integrations/create-signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Signed URL creation failed: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  UploadPrivateFile: async (data) => {
    const formData = new FormData();
    formData.append('file', data.file);
    
    const response = await fetch('/api/integrations/upload-private-file', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Private file upload failed: ${response.statusText}`);
    }
    
    return response.json();
  }
};

// Export individual functions for convenience
export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;
export const CreateFileSignedUrl = Core.CreateFileSignedUrl;
export const UploadPrivateFile = Core.UploadPrivateFile;