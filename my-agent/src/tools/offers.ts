import { dedent, llm } from '@livekit/agents';
import { z } from 'zod';
import { formatOffers, getCurrentOffers as fetchOffers } from '../services/offers.service.ts';

// Grounds all coupon/discount/offer answers. Execute returns the full truth —
// the agent quotes it verbatim and must NOT add seasonal/future offers.
export const getCurrentOffers = llm.tool({
  description: dedent`
    Get the currently running offers, coupons, or discounts at Tattvam. Call
    this BEFORE saying anything about offers. Quote ONLY what it returns —
    if it says no offers are running, say exactly that.
  `,
  parameters: z.object({}),
  execute: async () => {
    return formatOffers(fetchOffers());
  },
});
