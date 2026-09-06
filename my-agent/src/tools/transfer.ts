import { dedent, llm } from '@livekit/agents';
import { z } from 'zod';
import { HOTEL } from '../config/hotel.ts';

// Voice-level handoff. Today: gives the desk number so the caller can be
// transferred or called back. When SIP transfer is wired (Plivo -> LiveKit SIP
// trunk), replace the execute body with a real SIP refer/transfer call.
export const requestHumanHandoff = llm.tool({
  description: dedent`
    Use when the caller asks for a human, is upset, or has an urgent/complex
    request the agent cannot complete. Returns what to tell the caller.
  `,
  parameters: z.object({
    reason: z.string().optional().describe('Short reason for the handoff, for logging'),
  }),
  execute: async ({ reason }) => {
    if (reason) console.log(`[handoff] requested: ${reason}`);
    return (
      `Tell the caller warmly: "Of course, let me connect you to our reservations team. ` +
      `Please call us directly at ${HOTEL.contactPhone}, or hold while I arrange a callback." ` +
      `Do not invent a transfer — give the number clearly.`
    );
  },
});
