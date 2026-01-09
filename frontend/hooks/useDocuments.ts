'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DocumentsState, Document } from '@/types';

export const useDocumentsStore = create<DocumentsState>()(
  persist(
    (set) => ({
      documents: [],
      selectedDocumentIds: [],  // Changed from single to array
      selectedDocumentNames: [],  // Track names for display

      addDocument: (document: Document) =>
        set((state) => ({
          documents: [...state.documents, document],
        })),

      removeDocument: (documentId: string) =>
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== documentId),
          selectedDocumentIds: state.selectedDocumentIds.filter(id => id !== documentId),
          selectedDocumentNames: state.selectedDocumentIds.includes(documentId)
            ? state.selectedDocumentNames.filter((_, index) =>
                state.selectedDocumentIds[index] !== documentId
              )
            : state.selectedDocumentNames,
        })),

      toggleDocumentSelection: (documentId: string, documentName: string) =>
        set((state) => {
          const isSelected = state.selectedDocumentIds.includes(documentId);
          if (isSelected) {
            // Deselect
            const index = state.selectedDocumentIds.indexOf(documentId);
            return {
              selectedDocumentIds: state.selectedDocumentIds.filter(id => id !== documentId),
              selectedDocumentNames: state.selectedDocumentNames.filter((_, i) => i !== index),
            };
          } else {
            // Select
            return {
              selectedDocumentIds: [...state.selectedDocumentIds, documentId],
              selectedDocumentNames: [...state.selectedDocumentNames, documentName],
            };
          }
        }),

      clearSelection: () =>
        set({
          selectedDocumentIds: [],
          selectedDocumentNames: [],
        }),
    }),
    {
      name: 'documents-storage',
      version: 2, // Increment version to clear old localStorage data
      migrate: (persistedState: any, version: number) => {
        // If loading old version, clear the selection arrays to prevent stale data
        if (version < 2) {
          return {
            ...persistedState,
            selectedDocumentIds: [],
            selectedDocumentNames: [],
          };
        }
        return persistedState;
      },
    }
  )
);