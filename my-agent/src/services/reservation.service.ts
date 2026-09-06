// Business logic for reservations. The agent tools call THESE functions —
// never SQL, never fs directly. To move to PostgreSQL later, re-implement the
// same exported function signatures against `pg`/`drizzle` and leave tools untouched.
//
// Storage today: a small JSON file (good for local demo + LiveKit Cloud volume).
// Path: process.env.RESERVATION_STORE_PATH or <cwd>/data/reservations.json
// Tests override it via __setStorePathOverride().

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROOM_TYPES, type RoomType } from '../config/hotel.ts';

export type ReservationStatus = 'confirmed' | 'cancelled';

export interface Reservation {
  confirmationCode: string;
  guestName: string;
  phone: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD (exclusive)
  roomType: RoomType;
  guests: number;
  nights: number;
  totalPrice: number;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityQuery {
  checkIn: string;
  checkOut: string;
  guests: number;
  roomType?: RoomType;
}

export interface RoomAvailability {
  roomType: RoomType;
  label: string;
  available: boolean;
  roomsLeft: number;
  pricePerNight: number;
  totalPrice: number;
  reason?: string;
}

export interface AvailabilityResult {
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  rooms: RoomAvailability[];
}

export interface CreateReservationInput extends AvailabilityQuery {
  guestName: string;
  phone?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
let storePathOverride: string | null = null;

/** Test-only hook: point the store at a temp file. Pass null to restore default. */
export function __setStorePathOverride(path: string | null): void {
  storePathOverride = path;
}

/** Test-only hook: wipe the store file so tests start clean. */
export function __clearStore(): void {
  saveStore({ reservations: [] });
}

function storePath(): string {
  if (storePathOverride) return storePathOverride;
  if (process.env.RESERVATION_STORE_PATH) return process.env.RESERVATION_STORE_PATH;
  return join(process.cwd(), 'data', 'reservations.json');
}

function loadStore(): { reservations: Reservation[] } {
  const path = storePath();
  try {
    if (!existsSync(path)) return { reservations: [] };
    const raw = readFileSync(path, 'utf8');
    if (!raw.trim()) return { reservations: [] };
    const parsed = JSON.parse(raw) as { reservations?: Reservation[] };
    return { reservations: Array.isArray(parsed.reservations) ? parsed.reservations : [] };
  } catch {
    return { reservations: [] };
  }
}

function saveStore(store: { reservations: Reservation[] }): void {
  const path = storePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(store, null, 2), 'utf8');
}

export function parseDate(value: string): Date {
  if (!DATE_RE.test(value)) throw new Error(`Date must be YYYY-MM-DD, got "${value}".`);
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new Error(`"${value}" is not a real calendar date.`);
  }
  return dt;
}

export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Nights stayed: each YYYY-MM-DD the guest occupies a room (checkout excluded). */
export function eachNight(checkIn: string, checkOut: string): string[] {
  const start = parseDate(checkIn).getTime();
  const end = parseDate(checkOut).getTime();
  if (!(end > start)) throw new Error('Check-out must be after check-in.');
  const nights: string[] = [];
  for (let t = start; t < end; t += 86_400_000) {
    nights.push(new Date(t).toISOString().slice(0, 10));
  }
  if (nights.length > 60) throw new Error('Stays longer than 60 nights need the reservations desk.');
  return nights;
}

function activeOn(reservations: Reservation[], roomType: RoomType, night: string): number {
  let count = 0;
  for (const r of reservations) {
    if (r.status !== 'confirmed' || r.roomType !== roomType) continue;
    // night ∈ [checkIn, checkOut)
    if (r.checkIn <= night && night < r.checkOut) count += 1;
  }
  return count;
}

function validateQuery(q: AvailabilityQuery): { nights: string[] } {
  const nights = eachNight(q.checkIn, q.checkOut);
  if (!Number.isInteger(q.guests) || q.guests < 1 || q.guests > 6) {
    throw new Error('Guest count must be between 1 and 6.');
  }
  if (q.checkIn < todayUTC()) throw new Error('Check-in is in the past. Please pick upcoming dates.');
  return { nights };
}

export function checkAvailability(q: AvailabilityQuery): AvailabilityResult {
  const { nights } = validateQuery(q);
  const { reservations } = loadStore();
  const types: RoomType[] = q.roomType ? [q.roomType] : ['deluxe', 'suite', 'villa'];

  const rooms: RoomAvailability[] = types.map((roomType) => {
    const info = ROOM_TYPES[roomType];
    if (q.guests > info.maxGuests) {
      return {
        roomType,
        label: info.label,
        available: false,
        roomsLeft: 0,
        pricePerNight: info.pricePerNight,
        totalPrice: info.pricePerNight * nights.length,
        reason: `${info.label} sleeps at most ${info.maxGuests}.`,
      };
    }
    let minLeft = info.inventory;
    for (const night of nights) {
      const left = info.inventory - activeOn(reservations, roomType, night);
      if (left < minLeft) minLeft = left;
    }
    return {
      roomType,
      label: info.label,
      available: minLeft > 0,
      roomsLeft: Math.max(0, minLeft),
      pricePerNight: info.pricePerNight,
      totalPrice: info.pricePerNight * nights.length,
    };
  });

  return { checkIn: q.checkIn, checkOut: q.checkOut, nights: nights.length, guests: q.guests, rooms };
}

function newConfirmationCode(existing: Set<string>): string {
  for (let i = 0; i < 50; i++) {
    const code = `BOOK-${Math.floor(10000 + Math.random() * 90000)}`;
    if (!existing.has(code)) return code;
  }
  throw new Error('Could not generate a confirmation code. Please try again.');
}

export function createReservation(input: CreateReservationInput): Reservation {
  const name = input.guestName.trim();
  if (name.length < 2) throw new Error('I need the guest name to hold a reservation.');
  const result = checkAvailability(input);
  const room = result.rooms.find((r) => r.roomType === input.roomType);
  if (!room) throw new Error('Unknown room type.');
  if (!room.available) {
    const reason = room.reason ?? `No ${room.label} rooms left for those dates.`;
    throw new Error(`${reason} Try different dates or another room type.`);
  }
  const store = loadStore();
  const code = newConfirmationCode(new Set(store.reservations.map((r) => r.confirmationCode)));
  const now = new Date().toISOString();
  const reservation: Reservation = {
    confirmationCode: code,
    guestName: name,
    phone: (input.phone ?? '').trim(),
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    roomType: input.roomType ?? 'deluxe',
    guests: input.guests,
    nights: result.nights,
    totalPrice: room.totalPrice,
    status: 'confirmed',
    createdAt: now,
    updatedAt: now,
  };
  store.reservations.push(reservation);
  saveStore(store);
  return reservation;
}

export function getReservation(confirmationCode: string): Reservation {
  const code = confirmationCode.trim().toUpperCase();
  const found = loadStore().reservations.find((r) => r.confirmationCode === code);
  if (!found) throw new Error(`I could not find ${code}. Please check the confirmation number.`);
  return found;
}

export interface ModifyReservationInput {
  confirmationCode: string;
  newCheckIn?: string;
  newCheckOut?: string;
  newRoomType?: RoomType;
  newGuests?: number;
}

export function modifyReservation(input: ModifyReservationInput): Reservation {
  const store = loadStore();
  const code = input.confirmationCode.trim().toUpperCase();
  const idx = store.reservations.findIndex((r) => r.confirmationCode === code);
  const current = store.reservations[idx];
  if (!current || idx === -1) {
    throw new Error(`I could not find ${code}. Please check the confirmation number.`);
  }
  if (current.status === 'cancelled') throw new Error(`${code} is already cancelled. I can make a fresh booking instead.`);

  const next = {
    checkIn: input.newCheckIn ?? current.checkIn,
    checkOut: input.newCheckOut ?? current.checkOut,
    roomType: input.newRoomType ?? current.roomType,
    guests: input.newGuests ?? current.guests,
  };

  // Exclude self so rebooking the same nights always succeeds.
  const others = store.reservations.filter((r) => r.confirmationCode !== code);
  const nights = eachNight(next.checkIn, next.checkOut);
  if (next.checkIn < todayUTC()) throw new Error('The new check-in is in the past.');
  const info = ROOM_TYPES[next.roomType];
  if (next.guests > info.maxGuests) {
    throw new Error(`${info.label} sleeps at most ${info.maxGuests}.`);
  }
  for (const night of nights) {
    let count = 0;
    for (const r of others) {
      if (r.status !== 'confirmed' || r.roomType !== next.roomType) continue;
      if (r.checkIn <= night && night < r.checkOut) count += 1;
    }
    if (count >= info.inventory) {
      throw new Error(`No ${info.label} rooms left for the new dates. Try different dates or another room type.`);
    }
  }

  const updated: Reservation = {
    ...current,
    checkIn: next.checkIn,
    checkOut: next.checkOut,
    roomType: next.roomType,
    guests: next.guests,
    nights: nights.length,
    totalPrice: info.pricePerNight * nights.length,
    updatedAt: new Date().toISOString(),
  };
  store.reservations[idx] = updated;
  saveStore(store);
  return updated;
}

export function cancelReservation(confirmationCode: string): Reservation {
  const store = loadStore();
  const code = confirmationCode.trim().toUpperCase();
  const idx = store.reservations.findIndex((r) => r.confirmationCode === code);
  const current = store.reservations[idx];
  if (!current || idx === -1) {
    throw new Error(`I could not find ${code}. Please check the confirmation number.`);
  }
  if (current.status === 'cancelled') return current;
  const updated: Reservation = { ...current, status: 'cancelled', updatedAt: new Date().toISOString() };
  store.reservations[idx] = updated;
  saveStore(store);
  return updated;
}

/** One-line voice summary, e.g. "Deluxe Room, December 12th to 14th, 2 nights, 8,400 rupees." */
export function describeReservation(r: Reservation): string {
  const label = ROOM_TYPES[r.roomType].label;
  return `${label} from ${r.checkIn} to ${r.checkOut}, ${r.nights} nights for ${r.guests} guests. Total ${r.totalPrice.toLocaleString('en-IN')} rupees. Confirmation ${r.confirmationCode}.`;
}
