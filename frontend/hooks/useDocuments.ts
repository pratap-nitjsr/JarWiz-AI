'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DocumentsState, Document } from '@/types';

export const useDocumentsStore = create<DocumentsState>()(
  persist(
    (set) => ({
      documents: [],
      selectedDocumentId: null,
      selectedDocumentName: null,

      addDocument: (document: Document) =>
        set((state) => ({
          documents: [...state.documents, document],
        })),

      removeDocument: (documentId: string) =>
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== documentId),
          selectedDocumentId: state.selectedDocumentId === documentId ? null : state.selectedDocumentId,
          selectedDocumentName: state.selectedDocumentId === documentId ? null : state.selectedDocumentName,
        })),

      selectDocument: (documentId: string, documentName: string) =>
        set({
          selectedDocumentId: documentId,
          selectedDocumentName: documentName,
        }),

      clearSelection: () =>
        set({
          selectedDocumentId: null,
          selectedDocumentName: null,
        }),
    }),
    {
      name: 'documents-storage',
    }
  )
);
