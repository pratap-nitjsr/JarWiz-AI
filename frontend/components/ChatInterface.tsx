'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, currentDocument, isLoading, error, addMessage, setLoading, setError } =
    useChatStore();
  const { selectedDocumentName } = useDocumentsStore();

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

      const response = await apiClient.sendQuery({
        query: content.trim(),
        document_id: currentDocument?.id || undefined, // Optional: If no document, use web search only
        include_web_search: true,
        conversation_history: conversationHistory, // MEMORY: Include conversation history
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

  if (!currentDocument) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b p-4">
          <h2 className="text-lg font-semibold">💬 Web Search Chat</h2>
          <p className="text-sm text-gray-500">Ask anything - powered by web search</p>
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
              filename={selectedDocumentName || undefined}
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
        <h2 className="text-lg font-semibold">{currentDocument.filename}</h2>
        <p className="text-sm text-gray-500">{currentDocument.total_pages} pages</p>
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
            filename={selectedDocumentName || undefined}
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
