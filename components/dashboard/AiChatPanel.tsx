"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { ScoreResult } from "@/lib/scoring/engine";

type Msg = { role: "user" | "assistant"; content: string };

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const SUGGESTIONS = [
  "Why is my score low?",
  "What should I fix first?",
  "How do I get out of view jail?",
  "Explain my retention score",
];

export function AiChatPanel({
  open,
  onClose,
  score,
  channelName,
  meta,
}: {
  open: boolean;
  onClose: () => void;
  score: ScoreResult | null;
  channelName?: string;
  meta?: { windowDays?: number; subscriberCount?: number; videoCount?: number };
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [summarized, setSummarized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const token = await user?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [user]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  // Core: send a request to the AI route and stream the reply into the last assistant message.
  const send = useCallback(
    async (opts: { mode: "summary" | "chat"; history?: Msg[] }) => {
      setStreaming(true);
      // add an empty assistant message we'll stream into
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      try {
        const res = await fetch("/api/score/ai-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeader()) },
          body: JSON.stringify({
            mode: opts.mode,
            messages: opts.history ?? [],
            score,
            channelName,
            meta,
          }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: data.error || "Sorry, the AI is unavailable right now." };
            return copy;
          });
          setStreaming(false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = { role: "assistant", content: acc };
            return copy;
          });
        }
      } catch {
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: "Network error. Please try again." };
          return copy;
        });
      }
      setStreaming(false);
    },
    [authHeader, score, channelName, meta]
  );

  // A new analysis (different overall+label) should start a fresh conversation.
  // We DON'T reset on close — history persists when you re-open the panel.
  const scoreKey = score ? `${Math.round(score.overall)}-${score.label}-${channelName ?? ""}` : "";
  const prevKeyRef = useRef<string>("");
  useEffect(() => {
    if (scoreKey && scoreKey !== prevKeyRef.current) {
      prevKeyRef.current = scoreKey;
      setMessages([]);
      setSummarized(false);
    }
  }, [scoreKey]);

  // On first open with a score (and no messages yet), auto-generate the summary.
  useEffect(() => {
    if (open && score && !summarized && messages.length === 0) {
      setSummarized(true);
      send({ mode: "summary" });
    }
  }, [open, score, summarized, messages.length, send]);

  const handleSend = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    // send only the real conversation (exclude any empty assistant placeholder)
    send({ mode: "chat", history: next.filter((m) => m.content) });
  };

  return (
    <>
      {/* backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      {/* panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-outline-variant bg-surface transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
              <Icon d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2zM19 3v4M21 5h-4" size={18} />
            </span>
            <div>
              <p className="text-[15px] font-bold text-on-surface">AI Coach</p>
              <p className="text-[11px] text-on-surface-variant">Understands your Trust Score</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container-high" aria-label="Close">
            <Icon d="M18 6 6 18M6 6l12 12" size={20} />
          </button>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.length === 0 && !streaming && (
            <p className="text-center text-[13px] text-on-surface-variant">Ask anything about your Trust Score.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                  m.role === "user"
                    ? "whitespace-pre-wrap bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface"
                }`}
              >
                {m.content
                  ? m.role === "assistant"
                    ? <Markdown text={m.content} />
                    : m.content
                  : streaming && i === messages.length - 1 ? <Typing /> : ""}
              </div>
            </div>
          ))}
        </div>

        {/* suggestions (only before user has chatted) */}
        {messages.filter((m) => m.role === "user").length === 0 && !streaming && (
          <div className="flex flex-wrap gap-2 px-5 pb-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSend(s)}
                className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5 text-[12px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* input */}
        <div className="border-t border-outline-variant p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              rows={1}
              placeholder="Ask about your score…"
              className="max-h-28 flex-1 resize-none rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-[14px] text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary"
            />
            <button
              onClick={() => handleSend()}
              disabled={streaming || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
              aria-label="Send"
            >
              <Icon d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" size={18} />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-on-surface-variant/70">AI can make mistakes. Verify important advice.</p>
        </div>
      </aside>
    </>
  );
}

function Typing() {
  return (
    <span className="inline-flex gap-1 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-on-surface-variant" />
    </span>
  );
}

// Render inline **bold** / *italic* within a line.
function inline(text: string, keyBase: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return <strong key={`${keyBase}-${i}`} className="font-semibold">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*"))
      return <em key={`${keyBase}-${i}`}>{p.slice(1, -1)}</em>;
    return <span key={`${keyBase}-${i}`}>{p}</span>;
  });
}

// Lightweight markdown: paragraphs, bullet lists, numbered lists, bold/italic.
function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (bullets.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="my-1 list-disc space-y-0.5 pl-4">
          {bullets.map((b, i) => <li key={i}>{inline(b, `b${out.length}-${i}`)}</li>)}
        </ul>
      );
      bullets = [];
    }
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]);
    } else if (numbered) {
      bullets.push(numbered[1]);
    } else {
      flush();
      if (line.trim()) out.push(<p key={`p-${i}`} className="my-1 first:mt-0 last:mb-0">{inline(line, `p${i}`)}</p>);
    }
  });
  flush();
  return <div>{out}</div>;
}
