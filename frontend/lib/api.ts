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
  uploadDocument: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

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