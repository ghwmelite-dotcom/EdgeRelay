import { useState, useRef, useEffect } from 'react';
import { Brain, Send, Loader2, X, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  lessonTitle: string;
  levelTitle: string;
  initialPrompt?: string; // Pre-filled question (e.g., from failed quiz)
  onClose: () => void;
}

export function InlineAITutor({ lessonTitle, levelTitle, initialPrompt, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialPrompt || '');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-send initial prompt if provided
  useEffect(() => {
    if (initialPrompt && !sessionId) {
      handleSend(initialPrompt);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(text?: string) {
    const msg = text || input.trim();
    if (!msg || sending) return;
    setInput('');
    setSending(true);

    // Create session if needed
    let sid = sessionId;
    if (!sid) {
      const res = await api.post<{ id: string }>('/counselor/sessions');
      if (res.data) {
        sid = res.data.id;
        setSessionId(sid);
      } else {
        setSending(false);
        return;
      }
    }

    // Add user message optimistically
    setMessages(prev => [...prev, { role: 'user', content: msg }]);

    // Prepend lesson context to the first message
    const contextPrefix = messages.length === 0
      ? `[Context: The student is studying "${lessonTitle}" in Academy ${levelTitle}. Answer their question about this specific topic. Keep your answer focused, educational, and beginner-friendly. Use examples.]\n\n`
      : '';

    const res = await api.post<{
      userMessage: { content: string };
      assistantMessage: { content: string };
    }>(`/counselor/sessions/${sid}/messages`, { message: contextPrefix + msg });

    if (res.data) {
      setMessages(prev => [
        ...prev.slice(0, -1), // Remove optimistic user msg
        { role: 'user', content: msg },
        { role: 'assistant', content: res.data!.assistantMessage.content },
      ]);
    }
    setSending(false);
    inputRef.current?.focus();
  }

  return (
    <div className="animate-fade-in-up rounded-2xl border border-neon-purple/25 bg-gradient-to-br from-neon-purple/[0.04] to-transparent overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neon-purple/15 px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain size={16} className="text-neon-purple" />
          <span className="text-sm font-semibold text-white">Sage — Lesson Tutor</span>
          <span className="font-mono-nums text-[9px] text-neon-green">Online</span>
        </div>
        <button onClick={onClose} className="text-terminal-muted hover:text-white transition-colors cursor-pointer">
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div className="max-h-64 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && !sending && (
          <div className="text-center py-4">
            <Sparkles size={20} className="mx-auto text-neon-purple/40 mb-2" />
            <p className="text-[12px] text-terminal-muted">Ask Sage anything about this lesson</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neon-purple/15 border border-neon-purple/20 mt-0.5">
                <Brain size={11} className="text-neon-purple" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line ${
              msg.role === 'user'
                ? 'rounded-tr-sm bg-neon-cyan/10 border border-neon-cyan/15 text-slate-200'
                : 'rounded-tl-sm bg-terminal-card/40 border border-terminal-border/20 text-slate-300'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neon-purple/15 border border-neon-purple/20">
              <Brain size={11} className="text-neon-purple" />
            </div>
            <div className="rounded-xl rounded-tl-sm bg-terminal-card/40 border border-terminal-border/20 px-3 py-2">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-neon-purple/50 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-neon-purple/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-neon-purple/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-neon-purple/15 px-3 py-2.5 flex gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask about this lesson..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-terminal-border/40 bg-terminal-bg px-3 py-2 text-[13px] text-white placeholder:text-terminal-muted/40 focus:border-neon-purple/40 focus:outline-none"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || sending}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-neon-purple text-white disabled:opacity-30 cursor-pointer"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </div>
    </div>
  );
}
