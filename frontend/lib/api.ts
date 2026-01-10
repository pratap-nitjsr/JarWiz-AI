import axios from 'axios';
import { API_BASE_URL } from './constants';
import type { UploadResponse, ChatRequest, ChatResponse } from '@/types';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
      } catch (error) {
        console.error('Error parsing auth storage:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get refresh token from storage
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const { state } = JSON.parse(authStorage);
          if (state?.refreshToken) {
            // Try to refresh token
            const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
              refresh_token: state.refreshToken,
            });

            if (response.data.access_token) {
              // Update tokens in storage
              const newStorage = {
                state: {
                  ...state,
                  accessToken: response.data.access_token,
                  refreshToken: response.data.refresh_token,
                },
                version: 0,
              };
              localStorage.setItem('auth-storage', JSON.stringify(newStorage));

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
              return api(originalRequest);
            }
          }
        }
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        localStorage.removeItem('auth-storage');
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

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
      // Get auth token from storage
      let authToken = '';
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage);
          if (state?.accessToken) {
            authToken = state.accessToken;
          }
        } catch (e) {
          console.error('Error parsing auth storage:', e);
        }
      }

      console.log('Sending stream request:', JSON.stringify(request));
      
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : '',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - redirect to login
          localStorage.removeItem('auth-storage');
          window.location.href = '/auth/login';
          throw new Error('Session expired. Please login again.');
        }
        // Get error details
        const errorBody = await response.text();
        console.error('Stream error:', response.status, errorBody);
        throw new Error(`HTTP error! status: ${response.status} - ${errorBody}`);
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