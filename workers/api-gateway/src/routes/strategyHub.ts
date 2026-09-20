import { Hono } from "hono";
import {
  STRATEGIES,
  STRATEGY_VERSION,
  RULES,
  MARKET_ADAPTATION,
  type ApiResponse,
} from "@edgerelay/shared";
import type { Env } from "../types.js";
export const strategyHub = new Hono<{ Bindings: Env }>();
export const strategyHubPublic = new Hono<{ Bindings: Env }>();
strategyHubPublic.get("/strategies", (c) =>
  c.json({
    data: {
      version: STRATEGY_VERSION,
      strategies: STRATEGIES,
      rules: RULES,
      marketAdaptation: MARKET_ADAPTATION,
    },
    error: null,
  }),
);
strategyHubPublic.get("/strategies/:slug", (c) => {
  const strategy = STRATEGIES.find((s) => s.id === c.req.param("slug"));
  return strategy
    ? c.json({
        data: { ...strategy, version: STRATEGY_VERSION, rules: RULES },
        error: null,
      })
    : c.json(
        {
          data: null,
          error: { code: "NOT_FOUND", message: "Strategy not found" },
        },
        404,
      );
});
// Preserve historical purchases and generations, but never sell or generate unvalidated rule variants.
strategyHub.get("/generation-status", (c) =>
  c.json({
    data: {
      enabled: false,
      version: STRATEGY_VERSION,
      reason: "Fixed practice playbooks replace automatic EA generation.",
    },
    error: null,
  }),
);
for (const path of ["/generate", "generate-custom", "optimize", "purchase"])
  strategyHub.post(path, (c) =>
    c.json(
      {
        data: null,
        error: {
          code: "FIXED_PLAYBOOK",
          message:
            "Use the versioned Three Strategies playbooks. Automated EA generation and strategy purchases are retired; no payment or order was created.",
        },
      },
      410,
    ),
  );
strategyHub.get("/my-generations", async (c) => {
  const userId = c.get("userId");

  const { results } = await c.env.DB.prepare(
    `SELECT eg.id, eg.strategy_id, eg.parameters_json, eg.generated_at,
            st.name as strategy_name, st.slug as strategy_slug, st.category
     FROM ea_generations eg
     JOIN strategy_templates st ON st.id = eg.strategy_id
     WHERE eg.user_id = ?
     ORDER BY eg.generated_at DESC
     LIMIT 50`,
  )
    .bind(userId)
    .all();

  return c.json<ApiResponse>({ data: results ?? [], error: null });
});
