import { describe, it, expect } from 'vitest';
import { app } from '../src/index.js';

describe('bias-sage worker', () => {
  it('serves /health', async () => {
    const res = await app.fetch(new Request('http://x/health'));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; worker: string };
    expect(json.ok).toBe(true);
    expect(json.worker).toBe('bias-sage');
  });
});
