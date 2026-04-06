"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Message = { role: "user" | "assistant"; content: string };

interface ChatCotizacionProps {
  /** Current cotizacion data — sent as context with every message */
  cotizacion: Record<string, unknown>;
}

const SUGERENCIAS = [
  "¿Este sistema cubre el consumo del cliente?",
  "¿Cuál sería el ROI estimado?",
  "¿El precio por watt es competitivo?",
  "Analiza los costos de esta cotización",
];

function renderMarkdown(text: string): string {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-zinc-950 rounded p-2 my-1.5 overflow-x-auto text-[11px] font-mono text-zinc-300"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-950 px-1 py-0.5 rounded text-[11px] font-mono text-emerald-400">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<div class="text-xs font-semibold text-zinc-200 mt-2 mb-0.5">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="text-xs font-bold text-zinc-100 mt-2.5 mb-0.5">$1</div>')
    .replace(/^- (.+)$/gm, '<div class="ml-3 text-zinc-300 before:content-[\'•\'] before:mr-1.5 before:text-zinc-600">$1</div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div class="ml-3 text-zinc-300"><span class="text-zinc-500 mr-1">$1.</span>$2</div>')
    .replace(/\n\n/g, '<div class="h-2"></div>')
    .replace(/\n/g, "<br/>");
}

export default function ChatCotizacion({ cotizacion }: ChatCotizacionProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "cotizacion",
          cotizacion,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error("Error en respuesta");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error al conectar con el asistente. Intenta de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, cotizacion]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const nombre = (cotizacion?.nombre as string) || "cotización";

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg transition-all ${
          open
            ? "bg-violet-600 text-white shadow-violet-500/20"
            : "bg-zinc-800 text-violet-400 border border-zinc-700 hover:border-violet-500/50 hover:bg-zinc-750"
        }`}
      >
        {open ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
        <span className="text-xs font-medium">{open ? "Cerrar" : "AI"}</span>
      </button>

      {/* ── Chat panel ── */}
      <div
        className={`fixed bottom-16 right-5 z-50 flex flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/40 transition-all duration-200 ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{ width: 380, height: "min(520px, calc(100vh - 100px))" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-xs font-medium text-zinc-300 truncate flex-1">
            Asistente — {nombre}
          </span>
          <button
            onClick={() => { setMessages([]); setInput(""); }}
            className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            title="Limpiar chat"
          >
            Limpiar
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="text-zinc-600 text-xs mb-3">
                Pregúntame sobre esta cotización
              </div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {SUGERENCIAS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-[10px] px-2.5 py-1.5 rounded-full border border-zinc-700 text-zinc-400 hover:border-violet-500/50 hover:text-violet-300 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-violet-600/20 text-violet-100 border border-violet-500/20"
                    : "bg-zinc-800/80 text-zinc-300 border border-zinc-700/50"
                }`}
              >
                {m.role === "assistant" ? (
                  <div
                    className="[&_strong]:text-zinc-100 [&_em]:text-zinc-400"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content || "…") }}
                  />
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-1">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Pregunta sobre esta cotización..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 transition-colors"
              style={{ maxHeight: 80 }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="rounded-xl bg-violet-600 p-2 text-white hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
