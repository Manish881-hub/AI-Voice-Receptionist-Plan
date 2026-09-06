// Offline unit tests for the reservation engine — no LiveKit credentials needed.
// Run: npx vitest run src/services/reservation.service.test.ts
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  __clearStore,
  __setStorePathOverride,
  cancelReservation,
  checkAvailability,
  createReservation,
  getReservation,
  modifyReservation,
} from './reservation.service.ts';

const FUTURE_IN = '2099-03-14';
const FUTURE_OUT = '2099-03-16';

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), 'tattvam-'));
  __setStorePathOverride(join(dir, 'reservations.json'));
  __clearStore();
});

describe('reservation.service', () => {
  it('reports availability on empty inventory', () => {
    const r = checkAvailability({ checkIn: FUTURE_IN, checkOut: FUTURE_OUT, guests: 2 });
    expect(r.nights).toBe(2);
    expect(r.rooms.find((x) => x.roomType === 'deluxe')?.available).toBe(true);
  });

  it('rejects guests over room capacity', () => {
    const r = checkAvailability({
      checkIn: FUTURE_IN,
      checkOut: FUTURE_OUT,
      guests: 4,
      roomType: 'villa',
    });
    expect(r.rooms[0]?.available).toBe(false);
  });

  it('books then fills a room type to sold out', () => {
    // Villa has 3 rooms: book all 3 for the same nights, 4th must fail availability
    for (let i = 0; i < 3; i++) {
      createReservation({
        checkIn: FUTURE_IN,
        checkOut: FUTURE_OUT,
        guests: 2,
        roomType: 'villa',
        guestName: `Guest ${i}`,
      });
    }
    const r = checkAvailability({
      checkIn: FUTURE_IN,
      checkOut: FUTURE_OUT,
      guests: 2,
      roomType: 'villa',
    });
    expect(r.rooms[0]?.available).toBe(false);
    expect(() =>
      createReservation({
        checkIn: FUTURE_IN,
        checkOut: FUTURE_OUT,
        guests: 2,
        roomType: 'villa',
        guestName: 'Late Guest',
      }),
    ).toThrow();
  });

  it('full demo flow: check -> book -> read back -> modify -> cancel', () => {
    const avail = checkAvailability({
      checkIn: FUTURE_IN,
      checkOut: FUTURE_OUT,
      guests: 2,
      roomType: 'deluxe',
    });
    expect(avail.rooms[0]?.available).toBe(true);

    const booked = createReservation({
      checkIn: FUTURE_IN,
      checkOut: FUTURE_OUT,
      guests: 2,
      roomType: 'deluxe',
      guestName: 'Asha Sharma',
      phone: '+919800000001',
    });
    expect(booked.confirmationCode).toMatch(/^BOOK-\d{5}$/);
    expect(booked.totalPrice).toBe(4200 * 2);

    expect(getReservation(booked.confirmationCode).guestName).toBe('Asha Sharma');

    const moved = modifyReservation({
      confirmationCode: booked.confirmationCode,
      newCheckOut: '2099-03-17',
    });
    expect(moved.nights).toBe(3);

    const cancelled = cancelReservation(booked.confirmationCode);
    expect(cancelled.status).toBe('cancelled');

    // After cancel, the inventory is free again
    const again = checkAvailability({
      checkIn: FUTURE_IN,
      checkOut: FUTURE_OUT,
      guests: 2,
      roomType: 'deluxe',
    });
    expect(again.rooms[0]?.available).toBe(true);
  });

  it('rejects bad dates', () => {
    expect(() =>
      checkAvailability({ checkIn: FUTURE_OUT, checkOut: FUTURE_IN, guests: 2 }),
    ).toThrow();
    expect(() =>
      checkAvailability({ checkIn: '2020-01-01', checkOut: '2020-01-03', guests: 2 }),
    ).toThrow();
  });
});
