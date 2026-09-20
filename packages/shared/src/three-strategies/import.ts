import { z } from "zod";
import {
  STRATEGY_VERSION,
  isStrategyId,
  validSession,
  validCandles,
  type ReplayInput,
} from "./index.js";
const number = z.number().finite();
const candle = z
  .object({
    time: number,
    open: number,
    high: number,
    low: number,
    close: number,
  })
  .strict();
const contract = z
  .object({
    tickSize: number,
    lossTickValue: number,
    volumeMin: number,
    volumeStep: number,
    volumeMax: number,
    costsPerLot: number,
    minStopDistance: number,
    marginPerLot: number,
    freeMargin: number,
    verified: z.boolean(),
    linear: z.boolean(),
  })
  .strict();
const session = z
  .object({
    open: number,
    close: number,
    cutoff: number,
    preStart: number.optional(),
    verified: z.boolean(),
    kind: z.enum(["venue-open", "daily-reference"]),
    label: z.string().min(1).max(120),
    source: z.string().min(1).max(500),
  })
  .strict();
const schema = z
  .object({
    strategy: z.string().refine(isStrategyId),
    date: z.string(),
    session,
    asOf: number,
    m1: z.array(candle).min(1).max(20000),
    m15: z.array(candle).min(1).max(2000),
    provider: z.string().min(1).max(120),
    symbol: z.string().min(1).max(40),
    calendarVerified: z.boolean(),
    normalSession: z.boolean(),
    newsVerified: z.boolean(),
    relevantNews: z.array(number).max(1000),
    previousDay: z
      .object({
        high: number,
        low: number,
        complete: z.boolean(),
        stub: z.boolean(),
        cutoff: z.string().max(120),
      })
      .strict()
      .optional(),
    entriesToday: number,
    dailyLossPercent: number,
    openPositions: number,
    equity: number,
    riskPercent: number,
    contract,
    obstacles: z.array(number).max(500),
  })
  .strict();
export function parseReplay(value: unknown): ReplayInput {
  const data = schema.parse(value);
  if (
    !validSession(data.session) ||
    !validCandles(data.m1, 60) ||
    !validCandles(data.m15, 900)
  )
    throw new Error(
      "Verified session and sorted complete ordinary candles required.",
    );
  return data as ReplayInput;
}

export const strategyReviewSchema = z
  .object({
    version: z.literal(STRATEGY_VERSION),
    strategyId: z.string().refine(isStrategyId),
    sessionDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(
        (d) =>
          !Number.isNaN(Date.parse(d)) &&
          new Date(d).toISOString().slice(0, 10) === d,
      ),
    symbol: z.string().trim().min(1).max(40),
    provider: z.string().trim().min(1).max(120),
    outcome: z.enum(["preparation", "skip", "review"]),
    session: session.refine(validSession),
    checks: z.array(z.string().max(140)).max(12),
    notes: z.string().trim().min(1).max(4000),
    accountId: z.string().max(80).optional(),
    dealTicket: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .optional(),
  })
  .strict()
  .refine((b) => !!b.accountId === (b.dealTicket !== undefined))
  .refine(
    (b) =>
      new Date(b.session.open * 1000).toISOString().slice(0, 10) ===
      b.sessionDate,
  );
