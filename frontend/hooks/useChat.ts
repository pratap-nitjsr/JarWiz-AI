'use client';

import { create } from 'zustand';
import type { ChatState, Message } from '@/types';

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  currentDocument: null,
  isLoading: false,
  error: null,

  addMessage: (message: Message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setCurrentDocument: (document) =>
    set({ currentDocument: document }),

  setLoading: (loading) =>
    set({ isLoading: loading }),

  setError: (error) =>
    set({ error }),

  clearMessages: () =>
    set({ messages: [] }),
}));
