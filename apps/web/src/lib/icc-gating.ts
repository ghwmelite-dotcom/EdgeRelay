/**
 * ICC Difficulty Gating — Locks harder scenarios until competency is proven.
 */
import { loadStreak, type StreakEntry } from '@/components/practice/icc/ICCStreakChallenge';
import { ICC_SCENARIOS } from '@/data/icc-scenarios';

type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

const GATING_RULES: Record<string, { prerequisite: Difficulty; requiredBPlus: number }> = {
  intermediate: { prerequisite: 'beginner', requiredBPlus: 2 },
  advanced: { prerequisite: 'intermediate', requiredBPlus: 2 },
  expert: { prerequisite: 'advanced', requiredBPlus: 2 },
};

export interface GatingInfo {
  locked: boolean;
  achieved: number;
  needed: number;
  prerequisite: string;
}

function getDifficultyForScenario(scenarioId: string): Difficulty | null {
  const s = ICC_SCENARIOS.find(sc => sc.id === scenarioId);
  return s?.difficulty ?? null;
}

function countBPlusScores(entries: StreakEntry[], difficulty: Difficulty): number {
  const seen = new Set<string>();
  let count = 0;
  for (const e of entries) {
    if (e.percentage >= 70 && !seen.has(e.scenarioId)) {
      const diff = getDifficultyForScenario(e.scenarioId);
      if (diff === difficulty) {
        seen.add(e.scenarioId);
        count++;
      }
    }
  }
  return count;
}

export function getGatingInfo(difficulty: Difficulty): GatingInfo {
  if (difficulty === 'beginner') {
    return { locked: false, achieved: 0, needed: 0, prerequisite: '' };
  }

  const rule = GATING_RULES[difficulty];
  if (!rule) return { locked: false, achieved: 0, needed: 0, prerequisite: '' };

  const entries = loadStreak();
  const achieved = countBPlusScores(entries, rule.prerequisite);

  return {
    locked: achieved < rule.requiredBPlus,
    achieved,
    needed: rule.requiredBPlus,
    prerequisite: rule.prerequisite,
  };
}
