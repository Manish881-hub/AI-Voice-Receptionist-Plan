// Offline unit tests for the offers service — no LiveKit credentials needed.
// Run: pnpm exec vitest run src/services/offers.service.test.ts
import { describe, expect, it } from 'vitest';
import type { OfferInfo } from '../config/hotel.ts';
import { formatOffers, getCurrentOffers } from './offers.service.ts';

const SAMPLE: OfferInfo = {
  id: 'monsoon-2026',
  title: 'Monsoon Wellness Offer',
  deal: '10 percent off Ayurveda packages',
  details: 'Valid for stays in July and August, booked 2 weeks ahead.',
};

describe('offers.service seam', () => {
  it('says plainly when no offers run', () => {
    expect(formatOffers([])).toBe('There are no special offers running right now.');
  });

  it('quotes each offer without adding claims', () => {
    const out = formatOffers([SAMPLE]);
    expect(out).toContain('Monsoon Wellness Offer');
    expect(out).toContain('10 percent off Ayurveda packages');
    expect(out).toContain('July and August');
    expect(out).not.toContain('seasonal');
  });

  it('reads the live config without inventing entries', () => {
    const offers = getCurrentOffers();
    expect(Array.isArray(offers)).toBe(true);
    for (const o of offers) {
      expect(o.id.length).toBeGreaterThan(0);
      expect(o.title.length).toBeGreaterThan(0);
      expect(o.deal.length).toBeGreaterThan(0);
    }
  });
});
