import { dedent, llm } from '@livekit/agents';
import { z } from 'zod';
import {
  cancelReservation as cancelSvc,
  createReservation as createSvc,
  describeReservation,
  modifyReservation as modifySvc,
} from '../services/reservation.service.ts';

const dateField = (label: string): z.ZodString =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be YYYY-MM-DD`)
    .describe(`${label} in YYYY-MM-DD format`);

const roomTypeField = z.enum(['deluxe', 'suite', 'villa']).describe('deluxe, suite, or villa');

export const createReservation = llm.tool({
  description: dedent`
    Book a room AFTER the guest explicitly confirms dates, room type, guest count,
    and name. Returns the confirmation code — read it back slowly, digit by digit.
  `,
  parameters: z.object({
    checkIn: dateField('Check-in date'),
    checkOut: dateField('Check-out date'),
    roomType: roomTypeField,
    guests: z.number().int().min(1).max(6).describe('Number of guests'),
    guestName: z.string().min(2).describe('Full name for the reservation'),
    phone: z.string().optional().describe('Callback number, if the guest gives one'),
  }),
  execute: async ({ checkIn, checkOut, roomType, guests, guestName, phone }) => {
    try {
      const r = phone
        ? createSvc({ checkIn, checkOut, roomType, guests, guestName, phone })
        : createSvc({ checkIn, checkOut, roomType, guests, guestName });
      return (
        `Booked! ${describeReservation(r)} ` +
        `Tell the guest: "You are all set, ${r.guestName}." Then read the confirmation code slowly.`
      );
    } catch (err) {
      return `Booking failed: ${err instanceof Error ? err.message : 'unknown error'}. Offer different dates or room types.`;
    }
  },
});

export const modifyReservation = llm.tool({
  description: dedent`
    Change dates, room type, or guest count on an existing reservation.
    Needs the confirmation code (BOOK dash 5 digits).
  `,
  parameters: z.object({
    confirmationCode: z.string().describe('Confirmation code, e.g. BOOK-28471'),
    newCheckIn: dateField('New check-in date').optional(),
    newCheckOut: dateField('New check-out date').optional(),
    newRoomType: z.enum(['deluxe', 'suite', 'villa']).optional().describe('New room type, if changing'),
    newGuests: z.number().int().min(1).max(6).optional().describe('New guest count, if changing'),
  }),
  execute: async ({ confirmationCode, newCheckIn, newCheckOut, newRoomType, newGuests }) => {
    try {
      const input: {
        confirmationCode: string;
        newCheckIn?: string;
        newCheckOut?: string;
        newRoomType?: 'deluxe' | 'suite' | 'villa';
        newGuests?: number;
      } = { confirmationCode };
      if (newCheckIn) input.newCheckIn = newCheckIn;
      if (newCheckOut) input.newCheckOut = newCheckOut;
      if (newRoomType) input.newRoomType = newRoomType;
      if (newGuests !== undefined) input.newGuests = newGuests;
      const r = modifySvc(input);
      return `Updated! ${describeReservation(r)} Read back the new details to confirm.`;
    } catch (err) {
      return `Could not modify the booking: ${err instanceof Error ? err.message : 'unknown error'}.`;
    }
  },
});

export const cancelReservation = llm.tool({
  description: dedent`
    Cancel a reservation. Needs the confirmation code. Confirm with the guest first.
  `,
  parameters: z.object({
    confirmationCode: z.string().describe('Confirmation code, e.g. BOOK-28471'),
  }),
  execute: async ({ confirmationCode }) => {
    try {
      const r = cancelSvc(confirmationCode);
      return `${r.confirmationCode} is now cancelled. The ${r.roomType} room for ${r.checkIn} is released. Offer to make a fresh booking if they want different dates.`;
    } catch (err) {
      return `Could not cancel: ${err instanceof Error ? err.message : 'unknown error'}. Ask them to repeat the confirmation code.`;
    }
  },
});
