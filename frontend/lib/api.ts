import axios from 'axios';
import { API_BASE_URL } from './constants';
import type { UploadResponse, ChatRequest, ChatResponse } from '@/types';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiClient = {
  // Document operations
  uploadDocument: async (file: File, title?: string, description?: string): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (description) formData.append('description', description);

    const response = await api.post<UploadResponse>('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  deleteDocument: async (documentId: string): Promise<void> => {
    await api.delete(`/api/documents/${documentId}`);
  },

  listDocuments: async (): Promise<{ documents: any[] }> => {
    const response = await api.get('/api/documents/list');
    return response.data;
  },

  getDocumentMetadata: async (documentId: string): Promise<any> => {
    const response = await api.get(`/api/documents/${documentId}/metadata`);
    return response.data;
  },

  // Chat operations
  sendQuery: async (request: ChatRequest): Promise<ChatResponse> => {
    const response = await api.post<ChatResponse>('/api/chat/query', request);
    return response.data;
  },

  // Chat with streaming
  sendQueryStream: async (
    request: ChatRequest,
    onChunk: (chunk: string) => void,
    onDone: (metadata: any) => void,
    onError: (error: string) => void
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'chunk') {
              onChunk(data.content);
            } else if (data.type === 'done') {
              onDone(data);
            } else if (data.type === 'error') {
              onError(data.message);
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  },

  // Citation operations
  getCitation: async (citationId: string): Promise<{ citation_id: string; image: string }> => {
    const response = await api.get(`/api/citations/${citationId}`);
    return response.data;
  },

  getFullPage: async (filename: string, pageNumber: number): Promise<{ filename: string; page_number: number; image: string }> => {
    const response = await api.get(`/api/citations/page/${filename}/${pageNumber}`);
    return response.data;
  },

  // Health check
  healthCheck: async (): Promise<{ status: string }> => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default apiClient;