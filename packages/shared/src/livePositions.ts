import { z } from 'zod';

export const LIVE_POSITION_STALE_MS = 45_000;
const finite = z.number().finite();
export const PositionSnapshot = z.object({
  version: z.literal(1),
  account_id: z.string().min(1).max(100),
  captured_at: z.number().int().positive(), // UTC seconds, not MT5 broker time
  currency: z.string().min(1).max(12).regex(/^[A-Za-z0-9]+$/),
  balance: finite,
  equity: finite,
  floating_profit: finite, // MT5 ACCOUNT_PROFIT; do not add swaps again
  positions: z.array(z.object({
    ticket: z.string().regex(/^\d+$/).max(24),
    position_id: z.string().regex(/^\d+$/).max(24),
    symbol: z.string().min(1).max(64),
    direction: z.enum(['buy', 'sell']),
    volume: finite.positive(),
    price_open: finite,
    price_current: finite,
    sl: finite,
    tp: finite,
    profit: finite,
    swap: finite,
  }).strict()).max(200),
}).strict().refine((snapshot) => new Set(snapshot.positions.map((position) => position.ticket)).size === snapshot.positions.length, 'Duplicate position ticket');
export type PositionSnapshot = z.infer<typeof PositionSnapshot>;
export interface LivePositionsResponse {
  snapshot: PositionSnapshot | null;
  received_at: number | null;
  stale: boolean;
}
