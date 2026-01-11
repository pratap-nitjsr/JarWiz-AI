'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Monitor, 
  Mic, 
  MicOff, 
  StopCircle, 
  Trash2, 
  Send, 
  Globe, 
  Database,
  MessageSquare,
  User,
  Users,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lightbulb
} from 'lucide-react';
import { useMeetingTranscription, TranscriptEntry } from '@/hooks/useMeetingTranscription';
import { useDocumentsStore } from '@/hooks/useDocuments';
import api from '@/lib/api';
import type { ChatResponse, Source } from '@/types';

interface MeetingAssistantProps {
  onClose?: () => void;
}

interface AIResponse {
  id: string;
  question: string;
  answer: string;
  sources: Source[];
  timestamp: Date;
  searchMode: string;
}

export function MeetingAssistant({ onClose }: MeetingAssistantProps) {
  const {
    isCapturing,
    isTranscribing,
    transcripts,
    error,
    tabAudioSupported,
    startCapture,
    stopCapture,
    clearTranscripts,
    getFullTranscript,
    getTranscriptForContext,
  } = useMeetingTranscription();

  const { selectedDocumentIds, selectedDocumentNames } = useDocumentsStore();
  
  const [searchMode, setSearchMode] = useState<'vector_only' | 'web_only' | 'both' | 'none'>('both');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [aiResponses, setAiResponses] = useState<AIResponse[]>([]);
  const [showTranscript, setShowTranscript] = useState(true);
  const [includeMic, setIncludeMic] = useState(true);
  
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const responsesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Auto-scroll AI responses
  useEffect(() => {
    responsesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiResponses]);

  // Ask AI a question based on transcript context
  const askAI = async (question: string) => {
    if (!question.trim()) return;

    setIsAskingAI(true);
    
    try {
      const transcriptContext = getFullTranscript();
      
      // Build the enhanced query with transcript context
      const enhancedQuery = `
Based on the following meeting/conversation transcript, please answer this question:

**Meeting Transcript:**
${transcriptContext || 'No transcript available yet.'}

**Question:** ${question}

Please provide a helpful, accurate answer. If the answer can be found in the transcript, cite the relevant parts. If additional context from documents or web search would help, include that as well.
`;

      const response = await new Promise<ChatResponse>((resolve, reject) => {
        let fullAnswer = '';
        let metadata: any = {};

        api.sendQueryStream(
          {
            query: enhancedQuery,
            document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
            search_mode: searchMode,
            conversation_history: [],
          },
          (chunk) => {
            fullAnswer += chunk;
          },
          (meta) => {
            metadata = meta;
            resolve({
              answer: fullAnswer,
              citations: metadata.citations || [],
              sources: metadata.sources || [],
              relevant_images: metadata.relevant_images || [],
              query: question,
              web_search_used: metadata.web_search_used || false,
              document_confidence: metadata.document_confidence || 0,
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
        timestamp: new Date(),
        searchMode,
      };

      setAiResponses(prev => [...prev, newResponse]);
      setCustomQuestion('');
    } catch (error: any) {
      console.error('Error asking AI:', error);
    } finally {
      setIsAskingAI(false);
    }
  };

  // Quick actions based on transcript
  const quickActions = [
    { label: 'Summarize', query: 'Please summarize the key points from this conversation so far.' },
    { label: 'Action Items', query: 'What are the action items or tasks mentioned in this conversation?' },
    { label: 'Questions Asked', query: 'What questions have been asked in this conversation that need answers?' },
    { label: 'Key Decisions', query: 'What decisions have been made in this conversation?' },
  ];

  // Suggest answer for a question detected in transcript
  const suggestAnswer = () => {
    // Find the last question from the transcript
    const recentTranscripts = transcripts.filter(t => t.isFinal).slice(-10);
    const lastQuestion = recentTranscripts.reverse().find(t => 
      t.text.includes('?') || 
      t.text.toLowerCase().startsWith('what') ||
      t.text.toLowerCase().startsWith('how') ||
      t.text.toLowerCase().startsWith('why') ||
      t.text.toLowerCase().startsWith('when') ||
      t.text.toLowerCase().startsWith('where') ||
      t.text.toLowerCase().startsWith('can') ||
      t.text.toLowerCase().startsWith('could')
    );

    if (lastQuestion) {
      askAI(`Please help me answer this question from the meeting: "${lastQuestion.text}"`);
    } else {
      askAI('What are the main topics being discussed and any questions I should be prepared to answer?');
    }
  };

  if (!tabAudioSupported) {
    return (
      <Card className="w-full">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Browser Not Supported</h3>
          <p className="text-muted-foreground">
            Screen capture with audio is not supported in your browser. 
            Please use Chrome, Edge, or another Chromium-based browser.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Control Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Meeting Assistant
            </CardTitle>
            <div className="flex items-center gap-2">
              {isCapturing && (
                <Badge variant="destructive" className="animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Capture Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {!isCapturing ? (
              <>
                <Button
                  onClick={() => startCapture(includeMic)}
                  className="flex-1"
                >
                  <Monitor className="h-4 w-4 mr-2" />
                  Connect to Meeting
                </Button>
                <Button
                  variant={includeMic ? "default" : "outline"}
                  size="icon"
                  onClick={() => setIncludeMic(!includeMic)}
                  title={includeMic ? "Microphone enabled" : "Microphone disabled"}
                >
                  {includeMic ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={stopCapture}
                  variant="destructive"
                  className="flex-1"
                >
                  <StopCircle className="h-4 w-4 mr-2" />
                  Stop Capture
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={clearTranscripts}
                  title="Clear transcript"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Search Mode */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Search:</span>
            <Button
              size="sm"
              variant={searchMode === 'both' ? 'default' : 'outline'}
              onClick={() => setSearchMode('both')}
            >
              <Globe className="h-3 w-3 mr-1" />
              <Database className="h-3 w-3 mr-1" />
              Both
            </Button>
            <Button
              size="sm"
              variant={searchMode === 'vector_only' ? 'default' : 'outline'}
              onClick={() => setSearchMode('vector_only')}
            >
              <Database className="h-3 w-3 mr-1" />
              Docs
            </Button>
            <Button
              size="sm"
              variant={searchMode === 'web_only' ? 'default' : 'outline'}
              onClick={() => setSearchMode('web_only')}
            >
              <Globe className="h-3 w-3 mr-1" />
              Web
            </Button>
            <Button
              size="sm"
              variant={searchMode === 'none' ? 'default' : 'outline'}
              onClick={() => setSearchMode('none')}
            >
              None
            </Button>
          </div>

          {/* Selected Documents */}
          {selectedDocumentIds.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Using docs: </span>
              <span className="font-medium">
                {selectedDocumentNames.slice(0, 2).join(', ')}
                {selectedDocumentNames.length > 2 && ` +${selectedDocumentNames.length - 2} more`}
              </span>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transcript Panel */}
      <Card className="flex-1 min-h-0">
        <CardHeader className="pb-2">
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowTranscript(!showTranscript)}
          >
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Conversation ({transcripts.filter(t => t.isFinal).length} messages)
            </CardTitle>
            {showTranscript ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showTranscript && (
          <CardContent className="overflow-auto max-h-64">
            {transcripts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversation recorded yet...</p>
                <p className="text-xs mt-1">Use the microphone or screen capture to start recording</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transcripts.map((entry) => (
                  <TranscriptBubble key={entry.id} entry={entry} />
                ))}
                <div ref={transcriptEndRef} />
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* AI Interaction Panel */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 gap-3">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={suggestAnswer}
              disabled={isAskingAI || transcripts.length === 0}
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              AI Answer
            </Button>
            {quickActions.map((action) => (
              <Button
                key={action.label}
                size="sm"
                variant="outline"
                onClick={() => askAI(action.query)}
                disabled={isAskingAI}
              >
                {action.label}
              </Button>
            ))}
          </div>

          {/* Custom Question Input */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask JarWiz for any session related query, answer, assistance ..."
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              className="min-h-[60px] resize-none"
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
              className="h-auto"
            >
              {isAskingAI ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* AI Responses */}
          <div className="flex-1 overflow-auto space-y-3 min-h-0">
            {aiResponses.map((response) => (
              <AIResponseCard key={response.id} response={response} />
            ))}
            <div ref={responsesEndRef} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Transcript bubble component
function TranscriptBubble({ entry }: { entry: TranscriptEntry }) {
  const isUser = entry.speaker === 'user';
  
  return (
    <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`
        flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center
        ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}
      `}>
        {isUser ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
      </div>
      <div className={`
        max-w-[80%] rounded-lg px-3 py-2 text-sm
        ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}
        ${!entry.isFinal ? 'opacity-60' : ''}
      `}>
        <p>{entry.text}</p>
        {!entry.isFinal && (
          <span className="text-xs opacity-75">...</span>
        )}
      </div>
    </div>
  );
}

// AI Response card component
function AIResponseCard({ response }: { response: AIResponse }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div 
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">Q: {response.question}</p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
      
      {expanded && (
        <>
          <div className="text-sm whitespace-pre-wrap">{response.answer}</div>
          
          {response.sources.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Sources:</p>
              <div className="flex flex-wrap gap-1">
                {response.sources.slice(0, 3).map((source, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {source.source_type === 'web' ? <Globe className="h-2 w-2 mr-1" /> : <Database className="h-2 w-2 mr-1" />}
                    {source.title.slice(0, 30)}...
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
