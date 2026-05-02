// Feature flag system. Phase 1 of the bias goldmine is now the default
// experience for everyone. The gate is kept as a kill-switch + escape hatch:
//   - ?legacy=1 in the URL → forces the old /bias page (for screenshot
//     comparisons, debugging, or rollback if Sage is broken)
//   - Set FORCE_LEGACY = true to disable V2 globally without redeploying
//     hooks (kill switch).

const FORCE_LEGACY = false;

export function useFeatureFlag(name: 'bias_v2'): boolean {
  if (FORCE_LEGACY) return false;
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('legacy')) {
    return false;
  }
  if (name === 'bias_v2') return true;
  return false;
}
