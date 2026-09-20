import { bodyLimit } from "hono/body-limit";
import { Hono } from "hono";

import { strategyReviewSchema, STRATEGY_VERSION } from "@edgerelay/shared";
import type { Env } from "../types.js";
export const strategyReviews = new Hono<{ Bindings: Env }>();

strategyReviews.use("*", bodyLimit({ maxSize: 12000 }));
strategyReviews.get("/", async (c) => {
  const account = c.req.query("accountId"),
    ticket = c.req.query("dealTicket");
  const rows =
    account && ticket
      ? await c.env.DB.prepare(
          "SELECT * FROM strategy_reviews WHERE user_id = ? AND version = ? AND account_id = ? AND deal_ticket = ? ORDER BY created_at DESC, id DESC LIMIT 50",
        )
          .bind(c.get("userId"), STRATEGY_VERSION, account, ticket)
          .all()
      : await c.env.DB.prepare(
          "SELECT * FROM strategy_reviews WHERE user_id = ? AND version = ? ORDER BY created_at DESC, id DESC LIMIT 50",
        )
          .bind(c.get("userId"), STRATEGY_VERSION)
          .all();
  return c.json({
    data: { reviews: rows.results, verification: "self-reported" },
    error: null,
  });
});
strategyReviews.post("/", async (c) => {
  const parsed = strategyReviewSchema.safeParse(
    await c.req.json().catch(() => null),
  );
  if (!parsed.success)
    return c.json(
      {
        data: null,
        error: {
          code: "BAD_REQUEST",
          message:
            "Provide a valid current strategy review, date, provider, instrument and notes.",
        },
      },
      400,
    );
  const b = parsed.data,
    user = c.get("userId");
  if (b.accountId) {
    const trade = await c.env.DB.prepare(
      "SELECT jt.deal_ticket, jt.symbol FROM journal_trades jt JOIN accounts a ON jt.account_id = a.id WHERE a.user_id = ? AND a.id = ? AND jt.deal_ticket = ?",
    )
      .bind(user, b.accountId, b.dealTicket!)
      .first<{ deal_ticket: number; symbol: string }>();
    if (!trade)
      return c.json(
        {
          data: null,
          error: { code: "NOT_FOUND", message: "Owned trade not found" },
        },
        404,
      );
    if (trade.symbol !== b.symbol)
      return c.json(
        {
          data: null,
          error: {
            code: "BAD_REQUEST",
            message: "Review symbol must match the linked trade",
          },
        },
        400,
      );
  }
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    "INSERT INTO strategy_reviews (id,user_id,version,strategy_id,session_date,symbol,provider,outcome,session_json,checks_json,notes,account_id,deal_ticket) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
  )
    .bind(
      id,
      user,
      b.version,
      b.strategyId,
      b.sessionDate,
      b.symbol,
      b.provider,
      b.outcome,
      JSON.stringify(b.session),
      JSON.stringify([...new Set(b.checks)]),
      b.notes,
      b.accountId ?? null,
      b.dealTicket ?? null,
    )
    .run();
  return c.json(
    { data: { id, verification: "self-reported" }, error: null },
    201,
  );
});
