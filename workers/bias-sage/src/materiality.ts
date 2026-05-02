export interface InputsHashSource {
  phases: Record<string, string>;
  openPositions: { symbol: string; direction: 'long' | 'short' }[];
  lastBriefId: string | null;
}

export function computeInputsHash(src: InputsHashSource): string {
  // Sort keys/positions for stability across input ordering.
  const phasesEntries = Object.entries(src.phases).sort(([a], [b]) => a.localeCompare(b));
  const positionsSorted = [...src.openPositions].sort((a, b) =>
    a.symbol === b.symbol
      ? a.direction.localeCompare(b.direction)
      : a.symbol.localeCompare(b.symbol),
  );
  const canonical = JSON.stringify({
    phases: phasesEntries,
    positions: positionsSorted,
    lastBriefId: src.lastBriefId,
  });
  // FNV-1a 32-bit. Web Crypto isn't worth the async ceremony for an 8-char dedup tag.
  let h = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    h ^= canonical.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export interface MaterialityInput {
  watchlist: string[];
  previousPhases: Record<string, string>;
  currentPhases: Record<string, string>;
  anyAlertFiredForUser: boolean;
  regimeFlipped: boolean;
}

export interface MaterialityResult {
  material: boolean;
  triggers: string[];
}

export function isMaterialChange(input: MaterialityInput): MaterialityResult {
  const triggers: string[] = [];
  for (const sym of input.watchlist) {
    const prev = input.previousPhases[sym];
    const curr = input.currentPhases[sym];
    if (prev && curr && prev !== curr) triggers.push(`phase_flip:${sym}`);
  }
  if (input.anyAlertFiredForUser) triggers.push('alert');
  if (input.regimeFlipped) triggers.push('regime_flip');
  return { material: triggers.length > 0, triggers };
}
