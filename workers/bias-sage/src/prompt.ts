import type { PromptInputs } from './inputs.js';
import { SAGE_MENTOR_VOICE, SAGE_HARD_RULES } from './voiceSpec.js';

export interface AnchorMessages {
  system: string;
  user: string;
  assistantPrefill: string;
}

export function buildAnchorMessages(inputs: PromptInputs): AnchorMessages {
  const system = `${SAGE_MENTOR_VOICE}\n\n${SAGE_HARD_RULES}`;

  const userPayload = {
    level: inputs.level,
    user: {
      name: inputs.user.name,
      timezone: inputs.user.timezone,
      watchlist: inputs.user.watchlist,
    },
    userStats: inputs.userStats,
    bias: inputs.bias,
    yesterdayAccuracy: inputs.yesterdayAccuracy,
    priorAnchorMd: inputs.priorAnchorMd,
  };

  return {
    system,
    user: JSON.stringify(userPayload, null, 2),
    assistantPrefill: `<brief>\nMorning, ${inputs.user.name}.`,
  };
}
