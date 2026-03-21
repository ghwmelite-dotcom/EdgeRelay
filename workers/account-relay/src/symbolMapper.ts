/**
 * Symbol mapper — translates master symbols to follower-broker symbols.
 *
 * Priority:
 * 1. Explicit mapping (e.g., XAUUSD → GOLD)
 * 2. Suffix append (e.g., EURUSD → EURUSDm)
 * 3. Passthrough (return original symbol)
 */

export interface SymbolMapperConfig {
  symbol_suffix: string;
}

/**
 * Map a master symbol to the follower's broker symbol.
 *
 * @param symbol          The original symbol from the master signal
 * @param config          Follower's symbol configuration
 * @param symbolMappings  Explicit symbol-to-symbol mappings
 * @returns               Mapped symbol string
 */
export function mapSymbol(
  symbol: string,
  config: SymbolMapperConfig,
  symbolMappings: Map<string, string>,
): string {
  // 1. Check explicit mapping first
  const explicit = symbolMappings.get(symbol);
  if (explicit) {
    return explicit;
  }

  // 2. Append suffix if configured
  if (config.symbol_suffix) {
    return `${symbol}${config.symbol_suffix}`;
  }

  // 3. Passthrough
  return symbol;
}
