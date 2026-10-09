export type RoomRow = { id: number; name: string; base_rate: number; max_guests: number; beds: number; baths: number; images: string[]; description: string; total_rooms?: number };
export type Hotel = {
  slug: string; name: string; city: string; state: string; tagline: string; description: string; phone: string;
  lat: number | null; lng: number | null; image: string | null; images: string[]; amenities: string[]; sort_order: number; rooms: RoomRow[];
};
export type RoomGroup = {
  slug: string; name: string; minRate: number; images: string[]; description: string; maxGuests: number; beds: number; baths: number;
  offers: { hotel_slug: string; hotel_name: string; city: string; rate: number; room_id: number }[];
};

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** One group per room name across all hotels, cheapest first. */
export function groupRooms(hotels: Hotel[]): RoomGroup[] {
  const map = new Map<string, RoomGroup>();
  for (const h of hotels) {
    for (const r of h.rooms) {
      const slug = slugify(r.name);
      if (!slug) continue;
      let g = map.get(slug);
      if (!g) {
        g = { slug, name: r.name, minRate: r.base_rate, images: [], description: '', maxGuests: r.max_guests, beds: r.beds, baths: r.baths, offers: [] };
        map.set(slug, g);
      }
      g.minRate = Math.min(g.minRate, r.base_rate);
      g.maxGuests = Math.max(g.maxGuests, r.max_guests);
      if (!g.description && r.description) g.description = r.description;
      for (const img of r.images) if (g.images.length < 8 && !g.images.includes(img)) g.images.push(img);
      g.offers.push({ hotel_slug: h.slug, hotel_name: h.name, city: h.city, rate: r.base_rate, room_id: r.id });
    }
  }
  const out = [...map.values()];
  for (const g of out) g.offers.sort((a, b) => a.rate - b.rate);
  return out.sort((a, b) => a.minRate - b.minRate || a.name.localeCompare(b.name));
}
