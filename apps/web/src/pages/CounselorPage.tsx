import { useEffect, useState, useRef } from 'react';
import {
  MessageCircle,
  Send,
  Plus,
  Trash2,
  Loader2,
  Heart,
  Brain,
  Clock,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr + 'Z').getTime(); // Assume UTC from server
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const WELCOME_MESSAGE = `Hey there. I'm Sage — your trading counselor.

I'm here whenever you need to talk. Whether it's a tough losing streak, the pressure of a funded challenge, the urge to overtrade, or just processing a big win — I'm all ears.

Everything we discuss stays between us. I can see your trading data to understand what you're going through, but I'll never judge you for a bad day.

What's on your mind?`;

const CONVERSATION_STARTERS = [
  { label: 'I had a rough trading day', icon: '😔' },
  { label: 'I keep overtrading and can\'t stop', icon: '🔄' },
  { label: 'I\'m scared to take trades', icon: '😰' },
  { label: 'Just had a big win and feeling great', icon: '🎉' },
  { label: 'I blew my funded account', icon: '💔' },
  { label: 'Help me build a pre-trade routine', icon: '📋' },
];

export function CounselorPage() {
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load sessions
  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoadingSessions(true);
    const res = await api.get<{ sessions: Session[] }>('/counselor/sessions');
    if (res.data) setSessions(res.data.sessions);
    setLoadingSessions(false);
  }

  async function createSession() {
    const res = await api.post<{ id: string; title: string }>('/counselor/sessions');
    if (res.data) {
      const newSession: Session = {
        id: res.data.id,
        title: res.data.title,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(res.data.id);
      setMessages([]);
    }
  }

  async function loadMessages(sessionId: string) {
    setActiveSessionId(sessionId);
    const res = await api.get<{ messages: Message[] }>(`/counselor/sessions/${sessionId}/messages`);
    if (res.data) setMessages(res.data.messages);
  }

  async function sendMessage(text?: string) {
    const msg = text || input.trim();
    if (!msg || sending || !activeSessionId) return;

    setInput('');
    setSending(true);

    // Optimistic add
    const tempUserMsg: Message = { id: `temp-${Date.now()}`, role: 'user', content: msg };
    setMessages((prev) => [...prev, tempUserMsg]);

    const res = await api.post<{
      userMessage: Message;
      assistantMessage: Message;
    }>(`/counselor/sessions/${activeSessionId}/messages`, { message: msg });

    if (res.data) {
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        res.data!.userMessage,
        res.data!.assistantMessage,
      ]);
      // Update session title in sidebar
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, title: res.data!.userMessage.content.slice(0, 60), updated_at: new Date().toISOString() }
            : s
        )
      );
    } else {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    }

    setSending(false);
    inputRef.current?.focus();
  }

  async function deleteSession(sessionId: string) {
    await api.del(`/counselor/sessions/${sessionId}`);
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isNewSession = activeSessionId && messages.length === 0 && !sending;

  return (
    <div className="page-enter flex h-[calc(100vh-64px)] overflow-hidden rounded-2xl border border-terminal-border/30 bg-terminal-card/10">

      {/* ── Sidebar: Sessions ─────────────────────────── */}
      <div
        className="shrink-0 border-r border-terminal-border/20 bg-terminal-surface/50 transition-all duration-300 overflow-hidden"
        style={{ width: sidebarOpen ? '280px' : '0px' }}
      >
        <div className="flex h-full w-[280px] flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-terminal-border/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <Heart size={16} className="text-neon-purple" />
              <span className="text-sm font-semibold text-white">Sessions</span>
              <span className="font-mono-nums text-[10px] text-terminal-muted">({sessions.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={createSession}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-neon-cyan/20 bg-neon-cyan/10 text-neon-cyan hover:bg-neon-cyan/20 transition-all cursor-pointer"
                title="New conversation"
              >
                <Plus size={14} />
              </button>
              <button
                onClick={() => setSidebarOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted hover:text-white hover:bg-terminal-card/50 transition-all cursor-pointer"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={14} />
              </button>
            </div>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto py-2">
            {loadingSessions && (
              <div className="flex items-center justify-center py-8 text-terminal-muted">
                <Loader2 size={16} className="animate-spin" />
              </div>
            )}
            {sessions.map((s) => {
              const isActive = activeSessionId === s.id;
              const timeAgo = formatTimeAgo(s.updated_at);
              return (
                <div
                  key={s.id}
                  className={`group mx-2 mb-1 rounded-lg px-3 py-2.5 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-neon-purple/10 border border-neon-purple/20'
                      : 'hover:bg-terminal-card/50 border border-transparent'
                  }`}
                  onClick={() => loadMessages(s.id)}
                >
                  <div className="flex items-start gap-2.5">
                    <MessageCircle size={13} className={`shrink-0 mt-0.5 ${isActive ? 'text-neon-purple' : 'text-terminal-muted/50'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] leading-snug line-clamp-2 ${isActive ? 'text-white font-medium' : 'text-slate-400'}`}>
                        {s.title}
                      </p>
                      <p className="font-mono-nums text-[9px] text-terminal-muted/50 mt-1">{timeAgo}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      className="hidden group-hover:flex h-5 w-5 shrink-0 items-center justify-center rounded text-terminal-muted/40 hover:text-neon-red transition-colors cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
            {!loadingSessions && sessions.length === 0 && (
              <div className="px-4 py-10 text-center">
                <MessageCircle size={24} className="mx-auto text-terminal-muted/20 mb-3" />
                <p className="text-[11px] text-terminal-muted">
                  No conversations yet.
                </p>
                <p className="text-[10px] text-terminal-muted/50 mt-1">Start one — Sage is ready.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Chat Area ────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">

        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-terminal-border/20 px-6 py-3">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-terminal-border/30 text-terminal-muted hover:text-neon-purple hover:border-neon-purple/30 transition-all cursor-pointer"
                title="Show sessions"
              >
                <PanelLeftOpen size={14} />
              </button>
            )}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border border-neon-purple/25">
              <Brain size={18} className="text-neon-purple" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Sage</h2>
              <p className="font-mono-nums text-[9px] text-neon-green">Online — Trading Psychology Counselor</p>
            </div>
          </div>
          {!activeSessionId && (
            <button
              onClick={createSession}
              className="inline-flex items-center gap-1.5 rounded-lg bg-neon-purple px-4 py-2 text-[12px] font-semibold text-white cursor-pointer hover:bg-neon-purple/80 transition-colors"
            >
              <Plus size={13} /> New Conversation
            </button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* No session selected */}
          {!activeSessionId && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-purple/15 to-neon-cyan/10 border border-neon-purple/20 mb-6">
                <Brain size={36} className="text-neon-purple" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white">Meet Sage</h2>
              <p className="mt-2 max-w-md text-sm text-slate-400 leading-relaxed">
                Your personal trading psychology counselor. Talk about losses, wins, fears, discipline — anything on your mind.
                Sage sees your trading data and understands what you're going through.
              </p>
              <button
                onClick={createSession}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-neon-purple px-8 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(177,140,255,0.25)] hover:shadow-[0_0_30px_rgba(177,140,255,0.4)] transition-all cursor-pointer"
              >
                <Sparkles size={16} /> Start a Conversation
              </button>
            </div>
          )}

          {/* Welcome + starters for new session */}
          {isNewSession && (
            <div className="max-w-2xl mx-auto">
              {/* Welcome message */}
              <div className="flex gap-3 mb-8">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border border-neon-purple/25 mt-1">
                  <Brain size={14} className="text-neon-purple" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-terminal-border/20 bg-terminal-card/40 px-5 py-4 text-[14px] leading-relaxed text-slate-300 whitespace-pre-line">
                  {WELCOME_MESSAGE}
                </div>
              </div>

              {/* Conversation starters */}
              <p className="text-[10px] uppercase tracking-widest text-terminal-muted mb-3 text-center">Or start with...</p>
              <div className="grid grid-cols-2 gap-2">
                {CONVERSATION_STARTERS.map((starter) => (
                  <button
                    key={starter.label}
                    onClick={() => sendMessage(starter.label)}
                    className="flex items-center gap-2.5 rounded-xl border border-terminal-border/30 bg-terminal-card/30 px-4 py-3 text-left text-[13px] text-slate-400 hover:border-neon-purple/30 hover:bg-neon-purple/[0.04] hover:text-white transition-all cursor-pointer"
                  >
                    <span className="text-lg">{starter.icon}</span>
                    {starter.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="max-w-2xl mx-auto space-y-5">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  {msg.role === 'assistant' ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border border-neon-purple/25 mt-1">
                      <Brain size={14} className="text-neon-purple" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neon-cyan/20 bg-neon-cyan/10 mt-1">
                      <span className="font-mono-nums text-[10px] font-bold text-neon-cyan">
                        {user?.name?.[0]?.toUpperCase() || 'T'}
                      </span>
                    </div>
                  )}
                  {/* Bubble */}
                  <div
                    className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-[14px] leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-neon-cyan/10 border border-neon-cyan/15 text-slate-200'
                        : 'rounded-tl-sm bg-terminal-card/40 border border-terminal-border/20 text-slate-300'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {sending && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border border-neon-purple/25 mt-1">
                    <Brain size={14} className="text-neon-purple" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-terminal-card/40 border border-terminal-border/20 px-5 py-4">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-neon-purple/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 rounded-full bg-neon-purple/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 rounded-full bg-neon-purple/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        {activeSessionId && (
          <div className="border-t border-terminal-border/20 px-6 py-4">
            <div className="mx-auto max-w-2xl flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Talk to Sage..."
                  rows={1}
                  className="w-full resize-none rounded-xl border border-terminal-border/40 bg-terminal-bg px-4 py-3 pr-12 text-sm text-white placeholder:text-terminal-muted/50 focus:border-neon-purple/40 focus:outline-none focus:ring-1 focus:ring-neon-purple/20 transition-all"
                  style={{ maxHeight: '120px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                  }}
                />
              </div>
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || sending}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neon-purple text-white shadow-[0_0_16px_rgba(177,140,255,0.2)] transition-all hover:shadow-[0_0_24px_rgba(177,140,255,0.4)] disabled:opacity-30 disabled:shadow-none cursor-pointer"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="mt-2 text-center font-mono-nums text-[9px] text-terminal-muted/40">
              Sage is an AI counselor — not a therapist or financial advisor. For emergencies, contact a professional.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
