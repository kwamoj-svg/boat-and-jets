"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, X, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Beste Zeit für Kroatien?",
  "Katamaran vs Segelboot?",
  "Was kostet eine Yacht pro Tag?",
];

export default function ConciergeChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
      };

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
      };

      const updatedMessages = [...messages, userMessage];
      setMessages([...updatedMessages, assistantMessage]);
      setInput("");
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/concierge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error("Failed to connect");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE messages are separated by double newlines
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const lines = part.split("\n");
            let eventType = "";
            let data = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith("data: ")) {
                data = line.slice(6);
              }
            }

            if (eventType === "token" && data) {
              try {
                const parsed = JSON.parse(data);
                accumulated += parsed.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: accumulated,
                    };
                  }
                  return updated;
                });
              } catch {
                // skip malformed JSON
              }
            }

            if (eventType === "done") break;
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant" && !last.content) {
              updated[updated.length - 1] = {
                ...last,
                content:
                  "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.",
              };
            }
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed bottom-4 right-4 z-50 flex flex-col
        w-[calc(100vw-2rem)] h-[calc(100vh-2rem)]
        sm:w-[400px] sm:h-[600px]
        bg-[#0a1628]/95 backdrop-blur-xl
        border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white text-sm font-semibold">
              VELIQA Concierge
            </h3>
            <p className="text-white/50 text-xs">KI-Yacht-Berater</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close chat"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-400/30 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">
                Willkommen bei VELIQA
              </p>
              <p className="text-white/40 text-xs">
                Ihr pers&ouml;nlicher Yacht-Berater
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-[280px]">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="text-left text-xs text-white/70 px-3 py-2 rounded-lg
                    border border-white/10 hover:border-amber-400/40
                    hover:bg-white/5 transition-all duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-br-sm"
                  : "bg-white/5 border border-white/10 text-white/90 rounded-bl-sm"
              }`}
            >
              {msg.content}
              {msg.role === "assistant" && !msg.content && isStreaming && (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <span
                    className="w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-white/10 p-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Fragen Sie den Concierge..."
            disabled={isStreaming}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5
              text-sm text-white placeholder-white/30
              focus:outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20
              disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600
              text-white disabled:opacity-30 hover:from-amber-400 hover:to-amber-500
              transition-all duration-200 shrink-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-center text-[10px] text-white/20 mt-2">
          Powered by VELIQA AI
        </p>
      </div>
    </motion.div>
  );
}
