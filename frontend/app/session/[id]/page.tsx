'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Monitor, 
  Mic, 
  StopCircle, 
  Send, 
  Globe, 
  Database,
  MessageSquare,
  User,
  Users,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Lightbulb,
  LogOut,
  FileText,
  Check,
  Presentation,
} from 'lucide-react';
import { useMeetingTranscription, TranscriptEntry } from '@/hooks/useMeetingTranscription';
import { useDocumentsStore } from '@/hooks/useDocuments';
import ProtectedRoute from '@/components/ProtectedRoute';
import { FullPageViewer } from '@/components/FullPageViewer';
import { PresentationEditor } from '@/components/PresentationEditor';
import api from '@/lib/api';
import type { Source, Document, Citation } from '@/types';

interface AIResponse {
  id: string;
  question: string;
  answer: string;
  sources: Source[];
  citations: Citation[];
  timestamp: Date;
  searchMode: string;
}

export default function SessionPage() {
  const router = useRouter();
  const {
    isCapturing,
    transcripts,
    error,
    tabAudioSupported,
    startCapture,
    stopCapture,
    clearTranscripts,
    getFullTranscript,
    getVideoStream,
  } = useMeetingTranscription();

  const { selectedDocumentIds, selectedDocumentNames, toggleDocumentSelection, documents, addDocument } = useDocumentsStore();
  
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [useVectorDb, setUseVectorDb] = useState(true);
  const [customQuestion, setCustomQuestion] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<Document[]>([]);
  const [viewingPage, setViewingPage] = useState<{ 
    filename: string; 
    page: number; 
    totalPages: number;
    highlightRegions?: { x0: number; y0: number; x1: number; y1: number }[];
  } | null>(null);
  const [showPresentationEditor, setShowPresentationEditor] = useState(false);

  // Compute search mode from toggles
  const getSearchMode = (): 'vector_only' | 'web_only' | 'both' | 'none' => {
    if (useWebSearch && useVectorDb) return 'both';
    if (useWebSearch) return 'web_only';
    if (useVectorDb) return 'vector_only';
    return 'none';
  };

  // Handle viewing a document page with optional highlight regions
  const handleViewPage = (
    filename: string, 
    pageNumber: number, 
    totalPages: number = 1,
    highlightRegions?: { x0: number; y0: number; x1: number; y1: number }[]
  ) => {
    setViewingPage({ filename, page: pageNumber, totalPages, highlightRegions });
  };
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const responsesEndRef = useRef<HTMLDivElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Fetch available documents on mount
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const result = await api.listDocuments();
        setAvailableDocuments(result.documents || []);
      } catch (err) {
        console.error('Failed to fetch documents:', err);
      }
    };
    fetchDocuments();
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Auto-scroll AI responses
  useEffect(() => {
    responsesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiResponses]);

  // Handle video preview from the captured stream
  useEffect(() => {
    if (isCapturing && videoPreviewRef.current) {
      const stream = getVideoStream();
      if (stream) {
        videoPreviewRef.current.srcObject = stream;
      }
    } else if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  }, [isCapturing, getVideoStream]);

  // Ask AI a question based on transcript context
  const askAI = async (question: string) => {
    if (!question.trim()) return;

    setIsAskingAI(true);
    
    try {
      const transcriptContext = getFullTranscript();
      
      const enhancedQuery = `
Meeting Transcript:
${transcriptContext || 'No transcript yet.'}

Question: ${question}

IMPORTANT: Give a SHORT, DIRECT answer (2-3 sentences max). Be concise and actionable. No lengthy explanations.
`;

      const currentSearchMode = getSearchMode();
      
      // Build conversation history from previous AI responses
      const conversationHistory = aiResponses.flatMap(resp => [
        { role: 'user', content: resp.question, timestamp: resp.timestamp.toISOString() },
        { role: 'assistant', content: resp.answer, timestamp: resp.timestamp.toISOString() }
      ]).slice(-10); // Keep last 10 messages (5 Q&A pairs)

      const response = await new Promise<any>((resolve, reject) => {
        let fullAnswer = '';
        let metadata: any = {};

        api.sendQueryStream(
          {
            query: enhancedQuery,
            document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
            search_mode: currentSearchMode,
            conversation_history: conversationHistory,
          },
          (chunk) => {
            fullAnswer += chunk;
          },
          (meta) => {
            metadata = meta;
            resolve({
              answer: fullAnswer,
              sources: metadata.sources || [],
              citations: metadata.citations || [],
            });
          },
          (error) => {
            reject(new Error(error));
          }
        );
      });

      const newResponse: AIResponse = {
        id: `response-${Date.now()}`,
        question,
        answer: response.answer,
        sources: response.sources,
        citations: response.citations,
        timestamp: new Date(),
        searchMode: currentSearchMode,
      };

      setAiResponses(prev => [...prev, newResponse]);
      setCustomQuestion('');
    } catch (error: any) {
      console.error('Error asking AI:', error);
    } finally {
      setIsAskingAI(false);
    }
  };

  // Suggest answer for questions in the conversation
  const suggestAnswer = () => {
    const recentTranscripts = transcripts.filter(t => t.isFinal).slice(-10);
    const lastQuestion = recentTranscripts.reverse().find(t => 
      t.text.includes('?') || 
      t.text.toLowerCase().startsWith('what') ||
      t.text.toLowerCase().startsWith('how') ||
      t.text.toLowerCase().startsWith('why') ||
      t.text.toLowerCase().startsWith('when') ||
      t.text.toLowerCase().startsWith('can')
    );

    if (lastQuestion) {
      askAI(`Answer this briefly: "${lastQuestion.text}"`);
    } else {
      askAI('Give me the key points from this conversation in bullet points.');
    }
  };

  // What to say next
  const whatToSayNext = () => {
    askAI('What should I say next? Give me one short suggestion.');
  };

  const handleExit = () => {
    stopCapture();
    router.push('/');
  };

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col bg-background">
        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Screen Preview & Transcript */}
          <div className={`flex flex-col border-r transition-all duration-300 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-[45%]'}`}>
            {/* Screen Preview */}
            <div className="relative bg-gray-900 aspect-video">
              {isCapturing ? (
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <Monitor className="h-16 w-16 opacity-30" />
                </div>
              )}
            </div>

            {/* Capture Controls */}
            <div className="p-2 border-b flex items-center gap-2">
              {!isCapturing ? (
                <>
                  <Button
                    onClick={() => startCapture(false)}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    Connect to meeting
                  </Button>
                  {/* <Button
                    variant="outline"
                    className="flex-1"
                    size="sm"
                    onClick={() => startCapture(true)}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Connect with Mic
                  </Button> */}
                </>
              ) : (
                <Button
                  onClick={stopCapture}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Capture
                </Button>
              )}
            </div>

            {/* Transcript Section */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Transcript
                </span>
              </div>
              
              <div className="flex-1 overflow-auto p-3">
                {transcripts.filter(t => t.isFinal).length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                    <p className="font-medium">No conversation recorded yet...</p>
                    <p className="text-xs">Use the microphone or screen capture to start recording</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transcripts.filter(t => t.isFinal).map((entry) => (
                      <TranscriptMessage key={entry.id} entry={entry} />
                    ))}
                    <div ref={transcriptEndRef} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - AI Assistant */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="p-2 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                >
                  {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
                <span className="font-medium">AI Assistant</span>
              </div>
              <Button
                onClick={handleExit}
                variant="destructive"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Exit
              </Button>
            </div>

            {/* AI Responses */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto">
              {aiResponses.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">AI Assistant Ready</p>
                  <p className="text-sm">Start capturing to get AI help with your meeting</p>
                </div>
              ) : (
                <div className="w-full max-w-2xl space-y-4">
                  {aiResponses.map((response) => (
                    <AIResponseBubble key={response.id} response={response} onViewPage={handleViewPage} />
                  ))}
                  <div ref={responsesEndRef} />
                </div>
              )}
            </div>

            {/* Bottom Action Bar */}
            <div className="border-t p-4 space-y-3">
              {/* Quick Action Buttons */}
              <div className="flex justify-center gap-2">
                <Button
                  onClick={suggestAnswer}
                  disabled={isAskingAI}
                  className="bg-primary"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Answer
                </Button>
                <Button
                  onClick={whatToSayNext}
                  disabled={isAskingAI}
                  variant="outline"
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  What to say next?
                </Button>
                <Button
                  onClick={() => setShowPresentationEditor(true)}
                  variant="outline"
                >
                  <Presentation className="h-4 w-4 mr-2" />
                  Make PPT
                </Button>
              </div>

              {/* Input Area */}
              <div className="relative">
                <Textarea
                  placeholder="Ask JarWiz for any session related query, answer, assistance ..."
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  className="min-h-[60px] pr-24 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      askAI(customQuestion);
                    }
                  }}
                />
                <Button
                  onClick={() => askAI(customQuestion)}
                  disabled={isAskingAI || !customQuestion.trim()}
                  size="icon"
                  className="absolute bottom-2 right-2 h-8 w-8"
                >
                  {isAskingAI ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Search Mode Toggle */}
              <div className="flex items-center justify-center gap-3 text-xs">
                <span className="text-muted-foreground">Search:</span>
                <Button
                  size="sm"
                  variant={useVectorDb ? 'default' : 'outline'}
                  className={`h-8 px-3 ${useVectorDb ? '' : 'opacity-50'}`}
                  onClick={() => setUseVectorDb(!useVectorDb)}
                >
                  <Database className="h-4 w-4 mr-1" />
                  Docs
                </Button>
                <Button
                  size="sm"
                  variant={useWebSearch ? 'default' : 'outline'}
                  className={`h-8 px-3 ${useWebSearch ? '' : 'opacity-50'}`}
                  onClick={() => setUseWebSearch(!useWebSearch)}
                >
                  <Globe className="h-4 w-4 mr-1" />
                  Web
                </Button>
              </div>

              {/* Document Selector */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setShowDocumentSelector(!showDocumentSelector)}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Documents ({selectedDocumentIds.length} selected)
                </Button>
                
                {showDocumentSelector && (
                  <div className="w-full max-w-md bg-muted/50 rounded-lg p-2 max-h-32 overflow-auto">
                    {availableDocuments.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">No documents uploaded</p>
                    ) : (
                      <div className="space-y-1">
                        {availableDocuments.map((doc) => (
                          <button
                            key={doc.id}
                            onClick={() => toggleDocumentSelection(doc.id, doc.filename)}
                            className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-muted transition-colors ${
                              selectedDocumentIds.includes(doc.id) ? 'bg-primary/20' : ''
                            }`}
                          >
                            {selectedDocumentIds.includes(doc.id) ? (
                              <Check className="h-3 w-3 text-primary" />
                            ) : (
                              <FileText className="h-3 w-3 opacity-50" />
                            )}
                            <span className="truncate">{doc.filename}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {selectedDocumentIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Using: {selectedDocumentNames.slice(0, 2).join(', ')}{selectedDocumentNames.length > 2 ? ` +${selectedDocumentNames.length - 2} more` : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Toast */}
        {error && (
          <div className="fixed bottom-4 left-4 p-4 bg-destructive text-destructive-foreground rounded-lg shadow-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {/* Full Page Viewer Modal */}
        {viewingPage && (
          <FullPageViewer
            filename={viewingPage.filename}
            pageNumber={viewingPage.page}
            totalPages={viewingPage.totalPages}
            highlightRegions={viewingPage.highlightRegions}
            onClose={() => setViewingPage(null)}
          />
        )}

        {/* Presentation Editor Modal */}
        <PresentationEditor
          isOpen={showPresentationEditor}
          onClose={() => setShowPresentationEditor(false)}
          transcript={getFullTranscript()}
          aiResponses={aiResponses.map(r => ({ question: r.question, answer: r.answer }))}
        />
      </div>
    </ProtectedRoute>
  );
}

// Transcript message component
function TranscriptMessage({ entry }: { entry: TranscriptEntry }) {
  const isUser = entry.speaker === 'user';
  
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <Users className="h-4 w-4" />
        </div>
      )}
      <div className={`
        max-w-[80%] rounded-lg px-3 py-2
        ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}
      `}>
        <p className="text-sm">{entry.text}</p>
        <p className="text-xs opacity-60 mt-1">
          {entry.timestamp.toLocaleTimeString()}
        </p>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}

// AI Response bubble component
function AIResponseBubble({ response, onViewPage }: { 
  response: AIResponse; 
  onViewPage: (
    filename: string, 
    pageNumber: number, 
    totalPages?: number,
    highlightRegions?: { x0: number; y0: number; x1: number; y1: number }[]
  ) => void;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1">Q: {response.question}</p>
          <p className="text-sm whitespace-pre-wrap">{response.answer}</p>
          
          {/* Document Citations - Clickable to view page with highlights */}
          {response.citations && response.citations.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">📄 Document Sources:</p>
              <div className="space-y-1">
                {response.citations.slice(0, 3).map((citation, idx) => (
                  <button
                    key={idx}
                    onClick={() => onViewPage(
                      citation.filename || 'document', 
                      citation.page_number,
                      1,
                      citation.highlight_regions
                    )}
                    className="w-full text-left p-2 rounded bg-background hover:bg-muted border text-xs transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-primary">
                        {citation.filename || 'Document'} - Page {citation.page_number + 1}
                      </span>
                      <span className="text-muted-foreground">Click to view</span>
                    </div>
                    <p className="text-muted-foreground mt-1 line-clamp-2">
                      {citation.text_snippet.slice(0, 150)}...
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Web Sources */}
          {response.sources.filter(s => s.source_type === 'web').length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">🌐 Web Sources:</p>
              <div className="flex flex-wrap gap-1">
                {response.sources.filter(s => s.source_type === 'web').slice(0, 3).map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    <Badge variant="secondary" className="text-xs hover:bg-muted cursor-pointer">
                      <Globe className="h-2 w-2 mr-1" />
                      {source.title.slice(0, 30)}...
                    </Badge>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
