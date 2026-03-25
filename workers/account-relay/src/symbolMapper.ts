/**
 * Symbol mapper — translates master symbols to follower-broker symbols.
 *
 * Priority:
 * 1. Explicit mapping (e.g., XAUUSD → GOLD)
 * 2. Cross-platform normalization (if platforms differ)
 * 3. Suffix append (e.g., EURUSD → EURUSDm)
 * 4. Passthrough (return original symbol)
 */

export interface SymbolMapperConfig {
  symbol_suffix: string;
}

// ── Alias Map ────────────────────────────────────────────────
// Normalizes known instrument name variants to a canonical form.

const SYMBOL_ALIASES: Map<string, string> = new Map([
  ['GOLD', 'XAUUSD'],
  ['SILVER', 'XAGUSD'],
  ['SPX500', 'US500'],
  ['SP500', 'US500'],
  ['USTEC', 'NAS100'],
  ['US100', 'NAS100'],
  ['NSDQ100', 'NAS100'],
  ['DJ30', 'US30'],
  ['DOW30', 'US30'],
  ['UKOIL', 'BRENTOIL'],
  ['BRENT', 'BRENTOIL'],
  ['USOIL', 'WTIOIL'],
  ['WTI', 'WTIOIL'],
  ['CRUDE', 'WTIOIL'],
  ['BITCOIN', 'BTCUSD'],
  ['ETHEREUM', 'ETHUSD'],
]);

const BROKER_SUFFIXES = ['.pro', '.raw', '.ecn', '.std', '.m', '.c', '.i'];

// ── Normalization ────────────────────────────────────────────

/**
 * Normalize a symbol for cross-platform matching.
 * - Strips broker suffixes (if remaining string >= 3 chars)
 * - Removes separators (/)
 * - Applies alias map
 * - Returns uppercase for consistent casing
 */
export function normalizeSymbol(symbol: string): string {
  let normalized = symbol;

  // Strip broker suffixes (longest first — sorted by length desc)
  for (const suffix of BROKER_SUFFIXES) {
    if (
      normalized.toLowerCase().endsWith(suffix) &&
      normalized.length - suffix.length >= 3
    ) {
      normalized = normalized.slice(0, -suffix.length);
      break;
    }
  }

  // Remove separators
  normalized = normalized.replace(/\//g, '');

  // Apply aliases (case-insensitive lookup, return uppercase for consistency)
  const upper = normalized.toUpperCase();
  return SYMBOL_ALIASES.get(upper) ?? upper;
}

// ── Map Symbol ───────────────────────────────────────────────

/**
 * Map a master symbol to the follower's broker symbol.
 *
 * @param symbol          The original symbol from the master signal
 * @param config          Follower's symbol configuration
 * @param symbolMappings  Explicit symbol-to-symbol mappings
 * @param sourcePlatform  Platform that sent the signal (default 'mt5')
 * @param targetPlatform  Follower's platform (default 'mt5')
 * @returns               Mapped symbol string
 */
export function mapSymbol(
  symbol: string,
  config: SymbolMapperConfig,
  symbolMappings: Map<string, string>,
  sourcePlatform = 'mt5',
  targetPlatform = 'mt5',
): string {
  // 1. Check explicit mapping first (highest priority)
  const explicit = symbolMappings.get(symbol);
  if (explicit) {
    return explicit;
  }

  let result = symbol;

  // 2. Cross-platform: apply rule-based normalization
  if (sourcePlatform !== targetPlatform) {
    result = normalizeSymbol(result);
  }

  // 3. Append suffix if configured
  if (config.symbol_suffix) {
    result = `${result}${config.symbol_suffix}`;
  }

  // 4. Passthrough
  return result;
}
