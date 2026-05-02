import type { PromptInputs } from './inputs.js';
import { SAGE_MENTOR_VOICE } from './voiceSpec.js';

export interface DeltaContext extends PromptInputs {
  anchorBriefMd: string;
  triggers: string[];
}

export interface DeltaMessages {
  system: string;
  user: string;
  assistantPrefill: string;
}

export function buildDeltaMessages(ctx: DeltaContext): DeltaMessages {
  const system = `${SAGE_MENTOR_VOICE}

You are writing a SHORT delta update (2-3 sentences max, under 50 words). The trader already read your morning anchor; this is what changed since.

Hard rules:
1. Output exactly: <delta>...</delta><intent>...</intent>. Nothing outside.
2. Max 50 words. Reference the anchor explicitly ("this morning I said X — here's the update").
3. End with at most one Socratic question, italicized. May omit if redundant.
4. Same intent JSON schema as the anchor: {"greenlit":[...],"skip":[...],"watch":[...],"hero_symbol":...}
5. Never invent numbers. Never use "financial advice" / "guaranteed".
`;

  const userPayload = {
    anchor_brief_md: ctx.anchorBriefMd,
    triggers: ctx.triggers,
    bias: ctx.bias,
    userStats: ctx.userStats,
    user: { name: ctx.user.name, watchlist: ctx.user.watchlist },
  };

  return {
    system,
    user: JSON.stringify(userPayload, null, 2),
    assistantPrefill: `<delta>\n`,
  };
}
