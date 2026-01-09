"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { FileText, Trash2, RefreshCw } from "lucide-react";
import api from "@/lib/api";

interface Document {
  document_id: string;
  filename: string;
  file_hash: string;
  total_chunks: number;
}

interface DocumentListProps {
  onSelectDocument: (documentId: string, filename: string) => void;
  selectedDocumentIds?: string[];  // Multiple selection support
}

export function DocumentList({ onSelectDocument, selectedDocumentIds = [] }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.listDocuments();
      setDocuments(response.documents || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (documentId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      await api.deleteDocument(documentId);
      setDocuments(documents.filter(doc => doc.document_id !== documentId));
      
      // If deleted document was selected, toggle it out
      if (selectedDocumentIds.includes(documentId)) {
        onSelectDocument(documentId, "");  // Toggle off the deleted document
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("Failed to delete document");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription>Loading documents...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Documents</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchDocuments} variant="outline" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Documents</CardTitle>
            <CardDescription>
              {documents.length === 0
                ? "No documents uploaded yet"
                : `${documents.length} document${documents.length !== 1 ? "s" : ""} available`}
            </CardDescription>
          </div>
          <Button onClick={fetchDocuments} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Upload a PDF document to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => {
              const isSelected = selectedDocumentIds.includes(doc.document_id);
              return (
                <div
                  key={doc.document_id}
                  onClick={() => onSelectDocument(doc.document_id, doc.filename)}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                    ${
                      isSelected
                        ? "bg-primary/10 border-primary"
                        : "hover:bg-accent hover:border-accent-foreground/20"
                    }
                  `}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.total_chunks} chunks
                      </p>
                    </div>
                    {isSelected && (
                      <Badge variant="default">Selected</Badge>
                    )}
                  </div>
                  <Button
                    onClick={(e) => handleDelete(doc.document_id, e)}
                    variant="ghost"
                    size="sm"
                    className="ml-2 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
