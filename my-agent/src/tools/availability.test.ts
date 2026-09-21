// Offline unit tests for the availability tool args — no LiveKit credentials needed.
// Regression: the 2026-09-21 live call sent explicit `roomType: null` and the
// framework rejected it (invalid_type), wasting a full LLM+TTS cycle (9.1s TTFA).
// Run: pnpm exec vitest run src/tools/availability.test.ts
import { describe, expect, it } from 'vitest';
import { checkAvailabilityParams } from './availability.ts';

const BASE = {
  checkIn: '2026-09-25',
  checkOut: '2026-09-30',
  guests: 2,
} as const;

describe('checkAvailabilityParams seam', () => {
  it('accepts the live-call payload with explicit null roomType', () => {
    const parsed = checkAvailabilityParams.safeParse({ ...BASE, roomType: null });
    expect(parsed.success).toBe(true);
  });

  it('accepts an omitted roomType (check all rooms)', () => {
    const parsed = checkAvailabilityParams.safeParse({ ...BASE });
    expect(parsed.success).toBe(true);
  });

  it('still rejects unknown room type strings', () => {
    const parsed = checkAvailabilityParams.safeParse({ ...BASE, roomType: 'penthouse' });
    expect(parsed.success).toBe(false);
  });
});
