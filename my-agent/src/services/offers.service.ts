// Offer lookup. Tools call THESE functions — never invent discounts.
// Source of truth is OFFERS in config/hotel.ts; empty means no offers running.
import { OFFERS, type OfferInfo } from '../config/hotel.ts';

export function getCurrentOffers(): OfferInfo[] {
  return [...OFFERS];
}

/** One voice-safe line per offer, or a plain "none" sentence. No added claims. */
export function formatOffers(offers: OfferInfo[]): string {
  if (offers.length === 0) {
    return 'There are no special offers running right now.';
  }
  return offers
    .map((o) => `${o.title}: ${o.deal}.${o.details ? ` ${o.details}` : ''}`)
    .join(' ');
}
