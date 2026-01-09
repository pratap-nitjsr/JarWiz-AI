// API Response Types
export interface UploadResponse {
  document_id: string;
  filename: string;
  total_pages: number;
  message: string;
}

export interface ChatRequest {
  query: string;
  document_ids?: string[];  // Multiple documents support
  search_mode?: 'vector_only' | 'web_only' | 'both' | 'none';  // Default: 'both'
  conversation_history?: Array<{
    role: string;
    content: string;
    timestamp?: string;
  }>;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Citation {
  citation_id: string;
  page_number: number;
  relevance_score: number;
  text_snippet: string;
  highlight_regions: BoundingBox[];
  image_base64?: string;
}

export interface Source {
  source_type: "document" | "web";
  title: string;
  url?: string;
  snippet: string;
  relevance_score?: number;
}

export interface RelevantImage {
  image_id: string;
  image_base64: string;
  caption: string;
  page_number: number;
  relevance_score: number;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  sources: Source[];
  relevant_images: RelevantImage[];
  query: string;
  web_search_used: boolean;
  web_search_reason?: string;
  document_confidence: number;
}

// Local Types
export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  citations?: Citation[];
  sources?: Source[];
  relevant_images?: RelevantImage[];
  web_search_used?: boolean;
  web_search_reason?: string;
  document_confidence?: number;
}

export interface Document {
  id: string;
  filename: string;
  total_pages: number;
  upload_date: Date;
}

export interface ChatState {
  messages: Message[];
  currentDocument: Document | null;
  isLoading: boolean;
  error: string | null;
  addMessage: (message: Message) => void;
  setCurrentDocument: (document: Document | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearMessages: () => void;
}

export interface DocumentsState {
  documents: Document[];
  selectedDocumentIds: string[];  // Support multiple documents
  selectedDocumentNames: string[];  // Track names for display
  addDocument: (document: Document) => void;
  removeDocument: (documentId: string) => void;
  toggleDocumentSelection: (documentId: string, documentName: string) => void;  // Toggle instead of select
  clearSelection: () => void;
}

export interface VoiceInputState {
  isRecording: boolean;
  transcript: string;
  error: string | null;
}
