import { useMemo } from 'react';
import { Lightbulb, ChevronRight, Target } from 'lucide-react';
import { ICC_SCENARIOS, type ICCScenario } from '@/data/icc-scenarios';
import { loadStreak, type StreakEntry } from './ICCStreakChallenge';

interface Props {
  onSelectScenario: (scenario: ICCScenario) => void;
}

interface Recommendation {
  scenario: ICCScenario;
  reason: string;
  accent: string;
}

function getRecommendations(entries: StreakEntry[]): Recommendation[] {
  if (entries.length === 0) return [];

  const recent = entries.slice(-10);
  const avgPct = recent.reduce((s, e) => s + e.percentage, 0) / recent.length;

  // Determine target difficulty based on performance
  let targetDifficulties: string[];
  let performanceMsg: string;

  if (avgPct < 40) {
    targetDifficulties = ['beginner'];
    performanceMsg = 'Build strong fundamentals with clearer patterns';
  } else if (avgPct < 55) {
    targetDifficulties = ['beginner', 'intermediate'];
    performanceMsg = 'Solidify your ICC identification skills';
  } else if (avgPct < 70) {
    targetDifficulties = ['intermediate', 'advanced'];
    performanceMsg = 'Sharpen your precision on trickier setups';
  } else {
    targetDifficulties = ['advanced', 'expert'];
    performanceMsg = 'Push your limits with complex scenarios';
  }

  // Find weakest dimension if dimension data available
  let weakestDimension = '';
  const entriesWithDims = entries.filter(e => e.dimensions);
  if (entriesWithDims.length >= 2) {
    const dimAvgs: Record<string, number> = {};
    const dimCounts: Record<string, number> = {};
    for (const e of entriesWithDims.slice(-5)) {
      if (!e.dimensions) continue;
      for (const [k, v] of Object.entries(e.dimensions)) {
        dimAvgs[k] = (dimAvgs[k] || 0) + v;
        dimCounts[k] = (dimCounts[k] || 0) + 1;
      }
    }
    let lowestAvg = Infinity;
    for (const [k, total] of Object.entries(dimAvgs)) {
      const avg = total / (dimCounts[k] || 1);
      if (avg < lowestAvg) { lowestAvg = avg; weakestDimension = k; }
    }
  }

  // Filter out recently attempted scenarios (last 3)
  const recentIds = new Set(entries.slice(-3).map(e => e.scenarioId));

  // Filter and sort candidates
  const candidates = ICC_SCENARIOS
    .filter(s => !recentIds.has(s.id))
    .filter(s => targetDifficulties.includes(s.difficulty));

  // Diversify instruments — prefer instruments not in last 3
  const recentInstruments = new Set(entries.slice(-3).map(e => {
    const scenario = ICC_SCENARIOS.find(s => s.id === e.scenarioId);
    return scenario?.instrument;
  }));

  const sorted = [...candidates].sort((a, b) => {
    const aRecent = recentInstruments.has(a.instrument) ? 1 : 0;
    const bRecent = recentInstruments.has(b.instrument) ? 1 : 0;
    return aRecent - bRecent;
  });

  const DIFFICULTY_ACCENTS: Record<string, string> = {
    beginner: '#00ff9d', intermediate: '#ffb800', advanced: '#ff3d57', expert: '#b18cff',
  };

  const results: Recommendation[] = [];

  for (const s of sorted.slice(0, 2)) {
    let reason = performanceMsg;
    if (weakestDimension) {
      const dimLabels: Record<string, string> = {
        bias: 'bias reading', indication: 'indication marking',
        correction: 'correction identification', continuation: 'entry timing',
        risk: 'risk management',
      };
      reason += ` — focus on ${dimLabels[weakestDimension] || weakestDimension}`;
    }

    results.push({
      scenario: s,
      reason,
      accent: DIFFICULTY_ACCENTS[s.difficulty] || '#00e5ff',
    });
  }

  return results;
}

export function ICCRecommendations({ onSelectScenario }: Props) {
  const recommendations = useMemo(() => {
    const entries = loadStreak();
    return getRecommendations(entries);
  }, []);

  if (recommendations.length === 0) return null;

  return (
    <div className="animate-fade-in-up rounded-2xl border border-neon-purple/20 bg-gradient-to-r from-neon-purple/[0.04] to-transparent p-5" style={{ animationDelay: '80ms' }}>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={14} className="text-neon-purple" />
        <h3 className="text-sm font-semibold text-white">Recommended for You</h3>
      </div>

      <div className="space-y-2">
        {recommendations.map((rec) => (
          <button
            key={rec.scenario.id}
            onClick={() => onSelectScenario(rec.scenario)}
            className="w-full text-left flex items-center gap-3 rounded-xl border border-terminal-border/30 bg-terminal-bg/30 p-3 hover:border-neon-purple/30 transition-all cursor-pointer group"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
              style={{ borderColor: `${rec.accent}30`, backgroundColor: `${rec.accent}10` }}
            >
              <Target size={16} style={{ color: rec.accent }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono-nums text-[11px] font-bold text-white">{rec.scenario.instrument}</span>
                <span className="rounded-full border px-1.5 py-0.5 font-mono-nums text-[8px]" style={{ borderColor: `${rec.accent}30`, color: rec.accent }}>
                  {rec.scenario.difficulty}
                </span>
              </div>
              <p className="text-[10px] text-terminal-muted mt-0.5 truncate">{rec.reason}</p>
            </div>
            <ChevronRight size={14} className="text-terminal-muted group-hover:text-neon-purple transition-colors shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
