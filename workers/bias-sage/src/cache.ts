import type { Env } from './types.js';

export function dayKey(unix: number): string {
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

export const ANCHOR_KV_TTL = 36 * 60 * 60; // seconds

export interface CachedAnchor {
  briefMd: string;
  intentJson: string;
  level: 'L1' | 'L2';
  generatedAt: number;
}

export async function getAnchor(
  env: Pick<Env, 'BIAS_SAGE'>,
  userId: string,
  day: string,
): Promise<CachedAnchor | null> {
  const raw = await env.BIAS_SAGE.get(`anchor:v2:${userId}:${day}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedAnchor;
  } catch {
    return null;
  }
}

export async function putAnchor(
  env: Pick<Env, 'BIAS_SAGE'>,
  userId: string,
  day: string,
  value: CachedAnchor,
): Promise<void> {
  await env.BIAS_SAGE.put(`anchor:v2:${userId}:${day}`, JSON.stringify(value), {
    expirationTtl: ANCHOR_KV_TTL,
  });
}
