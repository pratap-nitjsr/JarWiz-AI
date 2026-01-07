export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const DEEPGRAM_API_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || '';

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf']
};

export const DEEPGRAM_CONFIG = {
  model: 'nova-2',
  language: 'en-US',
  smart_format: true,
  interim_results: true
};
