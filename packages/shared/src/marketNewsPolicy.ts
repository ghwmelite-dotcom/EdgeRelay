/** Conservative headline triage, not a prediction of market direction or impact size. */
export interface MajorNewsDecision { category: string; reason: string }
const ECONOMY = /\b(us|u\.s\.|united states|eurozone|euro area|germany|german|uk|u\.k\.|britain|british|japan|japanese|china|chinese|canada|canadian|australia|australian|new zealand|swiss|switzerland)\b/i;
const BANK = /\b(fed|federal reserve|fomc|ecb|boe|boj|boc|rba|rbnz|snb|pboc|bank of (england|japan|canada)|european central bank)\b/i;
const ROUTINE = /\b(preview|week ahead|news wrap|technical analysis|price forecast|price prediction|moving average|option expiries|food price|regional survey|rumou?r|unconfirmed|no confirmed reports)\b/i;

export function classifyMajorNews(headline: string): MajorNewsDecision | null {
  if (!headline || ROUTINE.test(headline)) return null;
  if (/\b(fomc|federal reserve)\b/i.test(headline) && /\b(statement|minutes|dot plot|economic projections)\b/i.test(headline) && /\b(releases?|released|publishes?|published|shows?|indicates?|projects?)\b/i.test(headline) && !/\b(preview|expected|may|might|could)\b/i.test(headline)) {
    return { category: 'FOMC', reason: 'Published Federal Reserve decision materials' };
  }
  if (BANK.test(headline) && /\b(rate decision|raises?|hikes?|cuts?|holds?|keeps?|leaves?|maintains?|interest rate|policy rate|quantitative (easing|tightening)|emergency (meeting|liquidity)|asset purchases)\b/i.test(headline)
      && /\b(announces?|decides?|raises?|hikes?|cuts?|holds?|keeps?|leaves?|maintains?|actual|unchanged|bps|basis points)\b/i.test(headline)
      && !/\b(may|might|could|expected to|bets? on|odds of|prices? in)\b/i.test(headline)) {
    return { category: 'Monetary policy', reason: 'Central-bank policy decision or intervention' };
  }
  if ((ECONOMY.test(headline) || /\bnfp\b/i.test(headline)) && /\b(cpi|consumer price|pce|nfp|nonfarm|non-farm|payrolls|unemployment rate|gdp|gross domestic product|retail sales|flash pmi|ism (manufacturing|services))\b/i.test(headline)
      && /\b(actual|reports?|released?|rose|rises?|fell|falls?|grew|growth|contracts?|beats?|misses?|unexpectedly)\b|\d+(?:\.\d+)?%/i.test(headline)
      && (!/\b(forecast|expected|estimate|projected)\b/i.test(headline) || /\b(actual|reported|released|rose|fell|grew|beat|missed)\b/i.test(headline))) {
    return { category: 'Major economic release', reason: 'Key inflation, employment, growth or demand data' };
  }
  return null;
}

export function selectMajorNews<T extends { headline: string }>(items: T[], limit = 10): Array<T & { importance: MajorNewsDecision }> {
  const seen = new Set<string>();
  const selected: Array<T & { importance: MajorNewsDecision }> = [];
  for (const item of items) {
    const importance = classifyMajorNews(item.headline);
    const key = item.headline.replace(/^financialjuice:\s*/i, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!importance || seen.has(key)) continue;
    seen.add(key);
    selected.push({ ...item, importance });
    if (selected.length >= limit) break;
  }
  return selected;
}
