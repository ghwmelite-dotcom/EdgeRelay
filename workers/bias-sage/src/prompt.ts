import type { PromptInputs } from './inputs.js';
import { SAGE_MENTOR_VOICE, SAGE_HARD_RULES } from './voiceSpec.js';

export interface AnchorMessages {
  system: string;
  user: string;
}

export function buildAnchorMessages(inputs: PromptInputs): AnchorMessages {
  const startInstruction = `\n\nBegin your response with the literal text "<brief>" on its own line, then "Morning, ${inputs.user.name}." as the opening sentence. End with "</intent>" with nothing after.`;
  const system = `${SAGE_MENTOR_VOICE}\n\n${SAGE_HARD_RULES}${startInstruction}`;

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
  };
}
