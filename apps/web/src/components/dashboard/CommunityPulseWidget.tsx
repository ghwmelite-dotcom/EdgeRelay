import { Users } from 'lucide-react';

export function CommunityPulseWidget() {
  return <section aria-label="Community trading pulse" className="glass-premium rounded-2xl p-5">
    <div className="flex items-center gap-2.5 mb-3"><Users size={16} className="text-neon-purple" /><h3 className="text-sm font-semibold text-terminal-text">Community Trading Pulse</h3></div>
    <p className="text-sm text-terminal-muted">Live community positioning is not connected yet. Sentiment, volume trends and community win rates are unavailable.</p>
  </section>;
}
