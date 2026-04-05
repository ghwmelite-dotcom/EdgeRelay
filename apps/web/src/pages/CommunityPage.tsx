import { useEffect, useState, useCallback } from 'react';
import {
  Users, ThumbsUp, ThumbsDown, Send, TrendingUp, TrendingDown,
  Target, Lightbulb, CheckCircle2, Loader2, MessageSquare,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

interface Post {
  id: string;
  user_name: string;
  post_type: 'setup' | 'result' | 'insight';
  symbol: string | null;
  direction: string | null;
  content: string;
  pnl: number | null;
  pips: number | null;
  upvotes: number;
  downvotes: number;
  is_verified: number;
  created_at: string;
}

const POST_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'setup', label: 'Setups', icon: Target },
  { value: 'result', label: 'Results', icon: TrendingUp },
  { value: 'insight', label: 'Insights', icon: Lightbulb },
];

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d + 'Z').getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function CommunityPage() {
  const user = useAuthStore(s => s.user);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [postType, setPostType] = useState<'setup' | 'result' | 'insight'>('insight');
  const [content, setContent] = useState('');
  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState<'buy' | 'sell' | ''>('');
  const [pnl, setPnl] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    const qs = filter !== 'all' ? `?type=${filter}` : '';
    const res = await api.get<{ posts: Post[] }>(`/social/feed${qs}`);
    if (res.data) setPosts(res.data.posts);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handlePost = async () => {
    if (!content.trim() || posting) return;
    setPosting(true);
    await api.post('/social/posts', {
      postType,
      content: content.trim(),
      symbol: symbol || undefined,
      direction: direction || undefined,
      pnl: pnl ? parseFloat(pnl) : undefined,
    });
    setContent('');
    setSymbol('');
    setDirection('');
    setPnl('');
    setComposerOpen(false);
    setPosting(false);
    fetchPosts();
  };

  const handleVote = async (postId: string, vote: 1 | -1) => {
    await api.post(`/social/posts/${postId}/vote`, { vote });
    fetchPosts();
  };

  return (
    <div className="page-enter max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <Users size={24} className="text-neon-cyan" />
          <h1 className="text-2xl font-bold text-white font-display tracking-tight">Community</h1>
        </div>
        <p className="text-sm text-terminal-muted">Share setups, post results, and learn from other traders</p>
      </div>

      {/* Composer */}
      <div className="animate-fade-in-up rounded-2xl border border-terminal-border/40 bg-terminal-card/20 overflow-hidden" style={{ animationDelay: '60ms' }}>
        {!composerOpen ? (
          <button onClick={() => setComposerOpen(true)} className="w-full px-5 py-4 text-left flex items-center gap-3 hover:bg-terminal-card/30 transition-all cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-neon-cyan/20 bg-neon-cyan/10">
              <span className="font-mono-nums text-[10px] font-bold text-neon-cyan">{user?.name?.[0]?.toUpperCase() || 'T'}</span>
            </div>
            <span className="text-[13px] text-terminal-muted">Share a setup, result, or insight...</span>
          </button>
        ) : (
          <div className="p-5 space-y-3">
            {/* Post type selector */}
            <div className="flex gap-2">
              {(['setup', 'result', 'insight'] as const).map(t => (
                <button key={t} onClick={() => setPostType(t)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold cursor-pointer transition-all ${
                    postType === t ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan' : 'border border-terminal-border/30 text-terminal-muted hover:text-white'
                  }`}>
                  {t === 'setup' ? '🎯 Setup' : t === 'result' ? '📊 Result' : '💡 Insight'}
                </button>
              ))}
            </div>

            {/* Content */}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={postType === 'setup' ? "Describe your trade setup..." : postType === 'result' ? "Share your trade result..." : "Share a trading insight..."}
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-terminal-border bg-terminal-bg px-4 py-3 text-sm text-white placeholder:text-terminal-muted/40 focus:border-neon-cyan/40 focus:outline-none resize-none"
            />

            {/* Optional fields for setups/results */}
            {(postType === 'setup' || postType === 'result') && (
              <div className="flex gap-2">
                <input value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="Symbol (e.g. EURUSD)"
                  className="flex-1 rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-[12px] text-white placeholder:text-terminal-muted/40 focus:border-neon-cyan/40 focus:outline-none" />
                <select value={direction} onChange={e => setDirection(e.target.value as 'buy' | 'sell' | '')}
                  className="rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 text-[12px] text-white focus:outline-none">
                  <option value="">Direction</option>
                  <option value="buy">BUY</option>
                  <option value="sell">SELL</option>
                </select>
                {postType === 'result' && (
                  <input value={pnl} onChange={e => setPnl(e.target.value)} placeholder="P&L ($)" type="number"
                    className="w-24 rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-[12px] text-white placeholder:text-terminal-muted/40 focus:outline-none" />
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-between items-center">
              <span className="font-mono-nums text-[10px] text-terminal-muted">{content.length}/500</span>
              <div className="flex gap-2">
                <button onClick={() => setComposerOpen(false)} className="rounded-lg border border-terminal-border px-4 py-2 text-[12px] text-slate-300 cursor-pointer">Cancel</button>
                <button onClick={handlePost} disabled={!content.trim() || posting}
                  className="rounded-lg bg-neon-cyan px-4 py-2 text-[12px] font-semibold text-terminal-bg disabled:opacity-40 cursor-pointer flex items-center gap-1.5">
                  {posting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {POST_TYPES.map(t => (
          <button key={t.value} onClick={() => setFilter(t.value)}
            className={`rounded-full px-3 py-1.5 font-mono-nums text-[10px] uppercase tracking-wider cursor-pointer transition-all ${
              filter === t.value ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-neon-cyan' : 'border border-terminal-border/30 text-terminal-muted hover:text-white'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-terminal-muted" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-terminal-border/30 bg-terminal-card/10 p-12 text-center">
          <MessageSquare size={32} className="mx-auto text-terminal-muted/20 mb-3" />
          <p className="text-sm text-terminal-muted">No posts yet. Be the first to share!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="rounded-2xl border border-terminal-border/30 bg-terminal-card/20 p-5 animate-fade-in-up">
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-terminal-border/30 bg-terminal-card/50">
                  <span className="font-mono-nums text-[10px] font-bold text-terminal-muted">{post.user_name[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{post.user_name}</span>
                    {post.is_verified === 1 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-neon-green/10 border border-neon-green/20 px-1.5 py-0.5 text-[8px] text-neon-green">
                        <CheckCircle2 size={8} /> Verified
                      </span>
                    )}
                  </div>
                  <span className="font-mono-nums text-[10px] text-terminal-muted">{timeAgo(post.created_at)}</span>
                </div>
                <span className={`rounded-full border px-2 py-0.5 font-mono-nums text-[9px] ${
                  post.post_type === 'setup' ? 'border-neon-cyan/20 text-neon-cyan bg-neon-cyan/10' :
                  post.post_type === 'result' ? 'border-neon-green/20 text-neon-green bg-neon-green/10' :
                  'border-neon-purple/20 text-neon-purple bg-neon-purple/10'
                }`}>
                  {post.post_type === 'setup' ? '🎯 Setup' : post.post_type === 'result' ? '📊 Result' : '💡 Insight'}
                </span>
              </div>

              {/* Symbol + Direction badge */}
              {post.symbol && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono-nums text-[12px] font-semibold text-white">{post.symbol}</span>
                  {post.direction && (
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono-nums text-[10px] font-bold ${
                      post.direction === 'buy' ? 'bg-neon-green/10 text-neon-green' : 'bg-neon-red/10 text-neon-red'
                    }`}>
                      {post.direction === 'buy' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {post.direction.toUpperCase()}
                    </span>
                  )}
                  {post.pnl !== null && (
                    <span className={`font-mono-nums text-[11px] font-bold ${post.pnl >= 0 ? 'text-neon-green' : 'text-neon-red'}`}>
                      {post.pnl >= 0 ? '+' : ''}${post.pnl.toFixed(2)}
                    </span>
                  )}
                </div>
              )}

              {/* Content */}
              <p className="text-[13px] leading-relaxed text-slate-300 whitespace-pre-line">{post.content}</p>

              {/* Vote buttons */}
              <div className="mt-3 flex items-center gap-3">
                <button onClick={() => handleVote(post.id, 1)} className="flex items-center gap-1 text-terminal-muted hover:text-neon-green transition-colors cursor-pointer">
                  <ThumbsUp size={14} />
                  <span className="font-mono-nums text-[11px]">{post.upvotes}</span>
                </button>
                <button onClick={() => handleVote(post.id, -1)} className="flex items-center gap-1 text-terminal-muted hover:text-neon-red transition-colors cursor-pointer">
                  <ThumbsDown size={14} />
                  <span className="font-mono-nums text-[11px]">{post.downvotes}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
