// Central hotel data. Single source of truth for tools, prompts, and (later) the API.
// Keep business facts OUT of agent.ts — edit them here.

export type RoomType = 'deluxe' | 'suite' | 'villa';
export type PackageType = 'day_out' | 'stay' | 'ayurveda' | 'celebration';

export const HOTEL = {
  name: 'Tattvam in The Hills Retreat & Spa',
  shortName: 'Tattvam',
  location:
    'Sy. no 103/104/105, Gunjur Village, Tubegere Hobli, Doddaballapura Taluk, Bangalore Rural - 561 203',
  landmark: '40 minutes from Bangalore International Airport, near Doddaballapur',
  property:
    '4.5 acres of lush greenery with 20 guest rooms, an Authentic Ayurvedic Center, and a swimming pool',
  cuisine: '100 percent pure vegetarian. Indian, Tandoor, Pan-Asian, and International dishes',
  contactPhone: '+91 80500 53808',
} as const;

export interface RoomTypeInfo {
  label: string;
  inventory: number;
  maxGuests: number;
  pricePerNight: number;
  description: string;
}

export const ROOM_TYPES: Record<RoomType, RoomTypeInfo> = {
  deluxe: {
    label: 'Deluxe Room',
    inventory: 12,
    maxGuests: 3,
    pricePerNight: 4200,
    description: 'Luxury room with breakfast, pool access, and complimentary yoga session',
  },
  suite: {
    label: 'Suite',
    inventory: 5,
    maxGuests: 4,
    pricePerNight: 7500,
    description: 'Spacious suite with premium view, breakfast, and pool access',
  },
  villa: {
    label: 'Ayurveda Villa',
    inventory: 3,
    maxGuests: 2,
    pricePerNight: 5500,
    description: 'Quiet villa near the Ayurvedic Center, ideal for wellness stays',
  },
};

export const ROOM_TYPE_IDS: RoomType[] = ['deluxe', 'suite', 'villa'];

export interface PackageInfo {
  name: string;
  price: string;
  includes: string;
}

export const PACKAGES: Record<PackageType, PackageInfo> = {
  day_out: {
    name: 'Day Outing Package',
    price: '1,499 rupees per person',
    includes: 'Pool access, lunch, indoor and outdoor activities, and nature trails',
  },
  stay: {
    name: 'Stay Package',
    price: '4,200 rupees per night',
    includes: 'Luxury room, breakfast, pool access, and complimentary yoga session',
  },
  ayurveda: {
    name: 'Ayurveda Wellness Package',
    price: '10,999 rupees for 3 nights',
    includes: 'Full-board meals, daily Ayurvedic therapies, doctor consultation, and accommodation',
  },
  celebration: {
    name: 'Celebration Packages',
    price: 'Custom quotes available',
    includes: 'Candle-night dinners, anniversary and birthday setups, family get-together arrangements',
  },
};
