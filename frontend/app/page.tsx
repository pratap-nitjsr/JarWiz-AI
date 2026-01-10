'use client';

import { useState } from 'react';
import { ChatInterface } from '@/components/ChatInterface';
import { DocumentUploader } from '@/components/DocumentUploader';
import { DocumentList } from '@/components/DocumentList';
import { FullPageViewer } from '@/components/FullPageViewer';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useChatStore } from '@/hooks/useChat';
import { useDocumentsStore } from '@/hooks/useDocuments';
import { useAuth } from '@/hooks/useAuth';
import type { Document } from '@/types';

export default function Home() {
  const { setCurrentDocument, clearMessages } = useChatStore();
  const { addDocument, toggleDocumentSelection, selectedDocumentIds, selectedDocumentNames } = useDocumentsStore();
  const { user, logout } = useAuth();
  const [viewingPage, setViewingPage] = useState<{ filename: string; page: number; totalPages: number } | null>(null);

  const handleUploadSuccess = (document: Document) => {
    addDocument(document);
    // Auto-select newly uploaded document
    toggleDocumentSelection(document.id, document.filename);
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  const handleSelectDocument = (documentId: string, documentName: string) => {
    // Toggle selection (click to select, click again to unselect)
    toggleDocumentSelection(documentId, documentName);
  };

  const handleViewPage = (filename: string, pageNumber: number, totalPages: number = 1) => {
    setViewingPage({ filename, page: pageNumber, totalPages });
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Multi-modal RAG Chatbot
              </h1>
              <p className="text-gray-600">
                Upload PDFs and chat with your documents using voice or text
              </p>
            </div>
            {user && (
              <div className="flex items-center gap-3 ml-4">
                {user.picture && (
                  <img 
                    src={user.picture} 
                    alt={user.name} 
                    className="w-10 h-10 rounded-full border-2 border-gray-200"
                  />
                )}
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upload Document</CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentUploader
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                />
              </CardContent>
            </Card>

            <DocumentList
              onSelectDocument={handleSelectDocument}
              selectedDocumentIds={selectedDocumentIds}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Voice input with Deepgram</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>PDF text & image processing</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Hybrid RAG with web search</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Page citations with highlights</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Document deduplication</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>Full page viewing</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            {selectedDocumentIds.length > 0 && (
              <div className="mb-4">
                <Badge variant="secondary" className="text-sm">
                  📚 {selectedDocumentIds.length} document{selectedDocumentIds.length > 1 ? 's' : ''} selected: {selectedDocumentNames.join(', ')}
                </Badge>
              </div>
            )}
            <Card className="h-[calc(100vh-12rem)]">
              <ChatInterface onViewPage={handleViewPage} />
            </Card>
          </div>
        </div>

        {/* Full Page Viewer Modal */}
        {viewingPage && (
          <FullPageViewer
            filename={viewingPage.filename}
            pageNumber={viewingPage.page}
            totalPages={viewingPage.totalPages}
            onClose={() => setViewingPage(null)}
          />
        )}
      </main>
    </ProtectedRoute>
  );
}

