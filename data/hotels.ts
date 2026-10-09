import type { Hotel } from '../lib/rooms';

/** Built-in list shown when the database is not configured or unreachable. */
export const fallbackHotels: Hotel[] = [
  { slug: 'aluva', name: 'Aura Suites Aluva', city: 'Aluva', state: 'Kerala', tagline: 'Make Aluva your base for your next visit to Kochi.' },
  { slug: 'cheranallur', name: 'Aura Suites Cheranallur', city: 'Cheranallur', state: 'Kerala', tagline: 'A place to pause, with Cheranallur as your starting point.' },
  { slug: 'kalamassery', name: 'Aura Suites Kalamassery', city: 'Kalamassery', state: 'Kerala', tagline: 'Stay in Kalamassery and keep your visit centred around you.' },
].map((h) => ({ ...h, description: '', phone: '9995588780', lat: null, lng: null, image: null, images: [], amenities: [], sort_order: 0, rooms: [] }));

export const CONTACT = { phone: '9995588780', phoneDisplay: '+91 99955 88780', email: 'booking@theaurasuites.in' };
