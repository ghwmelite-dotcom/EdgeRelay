import { useRef, useState } from 'react';
import { Download, Loader2, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import type { ICCScore } from '@/lib/icc-scoring-engine';
import type { ICCScenario } from '@/data/icc-scenarios';
import type { SessionStats } from '@/lib/chart-simulator-engine';
import { loadStreak } from './ICCStreakChallenge';

interface Props {
  scenario: ICCScenario;
  score: ICCScore;
  stats: SessionStats;
}

const GRADE_COLORS: Record<string, string> = {
  A: '#00ff9d', B: '#00e5ff', C: '#ffb800', D: '#ff3d57', F: '#ff3d57',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#00ff9d', intermediate: '#ffb800', advanced: '#ff3d57', expert: '#b18cff',
};

export function ICCSessionSummary({ scenario, score, stats }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const gradeColor = GRADE_COLORS[score.grade] || '#00e5ff';

  // Calculate current streak
  const streakEntries = loadStreak();
  let currentStreak = 0;
  for (let i = streakEntries.length - 1; i >= 0; i--) {
    if (streakEntries[i].percentage >= 55) currentStreak++;
    else break;
  }

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: '#0a0f16',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `icc-${scenario.instrument}-${score.grade}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {}
    setExporting(false);
  };

  const handleShare = async () => {
    if (!cardRef.current || !navigator.share) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(cardRef.current, { backgroundColor: '#0a0f16', pixelRatio: 2 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `icc-${scenario.instrument}-${score.grade}.png`, { type: 'image/png' });
      await navigator.share({ title: 'ICC Practice Studio Results', files: [file] });
    } catch {}
    setExporting(false);
  };

  const diffColor = DIFFICULTY_COLORS[scenario.difficulty] || '#00e5ff';
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return (
    <div className="animate-fade-in-up space-y-3">
      {/* The card — uses hardcoded colors for html-to-image compatibility */}
      <div
        ref={cardRef}
        style={{
          width: 400,
          background: 'linear-gradient(135deg, #0a0f16, #111827)',
          border: '1px solid #1e293b',
          borderRadius: 16,
          padding: 24,
          fontFamily: '"JetBrains Mono", "IBM Plex Mono", monospace',
          color: '#e2e8f0',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
              ICC Practice Studio
            </div>
            <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>trademetricspro.com</div>
          </div>
          <div style={{ fontSize: 9, color: '#64748b' }}>{dateStr}</div>
        </div>

        {/* Scenario info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>{scenario.instrument}</span>
          <span style={{
            fontSize: 9, fontWeight: 600, color: diffColor, border: `1px solid ${diffColor}40`,
            borderRadius: 99, padding: '2px 8px', background: `${diffColor}10`,
          }}>
            {scenario.difficulty}
          </span>
          <span style={{ fontSize: 9, color: '#64748b' }}>{scenario.session}</span>
        </div>

        {/* Grade + Percentage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          {/* Circular gauge */}
          <svg width={64} height={64} viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={18} cy={18} r={15} fill="none" stroke="#1e293b" strokeWidth={3} />
            <circle
              cx={18} cy={18} r={15} fill="none" stroke={gradeColor} strokeWidth={3}
              strokeDasharray={`${(score.percentage / 100) * 94.2} 94.2`} strokeLinecap="round"
            />
          </svg>
          <div>
            <div style={{ fontSize: 36, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{score.grade}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{score.percentage}% — {score.total}/{score.maxTotal} pts</div>
          </div>
        </div>

        {/* 5-dimension breakdown */}
        <div style={{ marginBottom: 16 }}>
          {score.components.map((comp) => (
            <div key={comp.dimension} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: '#cbd5e1' }}>{comp.dimension}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: comp.color }}>{comp.score}/{comp.maxScore}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: '#1e293b', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, width: `${(comp.score / comp.maxScore) * 100}%`,
                  background: `${comp.color}80`,
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Session stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Trades', value: String(stats.totalTrades), color: '#ffffff' },
            { label: 'Win Rate', value: `${stats.winRate}%`, color: stats.winRate >= 50 ? '#00ff9d' : '#ff3d57' },
            { label: 'P&L', value: `${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl}`, color: stats.totalPnl >= 0 ? '#00ff9d' : '#ff3d57' },
            { label: 'Streak', value: `${currentStreak}`, color: '#ffb800' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', background: '#111827', borderRadius: 8, padding: '8px 4px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 8, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: '#475569' }}>Powered by TradeMetrics Pro</span>
          <span style={{ fontSize: 8, color: '#475569' }}>ICC Method Practice</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleDownload}
          disabled={exporting}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-neon-cyan/30 bg-neon-cyan/10 py-2.5 text-[12px] font-semibold text-neon-cyan disabled:opacity-50 cursor-pointer"
        >
          {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
          Download PNG
        </button>
        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
          <button
            onClick={handleShare}
            disabled={exporting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-neon-purple/30 bg-neon-purple/10 py-2.5 text-[12px] font-semibold text-neon-purple disabled:opacity-50 cursor-pointer"
          >
            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
            Share
          </button>
        )}
      </div>
    </div>
  );
}
