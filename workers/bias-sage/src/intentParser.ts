import type { SageBriefIntent } from '@edgerelay/shared';

export type ParseResult =
  | { kind: 'ok'; briefMd: string; intent: SageBriefIntent }
  | { kind: 'parse_error'; reason: string };

const BRIEF_RE = /<brief>([\s\S]*?)<\/brief>/;
const INTENT_RE = /<intent>([\s\S]*?)<\/intent>/;

export function parseSageResponse(raw: string): ParseResult {
  const briefMatch = raw.match(BRIEF_RE);
  const intentMatch = raw.match(INTENT_RE);
  if (!briefMatch || !intentMatch) {
    return { kind: 'parse_error', reason: 'missing brief or intent block' };
  }
  let intent: unknown;
  try {
    intent = JSON.parse(intentMatch[1]!.trim());
  } catch (e) {
    return { kind: 'parse_error', reason: `intent JSON invalid: ${(e as Error).message}` };
  }
  const validated = validateIntent(intent);
  if (validated.kind === 'invalid') {
    return { kind: 'parse_error', reason: validated.reason };
  }
  return { kind: 'ok', briefMd: briefMatch[1]!.trim(), intent: validated.value };
}

function validateIntent(
  v: unknown,
): { kind: 'valid'; value: SageBriefIntent } | { kind: 'invalid'; reason: string } {
  if (!v || typeof v !== 'object') return { kind: 'invalid', reason: 'not an object' };
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.greenlit) || !Array.isArray(o.skip) || !Array.isArray(o.watch)) {
    return { kind: 'invalid', reason: 'greenlit/skip/watch must be arrays' };
  }
  if (typeof o.hero_symbol !== 'string' && o.hero_symbol !== null) {
    return { kind: 'invalid', reason: 'hero_symbol must be string or null' };
  }
  // Lenient on per-item shape — downstream consumers (UI) default-populate.
  // The eval suite in Task 18 enforces stricter contract on real generations.
  return {
    kind: 'valid',
    value: {
      greenlit: o.greenlit as SageBriefIntent['greenlit'],
      skip: o.skip as SageBriefIntent['skip'],
      watch: o.watch as SageBriefIntent['watch'],
      hero_symbol: o.hero_symbol as string | null,
    },
  };
}
