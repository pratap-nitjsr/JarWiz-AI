'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Database, Globe, Check } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import { VoiceInput } from './VoiceInput';
import { LoadingSpinner } from './LoadingSpinner';
import { useChatStore } from '@/hooks/useChat';
import { useDocumentsStore } from '@/hooks/useDocuments';
import { apiClient } from '@/lib/api';
import { generateId } from '@/lib/utils';
import type { Message } from '@/types';

interface ChatInterfaceProps {
  onViewPage?: (filename: string, pageNumber: number, totalPages: number) => void;
}

export function ChatInterface({ onViewPage }: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const [useVectorDB, setUseVectorDB] = useState(true);
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [useStreaming, setUseStreaming] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, currentDocument, isLoading, error, addMessage, setLoading, setError } =
    useChatStore();
  const { selectedDocumentIds, selectedDocumentNames } = useDocumentsStore();

  // Calculate search mode from toggles
  const getSearchMode = (): 'vector_only' | 'web_only' | 'both' | 'none' => {
    if (useVectorDB && useWebSearch) return 'both';
    if (useVectorDB && !useWebSearch) return 'vector_only';
    if (!useVectorDB && useWebSearch) return 'web_only';
    return 'none';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInputText('');
    setLoading(true);
    setError(null);

    try {
      // Prepare conversation history (last 10 messages for context)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));

      if (useStreaming) {
        // Streaming mode
        let streamingAnswer = '';
        const streamingMessageId = generateId();
        
        // Add empty assistant message that will be updated
        const assistantMessage: Message = {
          id: streamingMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        };
        addMessage(assistantMessage);

        await apiClient.sendQueryStream(
          {
            query: content.trim(),
            document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
            search_mode: getSearchMode(),
            conversation_history: conversationHistory,
          },
          // On chunk
          (chunk: string) => {
            streamingAnswer += chunk;
            // Update the message content
            useChatStore.setState(state => ({
              messages: state.messages.map(msg =>
                msg.id === streamingMessageId
                  ? { ...msg, content: streamingAnswer }
                  : msg
              )
            }));
          },
          // On done (metadata)
          (metadata: any) => {
            useChatStore.setState(state => ({
              messages: state.messages.map(msg =>
                msg.id === streamingMessageId
                  ? {
                      ...msg,
                      citations: metadata.citations,
                      sources: metadata.sources,
                      web_search_used: metadata.web_search_used,
                    }
                  : msg
              )
            }));
            setLoading(false);
          },
          // On error
          (error: string) => {
            setError(error);
            setLoading(false);
          }
        );
      } else {
        // Non-streaming mode
        const response = await apiClient.sendQuery({
          query: content.trim(),
          document_ids: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
          search_mode: getSearchMode(),
          conversation_history: conversationHistory,
        });

        const assistantMessage: Message = {
          id: generateId(),
          role: 'assistant',
          content: response.answer,
          timestamp: new Date(),
          citations: response.citations,
          sources: response.sources,
          relevant_images: response.relevant_images,
          web_search_used: response.web_search_used,
          web_search_reason: response.web_search_reason,
          document_confidence: response.document_confidence,
        };

        addMessage(assistantMessage);
        setLoading(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);

      const errorMsg: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
      };

      addMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    setInputText(transcript);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputText);
  };

  // Auto-adjust toggles based on document selection
  useEffect(() => {
    if (selectedDocumentIds.length === 0) {
      // No documents: disable vector DB
      setUseVectorDB(false);
    }
  }, [selectedDocumentIds]);

  if (selectedDocumentIds.length === 0) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">💬 AI Assistant</h2>
          <p className="text-sm text-gray-500">No documents selected - Select documents to chat</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <p className="text-gray-500">
                  No document selected. Ask me anything!
                </p>
                <p className="text-sm text-gray-400">
                  I'll use web search to answer your questions
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble 
              key={message.id} 
              message={message}
              filename={selectedDocumentNames.length > 0 ? selectedDocumentNames.join(', ') : undefined}
              totalPages={undefined}
              onViewPage={onViewPage}
            />
          ))}

          {isLoading && (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Input */}
        <div className="border-t p-4 space-y-3">
          {/* Search Mode Selector */}
          <div className="flex items-center gap-3 pb-2">
            <span className="text-sm text-gray-600 font-medium">Search:</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={useWebSearch ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseWebSearch(!useWebSearch)}
                className="flex items-center gap-1.5 relative pr-7"
              >
                <Globe className="h-3.5 w-3.5" />
                <span className="text-xs">Web Search</span>
                {useWebSearch && (
                  <Check className="h-3 w-3 absolute right-1.5" />
                )}
              </Button>
            </div>
          </div>

          <VoiceInput onTranscriptComplete={handleVoiceTranscript} />

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask me anything..."
              className="resize-none"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!inputText.trim() || isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">
          📚 {selectedDocumentIds.length} Document{selectedDocumentIds.length !== 1 ? 's' : ''} Selected
        </h2>
        <p className="text-sm text-gray-500 truncate">
          {selectedDocumentNames.join(', ')}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">
              Ask me anything about your document!
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message}
            filename={selectedDocumentNames.length > 0 ? selectedDocumentNames.join(', ') : undefined}
            totalPages={currentDocument?.total_pages}
            onViewPage={onViewPage}
          />
        ))}

        {isLoading && (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4 space-y-3">
        {/* Search Mode Selector */}
        <div className="flex items-center gap-3 pb-2">
          <span className="text-sm text-gray-600 font-medium">Search:</span>
          <div className="flex gap-2 flex-wrap">
            <Button
              type="button"
              variant={useVectorDB ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUseVectorDB(!useVectorDB)}
              className="flex items-center gap-1.5 relative pr-7"
            >
              <Database className="h-3.5 w-3.5" />
              <span className="text-xs">Vector DB</span>
              {useVectorDB && (
                <Check className="h-3 w-3 absolute right-1.5" />
              )}
            </Button>
            <Button
              type="button"
              variant={useWebSearch ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUseWebSearch(!useWebSearch)}
              className="flex items-center gap-1.5 relative pr-7"
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="text-xs">Web Search</span>
              {useWebSearch && (
                <Check className="h-3 w-3 absolute right-1.5" />
              )}
            </Button>
          </div>
          <span className="text-xs text-gray-500">
            {!useVectorDB && !useWebSearch && '(Pure LLM)'}
            {useVectorDB && useWebSearch && '(Hybrid)'}
            {useVectorDB && !useWebSearch && '(Document only)'}
            {!useVectorDB && useWebSearch && '(Web only)'}
          </span>
        </div>

        <VoiceInput onTranscriptComplete={handleVoiceTranscript} />

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your question or use voice input..."
            className="resize-none"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputText.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
