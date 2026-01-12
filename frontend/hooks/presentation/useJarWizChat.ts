"use client";

import { useState, useCallback, useRef } from "react";
import apiClient from "@/lib/api";

export type Message = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
};

export type ChatStatus = "idle" | "submitted" | "streaming" | "ready" | "error";

export function useJarWizChat() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [status, setStatus] = useState<ChatStatus>("idle");
    const stopRef = useRef(false);

    const append = useCallback(async (message: Message | { role: string; content: string }) => {
        const userMessage: Message = {
            id: Math.random().toString(36).substring(7),
            role: message.role as any,
            content: message.content,
        };

        setMessages((prev) => [...prev, userMessage]);
        setStatus("submitted");
        stopRef.current = false;

        let assistantContent = "";
        const assistantId = Math.random().toString(36).substring(7);

        try {
            await apiClient.sendQueryStream(
                {
                    query: message.content,
                    search_mode: "none", // For editor commands, we usually don't need web/vector search unless specified
                },
                (chunk) => {
                    if (stopRef.current) return;
                    setStatus("streaming");
                    assistantContent += chunk;
                    setMessages((prev) => {
                        const last = prev[prev.length - 1];
                        if (last && last.id === assistantId) {
                            return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                        }
                        return [...prev, { id: assistantId, role: "assistant", content: assistantContent }];
                    });
                },
                (metadata) => {
                    setStatus("ready");
                },
                (error) => {
                    console.error("Chat error:", error);
                    setStatus("error");
                }
            );
        } catch (err) {
            console.error("Chat error:", err);
            setStatus("error");
        }
    }, []);

    const handleSubmit = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const content = input;
        setInput("");
        append({ role: "user", content });
    }, [input, append]);

    const reload = useCallback(() => {
        const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
        if (lastUserMessage) {
            append(lastUserMessage);
        }
    }, [messages, append]);

    const stop = useCallback(() => {
        stopRef.current = true;
        setStatus("ready");
    }, []);

    return {
        input,
        setInput,
        messages,
        setMessages,
        status,
        handleSubmit,
        append,
        reload,
        stop,
        // Add these to match useChat even if empty
        isLoading: status === "streaming" || status === "submitted",
        error: null,
    };
}
