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
  // Llama 3.3 frequently appends commentary after the JSON object inside the
  // <intent> block (e.g. "Note: I haven't greenlit anything because..."). Pull
  // the first balanced { ... } and ignore everything else.
  const jsonText = extractFirstJsonObject(intentMatch[1]!);
  if (!jsonText) {
    return { kind: 'parse_error', reason: 'no JSON object found inside <intent>' };
  }
  let intent: unknown;
  try {
    intent = JSON.parse(jsonText);
  } catch (e) {
    return { kind: 'parse_error', reason: `intent JSON invalid: ${(e as Error).message}` };
  }
  const validated = validateIntent(intent);
  if (validated.kind === 'invalid') {
    return { kind: 'parse_error', reason: validated.reason };
  }
  return { kind: 'ok', briefMd: briefMatch[1]!.trim(), intent: validated.value };
}

/** Find the first balanced top-level { ... } in `text` and return its substring. */
function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
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
