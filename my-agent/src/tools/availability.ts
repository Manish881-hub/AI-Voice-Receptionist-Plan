import { dedent, llm } from '@livekit/agents';
import { z } from 'zod';
import { checkAvailability } from '../services/reservation.service.ts';

const dateField = (label: string): z.ZodString =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be YYYY-MM-DD`)
    .describe(`${label} in YYYY-MM-DD format. Resolve relative dates like "Saturday" yourself first.`);

export const checkRoomAvailability = llm.tool({
  description: dedent`
    Check live room inventory for Tattvam. Call this BEFORE saying any room is
    available. Returns per-room-type availability, rooms left, and price estimate.
  `,
  parameters: z.object({
    checkIn: dateField('Check-in date'),
    checkOut: dateField('Check-out date'),
    guests: z.number().int().min(1).max(6).default(2).describe('Number of guests'),
    roomType: z
      .enum(['deluxe', 'suite', 'villa'])
      .optional()
      .describe('If the guest named a room type, check just that one. Otherwise omit to check all.'),
  }),
  execute: async ({ checkIn, checkOut, guests, roomType }) => {
    try {
      const result = checkAvailability(
        roomType ? { checkIn, checkOut, guests, roomType } : { checkIn, checkOut, guests },
      );
      const lines = result.rooms.map((r) => {
        if (r.available) {
          return `${r.label}: AVAILABLE, ${r.roomsLeft} left, ${r.totalPrice.toLocaleString('en-IN')} rupees total for ${result.nights} nights.`;
        }
        return `${r.label}: NOT available. ${r.reason ?? 'Sold out for those dates.'}`;
      });
      return (
        `Availability ${result.checkIn} to ${result.checkOut} (${result.nights} nights, ${result.guests} guests). ` +
        lines.join(' ') +
        ' Ask the guest if they want to book one of the available options.'
      );
    } catch (err) {
      return `I could not check availability: ${err instanceof Error ? err.message : 'unknown error'}. Ask the guest to confirm their dates.`;
    }
  },
});
