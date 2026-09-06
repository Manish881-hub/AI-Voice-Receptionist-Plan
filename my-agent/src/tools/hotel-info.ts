import { dedent, llm } from '@livekit/agents';
import { z } from 'zod';
import { PACKAGES } from '../config/hotel.ts';

// Static package info. Availability/booking live in availability.ts + booking.ts.
export const getPackageDetails = llm.tool({
  description: dedent`
    Use this when the guest asks about pricing, inclusions, or general information
    about Tattvam packages: Day Outing, Stay, Ayurveda, or Celebrations.
    Returns a short spoken summary.
  `,
  parameters: z.object({
    packageType: z.enum(['day_out', 'stay', 'ayurveda', 'celebration']).describe(
      'Which package: day_out, stay, ayurveda, or celebration',
    ),
  }),
  execute: async ({ packageType }) => {
    const pkg = PACKAGES[packageType];
    if (!pkg) {
      return 'I could not find that package. Please ask about day outing, stay, Ayurveda, or celebrations.';
    }
    return `The ${pkg.name} starts at ${pkg.price} and includes ${pkg.includes}. Would you like me to check room availability for your dates?`;
  },
});
